"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, MousePointer, Sparkles } from "lucide-react";
import { Product } from "@/types";
import { SHOWROOM_ITEMS, DOCK_TARGETS, ShowroomZone, mergeWithRealProducts, ShowroomItemConfig } from "./showroom-data";
import ProductDetailOverlay from "./ProductDetailOverlay";
import NavigationDock from "./NavigationDock";
import ShowroomControlsHelp from "./ShowroomControlsHelp";
import { translations } from "@/lib/translations";

interface ShowroomCanvasProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

/**
 * Yuqori unumdorlikka ega (512x256) yorqin eman (Blonde Oak) yog'och teksturasi
 */
function createOakWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, "#D9A86E");
    grad.addColorStop(0.25, "#E2B883");
    grad.addColorStop(0.5, "#D49F62");
    grad.addColorStop(0.75, "#E5BC87");
    grad.addColorStop(1.0, "#DCB079");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    for (let y = 0; y < 256; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        let curY = y;
        const alpha = 0.08 + Math.random() * 0.1;
        ctx.strokeStyle = Math.random() > 0.4 ? `rgba(160, 110, 52, ${alpha})` : `rgba(240, 205, 155, ${alpha * 0.8})`;
        ctx.lineWidth = 1.2;

        for (let x = 0; x <= 512; x += 32) {
            curY += (Math.random() - 0.5) * 1.6;
            ctx.lineTo(x, curY);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Yuqori unumdorlikka ega (512x512) Pietra Serena tosh pol teksturasi
 */
function createStoneFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = "#EAE7E0";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 2;
        const a = Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(175, 170, 162, ${a})` : `rgba(255, 255, 255, ${a * 1.2})`;
        ctx.fillRect(x, y, s, s);
    }

    ctx.strokeStyle = "rgba(185, 180, 172, 0.45)";
    ctx.lineWidth = 1.5;
    for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        const rowOffset = (y / 64) % 2 === 0 ? 0 : 64;
        for (let x = rowOffset; x <= 512; x += 128) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 64);
            ctx.stroke();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    tex.generateMipmaps = true;
    return tex;
}

export default function ShowroomCanvas({ initialProducts, lang }: ShowroomCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeZone, setActiveZone] = useState<ShowroomZone>("all");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const [nearbyItem, setNearbyItem] = useState<{ config: ShowroomItemConfig; product: Product } | null>(null);
    const [isAimedAtItem, setIsAimedAtItem] = useState(false);
    const [invertY, setInvertY] = useState(false);
    const t = translations[lang];

    // Simulyator o'yinchi va fizika holatlari
    const stateRef = useRef({
        mode: "FREE_ROAM" as "FREE_ROAM" | "INSPECT",
        playerPos: new THREE.Vector3(0, 1.65, 7.5),
        velocity: new THREE.Vector3(0, 0, 0),
        verticalVelocity: 0,
        isGrounded: true,
        yaw: 0,
        pitch: -0.05,
        bobTimer: 0,
        bobOffset: new THREE.Vector3(0, 0, 0),
        inspectCamPos: new THREE.Vector3(0, 1.65, 7.5),
        inspectLookAt: new THREE.Vector3(0, 1.1, -1.0),
        currentInspectLookAt: new THREE.Vector3(0, 1.1, -1.0),
        keysPressed: {} as Record<string, boolean>,
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
        nearbyItemData: null as { config: ShowroomItemConfig; product: Product } | null,
        soundEnabled: false,
        invertY: false,
    });

    stateRef.current.soundEnabled = soundEnabled;
    stateRef.current.invertY = invertY;

    const handleSelectZone = useCallback((zone: ShowroomZone) => {
        setActiveZone(zone);
        setSelectedProduct(null);
        stateRef.current.mode = "FREE_ROAM";
        const target = DOCK_TARGETS[zone];
        stateRef.current.playerPos.set(...target.cameraPos);
        stateRef.current.velocity.set(0, 0, 0);

        const dx = target.lookAt[0] - target.cameraPos[0];
        const dz = target.lookAt[2] - target.cameraPos[2];
        stateRef.current.yaw = Math.atan2(dx, -dz);
        stateRef.current.pitch = -0.08;
    }, []);

    const handleSelectProduct = useCallback((item: { config: ShowroomItemConfig; product: Product }) => {
        setSelectedProduct(item.product);
        setActiveZone(item.config.zone);
        stateRef.current.mode = "INSPECT";
        stateRef.current.inspectCamPos.set(...item.config.focusPosition);
        stateRef.current.inspectLookAt.set(...item.config.lookAtPosition);

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, []);

    const handleCloseOverlay = useCallback(() => {
        setSelectedProduct(null);
        stateRef.current.mode = "FREE_ROAM";
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. SCENE & CAMERA
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF5F5F7);
        scene.fog = new THREE.FogExp2(0xF5F5F7, 0.012);

        const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 80);
        camera.position.set(0, 1.65, 7.5);

        // 2. GPU GA MOSLASHGAN YENGIL RENDERER (Zero Frame Drops, Max 60 FPS)
        const renderer = new THREE.WebGLRenderer({
            antialias: false, // High DPI ekranlarda FPS ni tushirib yubormaslik uchun
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Pixel ratio 1.25 bilan cheklandi (4K ekranda ham GPU 60 FPS ushlaydi)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        // Soyalarni faqat 1 marta bittalab generatsiya qilish (Bake static shadows)
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;

        container.appendChild(renderer.domElement);

        // 3. LIGHTING (Optimal GPU Light Setup)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.85);
        scene.add(ambientLight);

        const mainSunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
        mainSunLight.position.set(6, 14, 7);
        mainSunLight.castShadow = true;
        mainSunLight.shadow.mapSize.width = 1024;
        mainSunLight.shadow.mapSize.height = 1024;
        mainSunLight.shadow.camera.near = 1.0;
        mainSunLight.shadow.camera.far = 30;
        mainSunLight.shadow.camera.left = -12;
        mainSunLight.shadow.camera.right = 12;
        mainSunLight.shadow.camera.top = 12;
        mainSunLight.shadow.camera.bottom = -12;
        mainSunLight.shadow.bias = -0.0005;
        scene.add(mainSunLight);

        const windowFillLight = new THREE.DirectionalLight(0xe5f1fc, 0.8);
        windowFillLight.position.set(0, 6, -14);
        scene.add(windowFillLight);

        // 3 ta stol ustidagi nuqtaviy yorug'liklar
        const spot1 = new THREE.PointLight(0xfff6ea, 1.2, 8, 2);
        spot1.position.set(-5.5, 4.0, -0.5);
        scene.add(spot1);

        const spot2 = new THREE.PointLight(0xfff6ea, 1.3, 8, 2);
        spot2.position.set(0, 4.0, -4.5);
        scene.add(spot2);

        const spot3 = new THREE.PointLight(0xfff6ea, 1.2, 8, 2);
        spot3.position.set(5.5, 4.0, -0.5);
        scene.add(spot3);

        // 4. ME'MORIY ELEMENTLAR VA TEKSTURALAR
        const woodTexture = createOakWoodTexture();
        const stoneTexture = createStoneFloorTexture();

        // Pol (Pietra Serena Sandstone)
        const floorGeo = new THREE.PlaneGeometry(30, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            map: stoneTexture,
            roughness: 0.32,
            metalness: 0.02,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({
            color: 0xFAFAFC,
            roughness: 0.9,
            metalness: 0.0
        });

        const baseboardMat = new THREE.MeshStandardMaterial({
            color: 0xD0D0D4,
            roughness: 0.35,
            metalness: 0.7
        });

        // Orqa devor fasad ramkalari
        const backWallLeft = new THREE.Mesh(new THREE.BoxGeometry(6.5, 8, 0.4), wallMat);
        backWallLeft.position.set(-10.25, 4, -13);
        backWallLeft.receiveShadow = true;
        scene.add(backWallLeft);

        const backWallRight = new THREE.Mesh(new THREE.BoxGeometry(6.5, 8, 0.4), wallMat);
        backWallRight.position.set(10.25, 4, -13);
        backWallRight.receiveShadow = true;
        scene.add(backWallRight);

        // Shaffof shisha fasad (GPU uchun tejamkor Standard Material)
        const glassWindow = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 7.5),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.22,
                roughness: 0.05,
                metalness: 0.1
            })
        );
        glassWindow.position.set(0, 4, -12.9);
        scene.add(glassWindow);

        // Alyuminiy ustunlar (Mullions)
        const mullionMat = new THREE.MeshStandardMaterial({ color: 0xD8D8DC, metalness: 0.85, roughness: 0.25 });
        [-7, -3.5, 0, 3.5, 7].forEach((mx) => {
            const mulMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7.5, 0.12), mullionMat);
            mulMesh.position.set(mx, 4, -12.85);
            scene.add(mulMesh);
        });

        // Orqa maydon va osmon
        const outdoorPlaza = new THREE.Mesh(
            new THREE.PlaneGeometry(36, 18),
            new THREE.MeshStandardMaterial({ color: 0xEDEBE4, roughness: 0.5 })
        );
        outdoorPlaza.rotation.x = -Math.PI / 2;
        outdoorPlaza.position.set(0, -0.02, -22);
        scene.add(outdoorPlaza);

        const sky = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 15),
            new THREE.MeshBasicMaterial({ color: 0xDFECF7 })
        );
        sky.position.set(0, 7.5, -28);
        scene.add(sky);

        // Devorlar va Plintuslar
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 30), wallMat);
        leftWall.position.set(-13.5, 4, 0);
        leftWall.receiveShadow = true;
        scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 30), wallMat);
        rightWall.position.set(13.5, 4, 0);
        rightWall.receiveShadow = true;
        scene.add(rightWall);

        const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 30), baseboardMat);
        leftBase.position.set(-13.28, 0.06, 0);
        scene.add(leftBase);

        const rightBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 30), baseboardMat);
        rightBase.position.set(13.28, 0.06, 0);
        scene.add(rightBase);

        // Shift va yorug'lik panellari
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 32),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.95 })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 7.5;
        scene.add(ceiling);

        [-6, -2, 2, 6].forEach((x) => {
            const led = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.04, 22),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
            );
            led.position.set(x, 7.48, -1);
            scene.add(led);
        });

        // 5. BRENDING - Markaziy devorda minimalist metall "VELARI"
        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = 512;
        logoCanvas.height = 128;
        const ctx = logoCanvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "rgba(0, 0, 0, 0)";
            ctx.fillRect(0, 0, 512, 128);

            ctx.fillStyle = "#1D1D1F";
            ctx.font = "900 48px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("V E L A R I", 256, 48);

            ctx.fillStyle = "#6E6E73";
            ctx.font = "700 13px system-ui, -apple-system, sans-serif";
            ctx.letterSpacing = "4px";
            ctx.fillText("PREMIUM EXPERIENCE STORE", 256, 88);
        }

        const logoTexture = new THREE.CanvasTexture(logoCanvas);
        const logoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(7, 1.75),
            new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide })
        );
        logoMesh.position.set(0, 6.2, -12.75);
        scene.add(logoMesh);

        // 6. 3 TA YOG'OCH STOL (SOLID BLONDE OAK DISPLAY TABLES)
        const tableOakMat = new THREE.MeshStandardMaterial({
            map: woodTexture,
            color: 0xffffff,
            roughness: 0.35,
            metalness: 0.02
        });

        const createPodium = (x: number, z: number, title: string) => {
            const podiumGroup = new THREE.Group();
            podiumGroup.position.set(x, 0, z);

            const topMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.5), tableOakMat);
            topMesh.position.y = 0.85;
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            podiumGroup.add(topMesh);

            const legGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
            [
                [-1.55, -0.55],
                [1.55, -0.55],
                [-1.55, 0.55],
                [1.55, 0.55]
            ].forEach(([lx, lz]) => {
                const legMesh = new THREE.Mesh(legGeo, tableOakMat);
                legMesh.position.set(lx, 0.425, lz);
                legMesh.castShadow = true;
                legMesh.receiveShadow = true;
                podiumGroup.add(legMesh);
            });

            // Shaffof akril toifa nishoni
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 256;
            badgeCanvas.height = 64;
            const bCtx = badgeCanvas.getContext("2d");
            if (bCtx) {
                bCtx.fillStyle = "rgba(255, 255, 255, 0.92)";
                bCtx.fillRect(0, 0, 256, 64);
                bCtx.fillStyle = "#1D1D1F";
                bCtx.font = "bold 20px system-ui, -apple-system, sans-serif";
                bCtx.textAlign = "center";
                bCtx.textBaseline = "middle";
                bCtx.letterSpacing = "1.5px";
                bCtx.fillText(title.toUpperCase(), 128, 32);
            }
            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badge = new THREE.Mesh(
                new THREE.PlaneGeometry(1.5, 0.38),
                new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
            );
            badge.position.set(0, 0.85, 0.77);
            podiumGroup.add(badge);

            scene.add(podiumGroup);
        };

        createPodium(-5.5, -0.5, t.showroom.smartphones);
        createPodium(0, -4.5, t.showroom.audioWearables);
        createPodium(5.5, -0.5, t.showroom.gamingGadgets);

        // 7. TOVARLAR VA PROCEDURAL MODELLAR
        const itemsWithProducts = mergeWithRealProducts(SHOWROOM_ITEMS, initialProducts);
        const interactiveMeshes: THREE.Object3D[] = [];
        const animatedHotspots: { ring: THREE.Mesh; core: THREE.Mesh; itemId: string; baseY: number }[] = [];
        const animatedSpinners: THREE.Object3D[] = [];
        const productGroups: { group: THREE.Group; itemId: string }[] = [];

        // Standart tejamkor akril stend materiali
        const standMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.65,
            roughness: 0.1,
            metalness: 0.1
        });

        itemsWithProducts.forEach(({ config, product }) => {
            const productGroup = new THREE.Group();
            productGroup.position.set(...config.position);

            const stand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.28), standMat);
            stand.position.y = 0.02;
            stand.castShadow = true;
            stand.receiveShadow = true;
            productGroup.add(stand);

            if (config.modelType === "iphone" || config.modelType === "samsung") {
                const isIPhone = config.modelType === "iphone";
                const phoneGroup = new THREE.Group();
                phoneGroup.position.set(0, 0.24, 0);
                phoneGroup.rotation.x = -Math.PI * 0.18;

                const phoneBody = new THREE.Mesh(
                    new THREE.BoxGeometry(0.24, 0.48, 0.024),
                    new THREE.MeshStandardMaterial({
                        color: isIPhone ? 0xd4af37 : 0x22262e,
                        metalness: 0.85,
                        roughness: 0.25
                    })
                );
                phoneBody.castShadow = true;
                phoneGroup.add(phoneBody);

                const screen = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.22, 0.46),
                    new THREE.MeshBasicMaterial({ color: isIPhone ? 0x050c18 : 0x0a101d })
                );
                screen.position.z = 0.013;
                phoneGroup.add(screen);

                const uiLine = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.18, 0.02),
                    new THREE.MeshBasicMaterial({ color: isIPhone ? 0xf59e0b : 0x38bdf8 })
                );
                uiLine.position.set(0, -0.15, 0.014);
                phoneGroup.add(uiLine);

                const camBump = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.015),
                    new THREE.MeshStandardMaterial({
                        color: isIPhone ? 0xc5a028 : 0x1a1d24,
                        metalness: 0.8,
                        roughness: 0.3
                    })
                );
                camBump.position.set(-0.05, 0.16, -0.016);
                phoneGroup.add(camBump);

                [-0.03, 0.03].forEach((lx, i) => {
                    const lens = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.018, 0.018, 0.01, 12),
                        new THREE.MeshStandardMaterial({ color: 0x020202, metalness: 0.9, roughness: 0.1 })
                    );
                    lens.rotation.x = Math.PI / 2;
                    lens.position.set(-0.05 + lx, 0.16 + (i === 0 ? 0.02 : -0.02), -0.023);
                    phoneGroup.add(lens);
                });

                productGroup.add(phoneGroup);
            } else if (config.modelType === "airpods") {
                const headphoneGroup = new THREE.Group();
                headphoneGroup.position.set(0, 0.3, 0);

                const hStand = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 0.45, 12),
                    new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.85, roughness: 0.25 })
                );
                hStand.position.y = -0.08;
                headphoneGroup.add(hStand);

                const arc = new THREE.Mesh(
                    new THREE.TorusGeometry(0.16, 0.016, 12, 24, Math.PI),
                    new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.8, roughness: 0.3 })
                );
                arc.position.y = 0.14;
                headphoneGroup.add(arc);

                [-0.16, 0.16].forEach((cx) => {
                    const cup = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.065, 0.065, 0.045, 18),
                        new THREE.MeshStandardMaterial({ color: 0x52525b, metalness: 0.85, roughness: 0.25 })
                    );
                    cup.rotation.z = Math.PI / 2;
                    cup.position.set(cx, 0.1, 0);
                    headphoneGroup.add(cup);

                    const cushion = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18),
                        new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 })
                    );
                    cushion.rotation.z = Math.PI / 2;
                    cushion.position.set(cx > 0 ? cx - 0.03 : cx + 0.03, 0.1, 0);
                    headphoneGroup.add(cushion);
                });

                productGroup.add(headphoneGroup);
            } else if (config.modelType === "watch") {
                const watchGroup = new THREE.Group();
                watchGroup.position.set(0, 0.18, 0);

                const watchCase = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.22, 0.06),
                    new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 })
                );
                watchCase.castShadow = true;
                watchGroup.add(watchCase);

                const screen = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.15, 0.18),
                    new THREE.MeshBasicMaterial({ color: 0x050c18 })
                );
                screen.position.z = 0.031;
                watchGroup.add(screen);

                const btn = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.06, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0xf97316 })
                );
                btn.position.set(-0.1, 0.02, 0);
                watchGroup.add(btn);

                const strap = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.12, 0.14, 18, 1, true, -Math.PI / 2, Math.PI),
                    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 })
                );
                strap.rotation.z = Math.PI / 2;
                strap.position.set(0, 0, -0.06);
                watchGroup.add(strap);

                productGroup.add(watchGroup);
            } else if (config.modelType === "ps5") {
                const ps5Group = new THREE.Group();
                ps5Group.position.set(0, 0.35, 0);

                const core = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.65, 0.32),
                    new THREE.MeshStandardMaterial({ color: 0x090a0f, metalness: 0.6, roughness: 0.2 })
                );
                core.castShadow = true;
                ps5Group.add(core);

                [-0.06, 0.06].forEach((wx) => {
                    const wing = new THREE.Mesh(
                        new THREE.BoxGeometry(0.025, 0.7, 0.36),
                        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
                    );
                    wing.position.x = wx;
                    wing.castShadow = true;
                    ps5Group.add(wing);
                });

                const neonLine = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.55, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0x0070d1 })
                );
                neonLine.position.set(0.05, 0.05, 0.18);
                ps5Group.add(neonLine);

                const pad = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.06, 0.12),
                    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
                );
                pad.position.set(0.35, -0.3, 0.05);
                pad.rotation.y = -Math.PI * 0.2;
                ps5Group.add(pad);

                productGroup.add(ps5Group);
            } else if (config.modelType === "drone") {
                const droneGroup = new THREE.Group();
                droneGroup.position.set(0, 0.22, 0);

                const dBody = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.08, 0.28),
                    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 })
                );
                dBody.castShadow = true;
                droneGroup.add(dBody);

                const dCam = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 12, 12),
                    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 })
                );
                dCam.position.set(0, -0.04, 0.15);
                droneGroup.add(dCam);

                const armOffsets = [
                    [-0.18, 0.18],
                    [0.18, 0.18],
                    [-0.18, -0.18],
                    [0.18, -0.18]
                ];
                armOffsets.forEach(([ax, az]) => {
                    const arm = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6),
                        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
                    );
                    arm.rotation.z = Math.PI / 2;
                    arm.rotation.y = Math.atan2(az, ax);
                    arm.position.set(ax * 0.6, 0, az * 0.6);
                    droneGroup.add(arm);

                    const motor = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10),
                        new THREE.MeshStandardMaterial({ color: 0x0f172a })
                    );
                    motor.position.set(ax, 0.02, az);
                    droneGroup.add(motor);

                    const prop = new THREE.Mesh(
                        new THREE.BoxGeometry(0.18, 0.006, 0.02),
                        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
                    );
                    prop.position.set(ax, 0.045, az);
                    droneGroup.add(prop);
                    animatedSpinners.push(prop);
                });

                productGroup.add(droneGroup);
            }

            const hotspotGroup = new THREE.Group();
            hotspotGroup.position.y = 0.85;

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.13, 0.012, 12, 24),
                new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.2,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.85
                })
            );
            ring.rotation.x = Math.PI / 2;
            hotspotGroup.add(ring);

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.036, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x2D6E3E })
            );
            hotspotGroup.add(core);

            const hitbox = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 10, 10),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.userData = { isHotspot: true, itemId: config.id, itemData: { config, product } };
            hotspotGroup.add(hitbox);

            interactiveMeshes.push(hitbox);
            animatedHotspots.push({ ring, core, itemId: config.id, baseY: 0.85 });
            productGroups.push({ group: productGroup, itemId: config.id });

            productGroup.add(hotspotGroup);
            scene.add(productGroup);
        });

        // 8. O'YIN SIMULYATORI BOSHQARUVI (TO'G'RILANGAN SICHQONChA O'QLARI)
        const raycaster = new THREE.Raycaster();
        const screenCenter = new THREE.Vector2(0, 0);

        const handlePointerLockChange = () => {
            const locked = document.pointerLockElement === container;
            setIsPointerLocked(locked);
        };
        document.addEventListener("pointerlockchange", handlePointerLockChange);

        const handleMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === container) {
                const sensitivity = 0.0022;
                // TO'G'RI X O'QI: Sichqoncha o'ngga surilsa yaw OSHADI (kamera o'ngga buriladi)
                stateRef.current.yaw += e.movementX * sensitivity;

                // TO'G'RI Y O'QI: Sichqoncha tepaga (oldinga) surilsa pitch OSHADI (tepaga qaraydi)
                const yMultiplier = stateRef.current.invertY ? 1 : -1;
                stateRef.current.pitch += e.movementY * sensitivity * yMultiplier;

                stateRef.current.pitch = Math.max(-1.48, Math.min(1.48, stateRef.current.pitch));
            } else if (stateRef.current.isDragging && stateRef.current.mode === "FREE_ROAM") {
                const deltaX = e.clientX - stateRef.current.previousMousePosition.x;
                const deltaY = e.clientY - stateRef.current.previousMousePosition.y;

                // TO'G'RI X va Y drag harakati
                stateRef.current.yaw += deltaX * 0.003;
                const yMultiplier = stateRef.current.invertY ? 1 : -1;
                stateRef.current.pitch += deltaY * 0.003 * yMultiplier;

                stateRef.current.pitch = Math.max(-1.48, Math.min(1.48, stateRef.current.pitch));
                stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) {
                if (stateRef.current.mode === "FREE_ROAM") {
                    if (document.pointerLockElement !== container) {
                        container.requestPointerLock?.();
                    } else {
                        if (stateRef.current.nearbyItemData) {
                            handleSelectProduct(stateRef.current.nearbyItemData);
                        }
                    }
                }
                stateRef.current.isDragging = true;
                stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseUp = () => {
            stateRef.current.isDragging = false;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            stateRef.current.keysPressed[key] = true;

            if (key === "e") {
                if (stateRef.current.mode === "FREE_ROAM" && stateRef.current.nearbyItemData) {
                    handleSelectProduct(stateRef.current.nearbyItemData);
                } else if (stateRef.current.mode === "INSPECT") {
                    handleCloseOverlay();
                }
            }

            if (key === "escape") {
                if (stateRef.current.mode === "INSPECT") {
                    handleCloseOverlay();
                }
            }

            if (key === " " || key === "space") {
                if (stateRef.current.isGrounded && stateRef.current.mode === "FREE_ROAM") {
                    stateRef.current.verticalVelocity = 5.2;
                    stateRef.current.isGrounded = false;
                }
            }

            if (key === "1") handleSelectZone("smartphones");
            if (key === "2") handleSelectZone("audio_wearables");
            if (key === "3") handleSelectZone("gaming_gadgets");
            if (key === "4") handleSelectZone("all");
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            stateRef.current.keysPressed[e.key.toLowerCase()] = false;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // 9. ANIMATION LOOP - ZERO ALLOCATION REUSABLE VECTORS (GARBAGE COLLECTORSIZ)
        let animationFrameId: number;
        let clock = new THREE.Clock();
        let frameCount = 0;

        // Oldindan yaratilgan qayta ishlatiladigan scratch vektorlar (Heap allocation = 0!)
        const _forward = new THREE.Vector3();
        const _right = new THREE.Vector3();
        const _inputDir = new THREE.Vector3();
        const _targetVelocity = new THREE.Vector3();
        const _lookDirection = new THREE.Vector3();
        const _camTarget = new THREE.Vector3();
        const _zeroVec = new THREE.Vector3(0, 0, 0);

        const obstacles = [
            { minX: -7.6, maxX: -3.4, minZ: -1.6, maxZ: 0.6 },
            { minX: -2.1, maxX: 2.1, minZ: -5.6, maxZ: -3.4 },
            { minX: 3.4, maxX: 7.6, minZ: -1.6, maxZ: 0.6 }
        ];

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            frameCount++;
            const delta = Math.min(clock.getDelta(), 0.1);
            const elapsed = clock.getElapsedTime();

            if (stateRef.current.mode === "FREE_ROAM") {
                const keys = stateRef.current.keysPressed;
                const isSprinting = Boolean(keys["shift"]);

                // 1) Qadam tashlash yo'nalish vektorlari
                const yaw = stateRef.current.yaw;
                _forward.set(Math.sin(yaw), 0, -Math.cos(yaw));
                _right.set(-_forward.z, 0, _forward.x);

                _inputDir.set(0, 0, 0);
                if (keys["w"] || keys["arrowup"]) _inputDir.add(_forward);
                if (keys["s"] || keys["arrowdown"]) _inputDir.sub(_forward);
                if (keys["d"] || keys["arrowright"]) _inputDir.add(_right);
                if (keys["a"] || keys["arrowleft"]) _inputDir.sub(_right);

                if (_inputDir.lengthSq() > 0) {
                    _inputDir.normalize();
                }

                // 2) Inertsiya va silliq tezlanish
                const baseSpeed = isSprinting ? 6.8 : 3.8;
                _targetVelocity.copy(_inputDir).multiplyScalar(baseSpeed);

                stateRef.current.velocity.x = THREE.MathUtils.lerp(stateRef.current.velocity.x, _targetVelocity.x, 10 * delta);
                stateRef.current.velocity.z = THREE.MathUtils.lerp(stateRef.current.velocity.z, _targetVelocity.z, 10 * delta);

                // 3) Gravitatsiya va sakrash
                stateRef.current.verticalVelocity -= 18.0 * delta;
                stateRef.current.playerPos.y += stateRef.current.verticalVelocity * delta;

                if (stateRef.current.playerPos.y <= 1.65) {
                    stateRef.current.playerPos.y = 1.65;
                    stateRef.current.verticalVelocity = 0;
                    stateRef.current.isGrounded = true;
                }

                // 4) TO'QNAShIShLAR VA SIRPANISh (Obstacle Sliding)
                const currentPos = stateRef.current.playerPos;
                const nextX = currentPos.x + stateRef.current.velocity.x * delta;
                const nextZ = currentPos.z + stateRef.current.velocity.z * delta;

                let canMoveX = true;
                if (nextX < -12.4 || nextX > 12.4) canMoveX = false;
                for (let i = 0; i < 3; i++) {
                    const obs = obstacles[i];
                    if (nextX >= obs.minX && nextX <= obs.maxX && currentPos.z >= obs.minZ && currentPos.z <= obs.maxZ) {
                        canMoveX = false;
                        break;
                    }
                }
                if (canMoveX) currentPos.x = nextX;

                let canMoveZ = true;
                if (nextZ < -11.8 || nextZ > 11.2) canMoveZ = false;
                for (let i = 0; i < 3; i++) {
                    const obs = obstacles[i];
                    if (currentPos.x >= obs.minX && currentPos.x <= obs.maxX && nextZ >= obs.minZ && nextZ <= obs.maxZ) {
                        canMoveZ = false;
                        break;
                    }
                }
                if (canMoveZ) currentPos.z = nextZ;

                // 5) Head Bobbing
                const horizontalSpeed = Math.hypot(stateRef.current.velocity.x, stateRef.current.velocity.z);
                if (horizontalSpeed > 0.3 && stateRef.current.isGrounded) {
                    stateRef.current.bobTimer += delta * (isSprinting ? 14 : 9.5);
                    stateRef.current.bobOffset.y = Math.sin(stateRef.current.bobTimer) * (isSprinting ? 0.04 : 0.02);
                    stateRef.current.bobOffset.x = Math.cos(stateRef.current.bobTimer * 0.5) * (isSprinting ? 0.025 : 0.012);
                } else {
                    stateRef.current.bobOffset.lerp(_zeroVec, 8 * delta);
                }

                camera.position.copy(currentPos).add(stateRef.current.bobOffset);

                // Dynamic FOV
                const targetFov = isSprinting ? 62 : 56;
                if (Math.abs(camera.fov - targetFov) > 0.05) {
                    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 8 * delta);
                    camera.updateProjectionMatrix();
                }

                // Kamera qarash vektori (Yaw + Pitch)
                const pitch = stateRef.current.pitch;
                _lookDirection.set(
                    Math.sin(yaw) * Math.cos(pitch),
                    Math.sin(pitch),
                    -Math.cos(yaw) * Math.cos(pitch)
                );
                _camTarget.copy(camera.position).add(_lookDirection);
                camera.lookAt(_camTarget);

                // 6) Proximity & Crosshair Raycast (Har 3 kadrda bir marta tekshiriladi — CPU 66% tejaladi!)
                if (frameCount % 3 === 0) {
                    raycaster.setFromCamera(screenCenter, camera);
                    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

                    let foundNearby: { config: ShowroomItemConfig; product: Product } | null = null;
                    let isAiming = false;

                    if (intersects.length > 0 && intersects[0].distance < 3.8) {
                        const data = intersects[0].object.userData.itemData;
                        if (data) {
                            foundNearby = data;
                            isAiming = true;
                        }
                    }

                    if (!foundNearby) {
                        let minDistance = 2.4;
                        for (let i = 0; i < itemsWithProducts.length; i++) {
                            const item = itemsWithProducts[i];
                            const dist = Math.hypot(
                                currentPos.x - item.config.position[0],
                                currentPos.z - item.config.position[2]
                            );
                            if (dist < minDistance) {
                                minDistance = dist;
                                foundNearby = item;
                            }
                        }
                    }

                    stateRef.current.nearbyItemData = foundNearby;
                    setNearbyItem(foundNearby);
                    setIsAimedAtItem(isAiming);
                }
            } else {
                // INSPECT REJIMI
                camera.position.lerp(stateRef.current.inspectCamPos, 0.08);
                stateRef.current.currentInspectLookAt.lerp(stateRef.current.inspectLookAt, 0.08);
                camera.lookAt(stateRef.current.currentInspectLookAt);

                const currentProductGroup = productGroups.find(pg => pg.itemId === selectedProduct?.id || selectedProduct?.id?.includes(pg.itemId));
                if (currentProductGroup) {
                    currentProductGroup.group.rotation.y += 0.008;
                }
            }

            // Dron parraklari aylanishi
            for (let i = 0; i < animatedSpinners.length; i++) {
                animatedSpinners[i].rotation.y += 0.35;
            }

            // Hotspot suzishi
            const floatOffset = Math.sin(elapsed * 3.5) * 0.035;
            for (let i = 0; i < animatedHotspots.length; i++) {
                const { ring, core, itemId, baseY } = animatedHotspots[i];
                const isNearby = stateRef.current.nearbyItemData?.config.id === itemId;
                ring.position.y = baseY + floatOffset;
                core.position.y = baseY + floatOffset;
                ring.rotation.z += 0.015;

                const targetScale = isNearby ? 1.4 : 1.0;
                ring.scale.set(targetScale, targetScale, targetScale);
            }

            renderer.render(scene, camera);
        };

        animate();
        setIsLoading(false);

        const handleResize = () => {
            if (!container) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
            renderer.shadowMap.needsUpdate = true;
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener("pointerlockchange", handlePointerLockChange);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("resize", handleResize);

            woodTexture.dispose();
            stoneTexture.dispose();
            logoTexture.dispose();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
            scene.clear();
        };
    }, [initialProducts, handleSelectProduct, handleCloseOverlay, handleSelectZone, selectedProduct, t]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#F5F5F7] select-none font-sans">
            {/* 3D Canvas Conteyneri */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

            {/* O'YIN MARKAZIY CROSSHAIR (GTA RETICLE) */}
            {!selectedProduct && (
                <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
                    <div
                        className={`transition-all duration-150 rounded-full flex items-center justify-center ${
                            isAimedAtItem
                                ? "h-6 w-6 border-2 border-emerald-500 bg-emerald-500/20 scale-125"
                                : "h-2.5 w-2.5 bg-black/40 border border-white/60"
                        }`}
                    >
                        {isAimedAtItem && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                    </div>
                </div>
            )}

            {/* GTA-STYLE INTERACTIVE PROMPT BANNER */}
            {nearbyItem && !selectedProduct && (
                <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                        onClick={() => handleSelectProduct(nearbyItem)}
                        className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/95 px-5 py-3 shadow-[0_12px_35px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 ring-1 ring-black/5"
                    >
                        <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black uppercase text-white shadow-sm tracking-wider">
                            E
                        </span>
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-extrabold text-[#1d1d1f]">
                                {lang === "ru" ? (nearbyItem.product.name_ru || nearbyItem.product.name) : (nearbyItem.product.name_uz || nearbyItem.product.name)}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">
                                {nearbyItem.product.price.toLocaleString("uz-UZ")} so&apos;m • {lang === "ru" ? "Осмотреть и купить" : "Ko'rish va xarid"}
                            </span>
                        </div>
                    </button>
                </div>
            )}

            {/* POINTER LOCK ISHORASI */}
            {!isPointerLocked && !selectedProduct && !isLoading && (
                <div className="pointer-events-none fixed top-6 left-1/2 z-30 -translate-x-1/2 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 rounded-full border border-black/8 bg-white/90 px-4 py-2 text-xs font-semibold text-[#1d1d1f] shadow-lg backdrop-blur-xl ring-1 ring-black/5">
                        <MousePointer size={14} className="text-emerald-600 animate-bounce" />
                        <span>{lang === "ru" ? "Кликните для управления как в симуляторе (WASD + мышь)" : "Simulyator boshqaruviga kirish uchun ekranni bosing"}</span>
                    </div>
                </div>
            )}

            {/* Yuklanish ko'rsatkichi */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F5F7] text-[#1d1d1f]">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                        <div className="absolute h-full w-full rounded-full border-2 border-emerald-500/20 animate-ping" />
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                        <Sparkles size={20} className="absolute text-emerald-600" />
                    </div>
                    <span className="text-sm font-semibold tracking-wider uppercase text-[#86868b]">
                        {lang === "ru" ? "Загрузка 3D Симулятора..." : "3D Simulyator yuklanmoqda..."}
                    </span>
                </div>
            )}

            {/* Yuqori chap: Do'konga qaytish tugmasi */}
            <div className="fixed top-6 left-6 z-30">
                <Link
                    href={`/${lang}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-black/8 bg-white/85 px-4 py-2.5 text-xs font-bold text-[#1d1d1f] shadow-md backdrop-blur-2xl transition-all duration-200 hover:bg-white hover:shadow-lg active:scale-95 ring-1 ring-black/5"
                >
                    <ArrowLeft size={16} />
                    <span>{t.showroom.backToShop}</span>
                </Link>
            </div>

            {/* Yuqori o'ng: Showroom brendi va Audio tugmasi */}
            <div className="fixed top-6 right-6 z-30 flex items-center gap-3">
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/8 bg-white/85 text-[#1d1d1f] shadow-md backdrop-blur-2xl transition-all hover:bg-white active:scale-95 ring-1 ring-black/5"
                    title={soundEnabled ? (lang === "ru" ? "Выключить звук" : "Ovozni o'chirish") : (lang === "ru" ? "Включить звук" : "Ovozni yoqish")}
                >
                    {soundEnabled ? <Volume2 size={17} className="text-emerald-600" /> : <VolumeX size={17} />}
                </button>
            </div>

            {/* Pastki Teleport Dok Menyusi */}
            <NavigationDock
                activeZone={activeZone}
                lang={lang}
                onSelectZone={handleSelectZone}
            />

            {/* Chap pastki boshqaruv yordami (Invert Y sozlamasi bilan) */}
            <ShowroomControlsHelp
                lang={lang}
                invertY={invertY}
                onToggleInvertY={() => setInvertY(!invertY)}
            />

            {/* O'ng tomon: Mahsulot kartasi overlay'i */}
            <ProductDetailOverlay
                product={selectedProduct}
                lang={lang}
                onClose={handleCloseOverlay}
            />
        </div>
    );
}
