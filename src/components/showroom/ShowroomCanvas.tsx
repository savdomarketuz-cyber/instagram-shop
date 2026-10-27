"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { ArrowLeft, Sparkles, Volume2, VolumeX } from "lucide-react";
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

export default function ShowroomCanvas({ initialProducts, lang }: ShowroomCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeZone, setActiveZone] = useState<ShowroomZone>("all");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const t = translations[lang];

    // Kamera va interaktiv holatlar
    const stateRef = useRef({
        targetCamPos: new THREE.Vector3(0, 3.2, 9.5),
        targetLookAt: new THREE.Vector3(0, 1.1, -1.0),
        currentLookAt: new THREE.Vector3(0, 1.1, -1.0),
        isUserInteracting: false,
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
        cameraYaw: 0,
        cameraPitch: 0,
        keysPressed: {} as Record<string, boolean>,
        hoveredItemId: null as string | null,
        soundEnabled: false,
    });

    stateRef.current.soundEnabled = soundEnabled;

    // Zonaga o'tish (Teleport)
    const handleSelectZone = useCallback((zone: ShowroomZone) => {
        setActiveZone(zone);
        setSelectedProduct(null);
        const target = DOCK_TARGETS[zone];
        stateRef.current.targetCamPos.set(...target.cameraPos);
        stateRef.current.targetLookAt.set(...target.lookAt);
    }, []);

    // Tovarga fokuslanish
    const handleSelectProduct = useCallback((item: { config: ShowroomItemConfig; product: Product }) => {
        setSelectedProduct(item.product);
        setActiveZone(item.config.zone);
        stateRef.current.targetCamPos.set(...item.config.focusPosition);
        stateRef.current.targetLookAt.set(...item.config.lookAtPosition);
    }, []);

    const handleCloseOverlay = useCallback(() => {
        setSelectedProduct(null);
        handleSelectZone(activeZone);
    }, [activeZone, handleSelectZone]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. SCENE & CAMERA
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0c10);
        scene.fog = new THREE.FogExp2(0x0a0c10, 0.022);

        const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 3.2, 9.5);

        // 2. RENDERER
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // 3. LIGHTING (Apple Store + Cyber tech lighting)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambientLight);

        const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.4);
        mainDirLight.position.set(5, 12, 6);
        mainDirLight.castShadow = true;
        mainDirLight.shadow.mapSize.width = 2048;
        mainDirLight.shadow.mapSize.height = 2048;
        mainDirLight.shadow.camera.near = 0.5;
        mainDirLight.shadow.camera.far = 30;
        mainDirLight.shadow.camera.left = -15;
        mainDirLight.shadow.camera.right = 15;
        mainDirLight.shadow.camera.top = 15;
        mainDirLight.shadow.camera.bottom = -15;
        mainDirLight.shadow.bias = -0.0005;
        scene.add(mainDirLight);

        // Stol ustidagi yumshoq neon chiroqlar
        const spot1 = new THREE.PointLight(0x38bdf8, 2.5, 9);
        spot1.position.set(-5.5, 3.5, -0.5);
        scene.add(spot1);

        const spot2 = new THREE.PointLight(0xa78bfa, 2.8, 9);
        spot2.position.set(0, 3.5, -4.5);
        scene.add(spot2);

        const spot3 = new THREE.PointLight(0x10b981, 2.5, 9);
        spot3.position.set(5.5, 3.5, -0.5);
        scene.add(spot3);

        // 4. ARCHITECTURE (Floor, Walls, Ceiling, Panorama Window)
        // Floor (Dark polished marble)
        const floorGeo = new THREE.PlaneGeometry(28, 30);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x11141a,
            roughness: 0.18,
            metalness: 0.35,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        scene.add(floor);

        // Pol ustidagi nafis yaltiroq aksent aylanalari
        [-5.5, 0, 5.5].forEach((x, idx) => {
            const z = idx === 1 ? -4.5 : -0.5;
            const ringGeo = new THREE.RingGeometry(2.0, 2.06, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: idx === 0 ? 0x38bdf8 : idx === 1 ? 0xa78bfa : 0x10b981,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(x, 0.01, z);
            scene.add(ring);
        });

        // Devorlar
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x181c24,
            roughness: 0.85,
            metalness: 0.1
        });

        // Orqa devor (Panoramik oynali fasad ramkasi)
        const backWallLeftGeo = new THREE.BoxGeometry(7, 8, 0.4);
        const backWallLeft = new THREE.Mesh(backWallLeftGeo, wallMat);
        backWallLeft.position.set(-10, 4, -13);
        backWallLeft.receiveShadow = true;
        scene.add(backWallLeft);

        const backWallRightGeo = new THREE.BoxGeometry(7, 8, 0.4);
        const backWallRight = new THREE.Mesh(backWallRightGeo, wallMat);
        backWallRight.position.set(10, 4, -13);
        backWallRight.receiveShadow = true;
        scene.add(backWallRight);

        // Orqa panoramali shisha oyna
        const windowGeo = new THREE.PlaneGeometry(13, 7.5);
        const windowMat = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.25,
            roughness: 0.05,
            metalness: 0.1,
            transmission: 0.85,
            ior: 1.5,
        });
        const glassWindow = new THREE.Mesh(windowGeo, windowMat);
        glassWindow.position.set(0, 4, -12.9);
        scene.add(glassWindow);

        // Orqadagi zamonaviy Cyber shahar silueti / osmon
        const cityGroup = new THREE.Group();
        cityGroup.position.set(0, 0, -18);
        for (let i = -14; i <= 14; i += 2.2) {
            const h = 4 + Math.abs(Math.sin(i * 1.5)) * 9;
            const bGeo = new THREE.BoxGeometry(1.6, h, 1.6);
            const bMat = new THREE.MeshStandardMaterial({
                color: 0x07090e,
                roughness: 0.9,
            });
            const building = new THREE.Mesh(bGeo, bMat);
            building.position.set(i, h / 2 - 1, 0);
            cityGroup.add(building);

            // Bino ustidagi neon chiroqlar
            if (Math.random() > 0.4) {
                const beaconGeo = new THREE.SphereGeometry(0.12, 8, 8);
                const beaconMat = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xef4444 : 0x06b6d4
                });
                const beacon = new THREE.Mesh(beaconGeo, beaconMat);
                beacon.position.set(i, h - 0.9, 0);
                cityGroup.add(beacon);
            }
        }
        scene.add(cityGroup);

        // Chap va O'ng devorlar
        const sideWallGeo = new THREE.BoxGeometry(0.4, 8, 28);
        const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
        leftWall.position.set(-13.5, 4, 0);
        leftWall.receiveShadow = true;
        scene.add(leftWall);

        const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
        rightWall.position.set(13.5, 4, 0);
        rightWall.receiveShadow = true;
        scene.add(rightWall);

        // Shift va LED chiziqlar
        const ceilingGeo = new THREE.PlaneGeometry(28, 30);
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x12151d,
            roughness: 0.9
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 7.5;
        scene.add(ceiling);

        // Shift LED panellari (Apple Store uslubidagi uzun parallelepiped chiziqlar)
        [-6, -2, 2, 6].forEach((x) => {
            const ledGeo = new THREE.BoxGeometry(0.8, 0.08, 20);
            const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(x, 7.45, -1);
            scene.add(led);
        });

        // 5. BRENDING - Markaziy devorda porlovchi "VELARI" yozuvi
        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = 1024;
        logoCanvas.height = 256;
        const ctx = logoCanvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "rgba(0, 0, 0, 0)";
            ctx.fillRect(0, 0, 1024, 256);

            // Neon Glow
            ctx.shadowColor = "#38bdf8";
            ctx.shadowBlur = 24;
            ctx.fillStyle = "#ffffff";
            ctx.font = "900 84px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("V E L A R I", 512, 100);

            ctx.shadowBlur = 12;
            ctx.fillStyle = "#38bdf8";
            ctx.font = "700 24px system-ui, sans-serif";
            ctx.letterSpacing = "6px";
            ctx.fillText("PREMIUM TECH VIRTUAL SHOWROOM", 512, 175);
        }

        const logoTexture = new THREE.CanvasTexture(logoCanvas);
        const logoGeo = new THREE.PlaneGeometry(8, 2);
        const logoMat = new THREE.MeshBasicMaterial({
            map: logoTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const logoMesh = new THREE.Mesh(logoGeo, logoMat);
        logoMesh.position.set(0, 6.2, -12.75);
        scene.add(logoMesh);

        // 6. 3 TA PODIUM (STOLLAR)
        const createPodium = (x: number, z: number, glowColor: number, title: string) => {
            const podiumGroup = new THREE.Group();
            podiumGroup.position.set(x, 0, z);

            // Stol asosiy sirti (Top slab)
            const topGeo = new THREE.BoxGeometry(3.6, 0.12, 1.5);
            const topMat = new THREE.MeshStandardMaterial({
                color: 0x1f242e,
                roughness: 0.15,
                metalness: 0.7,
            });
            const topMesh = new THREE.Mesh(topGeo, topMat);
            topMesh.position.y = 0.85;
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            podiumGroup.add(topMesh);

            // Stol usti yorug'lik hoshiyasi
            const borderGeo = new THREE.BoxGeometry(3.64, 0.02, 1.54);
            const borderMat = new THREE.MeshBasicMaterial({ color: glowColor });
            const borderMesh = new THREE.Mesh(borderGeo, borderMat);
            borderMesh.position.y = 0.79;
            podiumGroup.add(borderMesh);

            // Stol oyoqlari (Futuristik metall)
            const legMat = new THREE.MeshStandardMaterial({
                color: 0x0f1217,
                roughness: 0.3,
                metalness: 0.8
            });
            const legGeo = new THREE.BoxGeometry(0.18, 0.8, 1.3);
            const legLeft = new THREE.Mesh(legGeo, legMat);
            legLeft.position.set(-1.5, 0.4, 0);
            legLeft.castShadow = true;
            podiumGroup.add(legLeft);

            const legRight = new THREE.Mesh(legGeo, legMat);
            legRight.position.set(1.5, 0.4, 0);
            legRight.castShadow = true;
            podiumGroup.add(legRight);

            // Underglow neon chiroq (pastga tushuvchi neon)
            const underglowGeo = new THREE.BoxGeometry(3.2, 0.04, 1.1);
            const underglowMat = new THREE.MeshBasicMaterial({ color: glowColor });
            const underglow = new THREE.Mesh(underglowGeo, underglowMat);
            underglow.position.y = 0.05;
            podiumGroup.add(underglow);

            // Stol oldi nom taxtachasi
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 512;
            badgeCanvas.height = 128;
            const bCtx = badgeCanvas.getContext("2d");
            if (bCtx) {
                bCtx.fillStyle = "rgba(0,0,0,0)";
                bCtx.fillRect(0, 0, 512, 128);
                bCtx.fillStyle = "#ffffff";
                bCtx.font = "bold 34px system-ui, sans-serif";
                bCtx.textAlign = "center";
                bCtx.textBaseline = "middle";
                bCtx.fillText(title.toUpperCase(), 256, 64);
            }
            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badgeGeo = new THREE.PlaneGeometry(1.6, 0.4);
            const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true });
            const badge = new THREE.Mesh(badgeGeo, badgeMat);
            badge.position.set(0, 0.7, 0.76);
            podiumGroup.add(badge);

            scene.add(podiumGroup);
        };

        createPodium(-5.5, -0.5, 0x38bdf8, t.showroom.smartphones);
        createPodium(0, -4.5, 0xa78bfa, t.showroom.audioWearables);
        createPodium(5.5, -0.5, 0x10b981, t.showroom.gamingGadgets);

        // 7. TOVARLAR VA ULARNING PROCEDURAL 3D MODELLARI
        const itemsWithProducts = mergeWithRealProducts(SHOWROOM_ITEMS, initialProducts);
        const interactiveMeshes: THREE.Object3D[] = [];
        const animatedHotspots: { ring: THREE.Mesh; core: THREE.Mesh; itemId: string; baseY: number }[] = [];
        const animatedSpinners: THREE.Object3D[] = [];

        itemsWithProducts.forEach(({ config, product }) => {
            const productGroup = new THREE.Group();
            productGroup.position.set(...config.position);

            // Akril stend podstavkasi
            const standGeo = new THREE.BoxGeometry(0.32, 0.04, 0.28);
            const standMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.4,
                roughness: 0.1,
                transmission: 0.9,
            });
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.y = 0.02;
            stand.castShadow = true;
            productGroup.add(stand);

            // MODEL TYPE BO'YICHA 3D ELEMENTLAR:
            if (config.modelType === "iphone" || config.modelType === "samsung") {
                const isIPhone = config.modelType === "iphone";
                const phoneGroup = new THREE.Group();
                phoneGroup.position.set(0, 0.24, 0);
                phoneGroup.rotation.x = -Math.PI * 0.18; // 30 gradus burchak ostida turadi

                // Smartfon korpusi (Titan ramka)
                const bodyGeo = new THREE.BoxGeometry(0.24, 0.48, 0.024);
                const bodyMat = new THREE.MeshStandardMaterial({
                    color: isIPhone ? 0xd4af37 : 0x22262e, // Desert Titanium / Titanium Black
                    metalness: 0.9,
                    roughness: 0.2
                });
                const phoneBody = new THREE.Mesh(bodyGeo, bodyMat);
                phoneBody.castShadow = true;
                phoneGroup.add(phoneBody);

                // Ekran (Yorqin OLED display)
                const screenGeo = new THREE.PlaneGeometry(0.22, 0.46);
                const screenMat = new THREE.MeshBasicMaterial({
                    color: isIPhone ? 0x050c18 : 0x0a101d
                });
                const screen = new THREE.Mesh(screenGeo, screenMat);
                screen.position.z = 0.013;
                phoneGroup.add(screen);

                // Ekrandagi yorqin neon UI chiziqlari (OLED wallpaper simulation)
                const uiLineGeo = new THREE.PlaneGeometry(0.18, 0.02);
                const uiLineMat = new THREE.MeshBasicMaterial({ color: isIPhone ? 0xf59e0b : 0x38bdf8 });
                const uiLine = new THREE.Mesh(uiLineGeo, uiLineMat);
                uiLine.position.set(0, -0.15, 0.014);
                phoneGroup.add(uiLine);

                // Orqa kamera moduli
                const camBumpGeo = new THREE.BoxGeometry(0.1, 0.1, 0.015);
                const camBumpMat = new THREE.MeshStandardMaterial({
                    color: isIPhone ? 0xc5a028 : 0x1a1d24,
                    metalness: 0.8,
                    roughness: 0.3
                });
                const camBump = new THREE.Mesh(camBumpGeo, camBumpMat);
                camBump.position.set(-0.05, 0.16, -0.016);
                phoneGroup.add(camBump);

                // Linzalari
                [-0.03, 0.03].forEach((lx, i) => {
                    const lensGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16);
                    const lensMat = new THREE.MeshStandardMaterial({ color: 0x020202, metalness: 0.9, roughness: 0.1 });
                    const lens = new THREE.Mesh(lensGeo, lensMat);
                    lens.rotation.x = Math.PI / 2;
                    lens.position.set(-0.05 + lx, 0.16 + (i === 0 ? 0.02 : -0.02), -0.023);
                    phoneGroup.add(lens);
                });

                productGroup.add(phoneGroup);
            } else if (config.modelType === "airpods") {
                const headphoneGroup = new THREE.Group();
                headphoneGroup.position.set(0, 0.3, 0);

                // Alyuminiy stend
                const hStandGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 16);
                const hStandMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.9, roughness: 0.2 });
                const hStand = new THREE.Mesh(hStandGeo, hStandMat);
                hStand.position.y = -0.08;
                headphoneGroup.add(hStand);

                // Zanglamas po'lat bosh kamoni (Headband arc)
                const arcGeo = new THREE.TorusGeometry(0.16, 0.016, 16, 32, Math.PI);
                const arcMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.8, roughness: 0.3 });
                const arc = new THREE.Mesh(arcGeo, arcMat);
                arc.position.y = 0.14;
                headphoneGroup.add(arc);

                // Ikkita quloqchin (Earcups)
                [-0.16, 0.16].forEach((cx) => {
                    const cupGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.045, 24);
                    const cupMat = new THREE.MeshStandardMaterial({
                        color: 0x52525b,
                        metalness: 0.85,
                        roughness: 0.25
                    });
                    const cup = new THREE.Mesh(cupGeo, cupMat);
                    cup.rotation.z = Math.PI / 2;
                    cup.position.set(cx, 0.1, 0);
                    headphoneGroup.add(cup);

                    // Yostiqcha (Cushion)
                    const cushionGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24);
                    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9 });
                    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
                    cushion.rotation.z = Math.PI / 2;
                    cushion.position.set(cx > 0 ? cx - 0.03 : cx + 0.03, 0.1, 0);
                    headphoneGroup.add(cushion);
                });

                productGroup.add(headphoneGroup);
            } else if (config.modelType === "watch") {
                const watchGroup = new THREE.Group();
                watchGroup.position.set(0, 0.18, 0);

                // Watch korpus
                const caseGeo = new THREE.BoxGeometry(0.18, 0.22, 0.06);
                const caseMat = new THREE.MeshStandardMaterial({
                    color: 0xd4d4d8,
                    metalness: 0.9,
                    roughness: 0.2
                });
                const watchCase = new THREE.Mesh(caseGeo, caseMat);
                watchCase.castShadow = true;
                watchGroup.add(watchCase);

                // Safir ekran
                const screenGeo = new THREE.PlaneGeometry(0.15, 0.18);
                const screenMat = new THREE.MeshBasicMaterial({ color: 0x050c18 });
                const screen = new THREE.Mesh(screenGeo, screenMat);
                screen.position.z = 0.031;
                watchGroup.add(screen);

                // To'q sariq Action Button
                const btnGeo = new THREE.BoxGeometry(0.02, 0.06, 0.02);
                const btnMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
                const btn = new THREE.Mesh(btnGeo, btnMat);
                btn.position.set(-0.1, 0.02, 0);
                watchGroup.add(btn);

                // Ocean tasma (Orange / Black band)
                const strapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.14, 24, 1, true, -Math.PI / 2, Math.PI);
                const strapMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
                const strap = new THREE.Mesh(strapGeo, strapMat);
                strap.rotation.z = Math.PI / 2;
                strap.position.set(0, 0, -0.06);
                watchGroup.add(strap);

                productGroup.add(watchGroup);
            } else if (config.modelType === "ps5") {
                const ps5Group = new THREE.Group();
                ps5Group.position.set(0, 0.35, 0);

                // O'rtadagi qora modul
                const coreGeo = new THREE.BoxGeometry(0.1, 0.65, 0.32);
                const coreMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, metalness: 0.6, roughness: 0.2 });
                const core = new THREE.Mesh(coreGeo, coreMat);
                core.castShadow = true;
                ps5Group.add(core);

                // Ikkita oq egri panel (Wing plates)
                [-0.06, 0.06].forEach((wx) => {
                    const wingGeo = new THREE.BoxGeometry(0.025, 0.7, 0.36);
                    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
                    const wing = new THREE.Mesh(wingGeo, wingMat);
                    wing.position.x = wx;
                    wing.castShadow = true;
                    ps5Group.add(wing);
                });

                // PS5 Ko'k neon nuri
                const neonLineGeo = new THREE.BoxGeometry(0.02, 0.55, 0.02);
                const neonLineMat = new THREE.MeshBasicMaterial({ color: 0x0070d1 });
                const neonLine = new THREE.Mesh(neonLineGeo, neonLineMat);
                neonLine.position.set(0.05, 0.05, 0.18);
                ps5Group.add(neonLine);

                // Mini DualSense kontroller yonida
                const padGeo = new THREE.BoxGeometry(0.18, 0.06, 0.12);
                const padMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
                const pad = new THREE.Mesh(padGeo, padMat);
                pad.position.set(0.35, -0.3, 0.05);
                pad.rotation.y = -Math.PI * 0.2;
                ps5Group.add(pad);

                productGroup.add(ps5Group);
            } else if (config.modelType === "drone") {
                const droneGroup = new THREE.Group();
                droneGroup.position.set(0, 0.22, 0);

                // Asosiy korpus
                const dBodyGeo = new THREE.BoxGeometry(0.2, 0.08, 0.28);
                const dBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
                const dBody = new THREE.Mesh(dBodyGeo, dBodyMat);
                dBody.castShadow = true;
                droneGroup.add(dBody);

                // 4K Kamera
                const dCamGeo = new THREE.SphereGeometry(0.04, 16, 16);
                const dCamMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
                const dCam = new THREE.Mesh(dCamGeo, dCamMat);
                dCam.position.set(0, -0.04, 0.15);
                droneGroup.add(dCam);

                // 4 ta qo'l va aylanuvchi parraklar
                const armOffsets = [
                    [-0.18, 0.18],
                    [0.18, 0.18],
                    [-0.18, -0.18],
                    [0.18, -0.18]
                ];
                armOffsets.forEach(([ax, az]) => {
                    const armGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.25, 8);
                    const armMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
                    const arm = new THREE.Mesh(armGeo, armMat);
                    arm.rotation.z = Math.PI / 2;
                    arm.rotation.y = Math.atan2(az, ax);
                    arm.position.set(ax * 0.6, 0, az * 0.6);
                    droneGroup.add(arm);

                    // Motor pod
                    const motorGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 12);
                    const motorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
                    const motor = new THREE.Mesh(motorGeo, motorMat);
                    motor.position.set(ax, 0.02, az);
                    droneGroup.add(motor);

                    // Parrak (Propeller) - aylanadi!
                    const propGeo = new THREE.BoxGeometry(0.18, 0.006, 0.02);
                    const propMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
                    const prop = new THREE.Mesh(propGeo, propMat);
                    prop.position.set(ax, 0.045, az);
                    droneGroup.add(prop);
                    animatedSpinners.push(prop);
                });

                productGroup.add(droneGroup);
            }

            // INTERACTIVE HOTSPOT (Suzuvchi neon halqa)
            const hotspotGroup = new THREE.Group();
            hotspotGroup.position.y = 0.85;

            const ringGeo = new THREE.TorusGeometry(0.14, 0.014, 16, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: config.zone === "smartphones" ? 0x38bdf8 : config.zone === "audio_wearables" ? 0xa78bfa : 0x10b981,
                transparent: true,
                opacity: 0.85
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            hotspotGroup.add(ring);

            const coreGeo = new THREE.SphereGeometry(0.038, 16, 16);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const core = new THREE.Mesh(coreGeo, coreMat);
            hotspotGroup.add(core);

            // Click target (Hitbox)
            const hitGeo = new THREE.SphereGeometry(0.35, 12, 12);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitbox = new THREE.Mesh(hitGeo, hitMat);
            hitbox.userData = { isHotspot: true, itemId: config.id, itemData: { config, product } };
            hotspotGroup.add(hitbox);

            interactiveMeshes.push(hitbox);
            animatedHotspots.push({ ring, core, itemId: config.id, baseY: 0.85 });

            productGroup.add(hotspotGroup);
            scene.add(productGroup);
        });

        // 8. INTERACTION HANDLERS (RAYCASTER, MOUSE DRAG, KEYBOARD)
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const handlePointerMove = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Mouse Drag orqali qarash burchagini burish
            if (stateRef.current.isDragging) {
                const deltaX = e.clientX - stateRef.current.previousMousePosition.x;
                const deltaY = e.clientY - stateRef.current.previousMousePosition.y;

                stateRef.current.cameraYaw -= deltaX * 0.003;
                stateRef.current.cameraPitch -= deltaY * 0.003;
                // Pitch limit (-60 to +60 degrees)
                stateRef.current.cameraPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, stateRef.current.cameraPitch));

                // Target LookAt ni hisoblash
                const dir = new THREE.Vector3(
                    Math.sin(stateRef.current.cameraYaw) * Math.cos(stateRef.current.cameraPitch),
                    Math.sin(stateRef.current.cameraPitch),
                    -Math.cos(stateRef.current.cameraYaw) * Math.cos(stateRef.current.cameraPitch)
                );
                stateRef.current.targetLookAt.copy(camera.position).add(dir.multiplyScalar(5));
            }

            stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };

            // Hover tekshiruvi
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(interactiveMeshes, false);
            if (intersects.length > 0) {
                container.style.cursor = "pointer";
                stateRef.current.hoveredItemId = intersects[0].object.userData.itemId;
            } else {
                container.style.cursor = stateRef.current.isDragging ? "grabbing" : "default";
                stateRef.current.hoveredItemId = null;
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 0) {
                stateRef.current.isDragging = true;
                stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
                container.style.cursor = "grabbing";
            }
        };

        const handleMouseUp = () => {
            stateRef.current.isDragging = false;
            container.style.cursor = stateRef.current.hoveredItemId ? "pointer" : "default";
        };

        const handleClick = (e: MouseEvent) => {
            // Agar dragging bilan siljigan bo'lsa click hisoblanmaydi
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(interactiveMeshes, false);
            if (intersects.length > 0) {
                const itemData = intersects[0].object.userData.itemData;
                if (itemData) {
                    handleSelectProduct(itemData);
                }
            }
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            const moveDelta = e.deltaY > 0 ? -0.5 : 0.5;
            stateRef.current.targetCamPos.addScaledVector(forward, moveDelta);
            // Xona chegarasi
            stateRef.current.targetCamPos.x = Math.max(-9, Math.min(9, stateRef.current.targetCamPos.x));
            stateRef.current.targetCamPos.z = Math.max(-10, Math.min(10, stateRef.current.targetCamPos.z));
            stateRef.current.targetCamPos.y = Math.max(1.2, Math.min(5.5, stateRef.current.targetCamPos.y));
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            stateRef.current.keysPressed[e.key.toLowerCase()] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            stateRef.current.keysPressed[e.key.toLowerCase()] = false;
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("click", handleClick);
        window.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // 9. ANIMATION LOOP (60 FPS, Lerp, Rotations)
        let animationFrameId: number;
        let clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            // Klaviatura WASD yurishi
            const keys = stateRef.current.keysPressed;
            const moveSpeed = 4.5 * delta;
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            camDir.y = 0;
            camDir.normalize();

            const sideDir = new THREE.Vector3(-camDir.z, 0, camDir.x);

            let moved = false;
            if (keys["w"] || keys["arrowup"]) {
                stateRef.current.targetCamPos.addScaledVector(camDir, moveSpeed);
                moved = true;
            }
            if (keys["s"] || keys["arrowdown"]) {
                stateRef.current.targetCamPos.addScaledVector(camDir, -moveSpeed);
                moved = true;
            }
            if (keys["a"] || keys["arrowleft"]) {
                stateRef.current.targetCamPos.addScaledVector(sideDir, -moveSpeed);
                moved = true;
            }
            if (keys["d"] || keys["arrowright"]) {
                stateRef.current.targetCamPos.addScaledVector(sideDir, moveSpeed);
                moved = true;
            }

            // Agar WASD bosilsa, targetLookAt ham birga siljiydi
            if (moved) {
                stateRef.current.targetCamPos.x = Math.max(-9, Math.min(9, stateRef.current.targetCamPos.x));
                stateRef.current.targetCamPos.z = Math.max(-10, Math.min(10, stateRef.current.targetCamPos.z));
            }

            // Smooth Camera Lerp (Position & LookAt)
            camera.position.lerp(stateRef.current.targetCamPos, 0.08);
            stateRef.current.currentLookAt.lerp(stateRef.current.targetLookAt, 0.08);
            camera.lookAt(stateRef.current.currentLookAt);

            // Dron parraklari aylanishi
            animatedSpinners.forEach((prop) => {
                prop.rotation.y += 0.35;
            });

            // Hotspot animatsiyalari (Suzish va pulsatsiya)
            animatedHotspots.forEach(({ ring, core, itemId, baseY }) => {
                const isHovered = stateRef.current.hoveredItemId === itemId;
                const floatOffset = Math.sin(elapsed * 3.5) * 0.04;
                ring.position.y = baseY + floatOffset;
                core.position.y = baseY + floatOffset;

                ring.rotation.z += 0.02;

                const targetScale = isHovered ? 1.35 : 1.0;
                ring.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
            });

            renderer.render(scene, camera);
        };

        animate();
        setIsLoading(false);

        // 10. RESIZE LISTENER
        const handleResize = () => {
            if (!container) return;
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };

        window.addEventListener("resize", handleResize);

        // CLEANUP
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("click", handleClick);
            window.removeEventListener("wheel", handleWheel);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("resize", handleResize);

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
            scene.clear();
        };
    }, [initialProducts, handleSelectProduct, t]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a0c10] select-none font-sans">
            {/* 3D Canvas Conteyneri */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full" />

            {/* Yuklanish ko'rsatkichi */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0c10] text-white">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                        <div className="absolute h-full w-full rounded-full border-2 border-emerald-500/20 animate-ping" />
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                        <Sparkles size={20} className="absolute text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold tracking-wider uppercase text-white/70">
                        {lang === "ru" ? "Загрузка 3D Шоурума..." : "3D Showroom yuklanmoqda..."}
                    </span>
                </div>
            )}

            {/* Yuqori chap: Do'konga qaytish tugmasi */}
            <div className="fixed top-6 left-6 z-30">
                <Link
                    href={`/${lang}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-black/60 px-4 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-2xl transition-all duration-200 hover:bg-white hover:text-black active:scale-95 ring-1 ring-white/10"
                >
                    <ArrowLeft size={16} />
                    <span>{t.showroom.backToShop}</span>
                </Link>
            </div>

            {/* Yuqori o'ng: Showroom brendi va Audio tugmasi */}
            <div className="fixed top-6 right-6 z-30 flex items-center gap-3">
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-black/60 text-white/70 shadow-2xl backdrop-blur-2xl transition-all hover:bg-white/20 hover:text-white active:scale-95 ring-1 ring-white/10"
                    title={soundEnabled ? (lang === "ru" ? "Выключить звук" : "Ovozni o'chirish") : (lang === "ru" ? "Включить звук" : "Ovozni yoqish")}
                >
                    {soundEnabled ? <Volume2 size={17} className="text-emerald-400" /> : <VolumeX size={17} />}
                </button>
            </div>

            {/* Pastki Teleport Dok Menyusi */}
            <NavigationDock
                activeZone={activeZone}
                lang={lang}
                onSelectZone={handleSelectZone}
            />

            {/* Chap pastki boshqaruv yordami */}
            <ShowroomControlsHelp lang={lang} />

            {/* O'ng tomon: Mahsulot kartasi overlay'i */}
            <ProductDetailOverlay
                product={selectedProduct}
                lang={lang}
                onClose={handleCloseOverlay}
            />
        </div>
    );
}
