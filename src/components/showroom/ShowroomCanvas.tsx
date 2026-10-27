"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, MousePointer, Sparkles } from "lucide-react";
import { Product } from "@/types";
import {
    buildShowroomStands,
    DOCK_TARGETS,
    ShowroomZone,
    ShowroomBillboardStand
} from "./showroom-data";
import ProductDetailOverlay from "./ProductDetailOverlay";
import NavigationDock from "./NavigationDock";
import ShowroomControlsHelp from "./ShowroomControlsHelp";
import { translations } from "@/lib/translations";

interface ShowroomCanvasProps {
    initialProducts: Product[];
    lang: "uz" | "ru";
}

/**
 * Tasvirni CORS xatosiz yuklash uchun ichki Next.js rewrite proxy'ga yo'naltirish
 */
function getSafeImageUrl(url?: string): string {
    if (!url) return "";
    if (url.startsWith("https://media.velari.uz/")) {
        return url.replace("https://media.velari.uz/", "/media-proxy/");
    }
    return url;
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

/**
 * Tutqich tagidagi yoyilgan yashil rangli nur teksturasi
 */
function createRadialGreenGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
    grad.addColorStop(0, "rgba(16, 185, 129, 0.85)");
    grad.addColorStop(0.35, "rgba(16, 185, 129, 0.45)");
    grad.addColorStop(0.7, "rgba(5, 150, 105, 0.18)");
    grad.addColorStop(1, "rgba(5, 150, 105, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Reklama taxtasi ekrani uchun dinamik, tinimsiz aylanuvchi Canvas teksturasi
 */
function createBillboardTexture(
    stand: ShowroomBillboardStand,
    lang: "uz" | "ru"
): { texture: THREE.CanvasTexture; cleanup: () => void } {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;

    if (!ctx) return { texture, cleanup: () => {} };

    const items = stand.products;
    const count = Math.max(1, items.length);
    const cardHeight = 1024 / count; // 512px har bir tovar kartasi uchun

    const renderCards = (images: (HTMLImageElement | null)[]) => {
        ctx.clearRect(0, 0, 512, 1024);

        for (let i = 0; i < count; i++) {
            const product = items[i];
            const startY = i * cardHeight;
            const name = lang === "ru" ? (product.name_ru || product.name) : (product.name_uz || product.name);
            const price = product.price || 0;
            const oldPrice = product.oldPrice || (product as any).old_price;

            // 1. Shishasimon qorong'i zamonaviy panel korpusi
            ctx.fillStyle = "rgba(10, 16, 28, 0.90)";
            ctx.beginPath();
            ctx.roundRect(16, startY + 14, 480, cardHeight - 28, 22);
            ctx.fill();

            // 2. Nozik zumrad hoshiya (Neon border)
            ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
            ctx.lineWidth = 2.0;
            ctx.stroke();

            // 3. Shisha yaltirashi (Gloss gradient)
            const gloss = ctx.createLinearGradient(0, startY + 14, 0, startY + 150);
            gloss.addColorStop(0, "rgba(255, 255, 255, 0.08)");
            gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = gloss;
            ctx.beginPath();
            ctx.roundRect(16, startY + 14, 480, 120, [22, 22, 0, 0]);
            ctx.fill();

            // 4. Yuqori toifa nishoni
            ctx.fillStyle = "#10b981";
            ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
            const catTitle = lang === "ru" ? stand.categoryTitleRu : stand.categoryTitleUz;
            ctx.fillText(catTitle.toUpperCase(), 36, startY + 46);

            // Jonli yashil nuqta
            ctx.fillStyle = "#34d399";
            ctx.beginPath();
            ctx.arc(460, startY + 42, 5, 0, Math.PI * 2);
            ctx.fill();

            // 5. Mahsulot rasmi
            const img = images[i];
            const imgAreaX = 46;
            const imgAreaY = startY + 62;
            const imgAreaW = 420;
            const imgAreaH = 220;

            if (img && img.complete && img.naturalWidth > 0) {
                const scale = Math.min(imgAreaW / img.naturalWidth, imgAreaH / img.naturalHeight) * 0.94;
                const dw = img.naturalWidth * scale;
                const dh = img.naturalHeight * scale;
                const dx = imgAreaX + (imgAreaW - dw) / 2;
                const dy = imgAreaY + (imgAreaH - dh) / 2;

                ctx.save();
                ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
                ctx.shadowBlur = 18;
                ctx.drawImage(img, dx, dy, dw, dh);
                ctx.restore();
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
                ctx.beginPath();
                ctx.roundRect(imgAreaX + 30, imgAreaY + 10, imgAreaW - 60, imgAreaH - 20, 16);
                ctx.fill();

                ctx.fillStyle = "#6ee7b7";
                ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("VELARI SHOWCASE", 256, imgAreaY + 105);
                ctx.font = "13px system-ui";
                ctx.fillStyle = "#94a3b8";
                ctx.fillText("Original Retail", 256, imgAreaY + 130);
                ctx.textAlign = "left";
            }

            // 6. Mahsulot nomi (2 qator silliq matn)
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
            ctx.shadowBlur = 6;

            const words = (name || "").split(" ");
            let line1 = "";
            let line2 = "";
            for (const w of words) {
                if ((line1 + " " + w).length < 32) {
                    line1 += (line1 ? " " : "") + w;
                } else if ((line2 + " " + w).length < 34) {
                    line2 += (line2 ? " " : "") + w;
                }
            }
            if (!line2 && words.length > 5) line2 = words.slice(line1.split(" ").length).join(" ");
            if (line2.length > 36) line2 = line2.slice(0, 33) + "...";

            ctx.fillText(line1, 36, startY + 314);
            if (line2) {
                ctx.fillText(line2, 36, startY + 340);
            }
            ctx.shadowBlur = 0;

            // 7. EKRANNI TAGIDAGI NARX PLASHKASI
            const priceBoxY = startY + 372;
            ctx.fillStyle = "rgba(16, 185, 129, 0.16)";
            ctx.beginPath();
            ctx.roundRect(32, priceBoxY, 448, 86, 16);
            ctx.fill();
            ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // "NARX"
            ctx.fillStyle = "#a7f3d0";
            ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
            ctx.fillText(lang === "ru" ? "ЦЕНА" : "NARX", 46, priceBoxY + 24);

            // Asosiy narx
            ctx.fillStyle = "#34d399";
            ctx.font = "900 25px system-ui, -apple-system, sans-serif";
            ctx.fillText(`${price.toLocaleString("uz-UZ")} SO'M`, 46, priceBoxY + 58);

            // Eski narx (chizilgan)
            if (oldPrice && oldPrice > price) {
                ctx.fillStyle = "#9ca3af";
                ctx.font = "500 13px system-ui";
                const oldText = `${oldPrice.toLocaleString("uz-UZ")} so'm`;
                const oldX = 46 + ctx.measureText(`${price.toLocaleString("uz-UZ")} SO'M`).width + 14;
                if (oldX < 360) {
                    ctx.fillText(oldText, oldX, priceBoxY + 56);
                    ctx.strokeStyle = "#ef4444";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(oldX - 2, priceBoxY + 52);
                    ctx.lineTo(oldX + ctx.measureText(oldText).width + 2, priceBoxY + 52);
                    ctx.stroke();
                }
            }

            // "[ E ] KO'RISH" tugmasi
            ctx.fillStyle = "#059669";
            ctx.beginPath();
            ctx.roundRect(368, priceBoxY + 24, 96, 38, 10);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(lang === "ru" ? "ВИТРИНА" : "KO'RISH", 416, priceBoxY + 48);
            ctx.textAlign = "left";
        }

        texture.needsUpdate = true;
    };

    const loadedImages: (HTMLImageElement | null)[] = items.map(() => null);

    // Boshlang'ich render (placeholderlar bilan tezkor)
    renderCards(loadedImages);

    // Rasmlarni asinxron yuklash
    items.forEach((p, idx) => {
        if (!p.image) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = getSafeImageUrl(p.image);
        img.onload = () => {
            loadedImages[idx] = img;
            renderCards(loadedImages);
        };
        img.onerror = () => {
            const fallbackImg = new Image();
            fallbackImg.src = p.image;
            fallbackImg.onload = () => {
                loadedImages[idx] = fallbackImg;
                renderCards(loadedImages);
            };
        };
    });

    return {
        texture,
        cleanup: () => {
            texture.dispose();
        }
    };
}

/**
 * 3D Rangsiz Shishali Ekran va Yashil Taglik Meshini yaratish
 */
function createBillboardMesh(
    stand: ShowroomBillboardStand,
    billboardTex: THREE.CanvasTexture,
    greenGlowTex: THREE.CanvasTexture
): THREE.Group {
    const group = new THREE.Group();
    group.position.set(...stand.position);

    // 1. "TAGIDA BIROZ YOYILGAN YASHIL RANGLI TUTQICHI"
    // A) Yoyilgan yashil nur diski (Table surface diffuse ambient glow disk)
    const glowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.85),
        new THREE.MeshBasicMaterial({
            map: greenGlowTex,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.005; // stol ustida
    group.add(glowMesh);

    // B) Metall zumrad taglik (Pedestal footplate)
    const footMat = new THREE.MeshStandardMaterial({
        color: 0x064e3b, // to'q zumrad
        metalness: 0.85,
        roughness: 0.25
    });
    const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.24, 0.024, 32),
        footMat
    );
    foot.position.y = 0.012;
    foot.castShadow = true;
    foot.receiveShadow = true;
    group.add(foot);

    // C) Yashil metall bo'yin / tutqich (Angled vertical mounting bracket)
    const bracketMat = new THREE.MeshStandardMaterial({
        color: 0x10b981, // yorqin zumrad
        metalness: 0.9,
        roughness: 0.2
    });
    const stem = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.22, 0.05),
        bracketMat
    );
    stem.position.set(0, 0.12, -0.01);
    stem.castShadow = true;
    group.add(stem);

    // D) Tutqich ustidagi biriktirgich (Screen clamp)
    const clamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.035, 0.055),
        bracketMat
    );
    clamp.position.set(0, 0.22, 0);
    group.add(clamp);

    // 2. "HUDDI EKRANDEK TURSIN RANGSIZ SHISHALI EKRAN"
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.74, 0);
    screenGroup.rotation.x = -0.14; // Ergonomik ~8° orqaga egilish

    // A) Rangsiz shisha korpusi (Colorless transparent glass slab)
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        roughness: 0.08,
        metalness: 0.12
    });

    const glassBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 1.08, 0.02),
        glassMat
    );
    glassBody.castShadow = true;
    screenGroup.add(glassBody);

    // B) Shisha chetidagi nozik grafit ramka (Thin dark edge bezel)
    const bezelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3
    });
    const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.74, 1.10, 0.014),
        bezelMat
    );
    bezel.position.z = -0.004;
    screenGroup.add(bezel);

    // C) Tinimsiz skrol bo'lib turuvchi displey yuzasi (Display face)
    const displayMat = new THREE.MeshBasicMaterial({
        map: billboardTex,
        transparent: true,
        opacity: 0.96
    });
    const displayFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 1.04),
        displayMat
    );
    displayFace.position.z = 0.011; // shishaning old yuzasida
    screenGroup.add(displayFace);

    group.add(screenGroup);
    return group;
}

export default function ShowroomCanvas({ initialProducts, lang }: ShowroomCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeZone, setActiveZone] = useState<ShowroomZone>("all");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPointerLocked, setIsPointerLocked] = useState(false);
    const [nearbyItem, setNearbyItem] = useState<{ stand: ShowroomBillboardStand; product: Product } | null>(null);
    const [isAimedAtItem, setIsAimedAtItem] = useState(false);
    const [invertY, setInvertY] = useState(false);
    const t = translations[lang];

    // Simulyator o'yinchi va fizika holatlari
    const stateRef = useRef({
        mode: "FREE_ROAM" as "FREE_ROAM" | "INSPECT",
        playerPos: new THREE.Vector3(0, 1.65, 8.5),
        velocity: new THREE.Vector3(0, 0, 0),
        verticalVelocity: 0,
        isGrounded: true,
        yaw: 0,
        pitch: -0.05,
        bobTimer: 0,
        bobOffset: new THREE.Vector3(0, 0, 0),
        inspectCamPos: new THREE.Vector3(0, 1.65, 8.5),
        inspectLookAt: new THREE.Vector3(0, 1.1, -0.5),
        currentInspectLookAt: new THREE.Vector3(0, 1.1, -0.5),
        keysPressed: {} as Record<string, boolean>,
        isDragging: false,
        previousMousePosition: { x: 0, y: 0 },
        nearbyItemData: null as { stand: ShowroomBillboardStand; product: Product } | null,
        soundEnabled: false,
        invertY: false,
    });

    const toggleSound = useCallback(() => {
        setSoundEnabled((prev) => {
            const next = !prev;
            stateRef.current.soundEnabled = next;
            return next;
        });
    }, []);

    const toggleInvertY = useCallback(() => {
        setInvertY((prev) => {
            const next = !prev;
            stateRef.current.invertY = next;
            return next;
        });
    }, []);

    const handleSelectZone = useCallback((zone: ShowroomZone) => {
        setActiveZone(zone);
        const target = DOCK_TARGETS[zone];
        if (target) {
            stateRef.current.mode = "FREE_ROAM";
            stateRef.current.playerPos.set(...target.cameraPos);
            const dx = target.lookAt[0] - target.cameraPos[0];
            const dz = target.lookAt[2] - target.cameraPos[2];
            stateRef.current.yaw = Math.atan2(dx, -dz);
            stateRef.current.pitch = -0.05;
        }
    }, []);

    const handleSelectProduct = useCallback((item: { stand: ShowroomBillboardStand; product: Product }) => {
        setSelectedProduct(item.product);
        stateRef.current.mode = "INSPECT";
        stateRef.current.inspectCamPos.set(...item.stand.focusPosition);
        stateRef.current.inspectLookAt.set(...item.stand.lookAtPosition);
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
        scene.fog = new THREE.FogExp2(0xF5F5F7, 0.022);

        const camera = new THREE.PerspectiveCamera(
            58,
            window.innerWidth / window.innerHeight,
            0.1,
            60
        );
        camera.position.set(0, 1.65, 8.5);

        // 2. RENDERER (Optimizatsiya qilingan GPU pipeline)
        const renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: false,
            stencil: false,
            depth: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        // Statik soyalar (Bake static shadows)
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.shadowMap.autoUpdate = false;
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

        // 4 ta stol ustidagi nuqtaviy studiya yoritgichlari
        const spot1 = new THREE.PointLight(0xfff6ea, 1.2, 8, 2);
        spot1.position.set(-5.5, 4.0, -0.5);
        scene.add(spot1);

        const spot2 = new THREE.PointLight(0xfff6ea, 1.3, 8, 2);
        spot2.position.set(0, 4.0, -4.5);
        scene.add(spot2);

        const spot3 = new THREE.PointLight(0xfff6ea, 1.2, 8, 2);
        spot3.position.set(5.5, 4.0, -0.5);
        scene.add(spot3);

        const spot4 = new THREE.PointLight(0xfff6ea, 1.3, 8, 2);
        spot4.position.set(0, 4.0, 3.5);
        scene.add(spot4);

        // 4. ME'MORIY ELEMENTLAR VA TEKSTURALAR
        const stoneFloorTex = createStoneFloorTexture();
        const floorMat = new THREE.MeshStandardMaterial({
            map: stoneFloorTex,
            roughness: 0.85,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0xfcfcfd,
            roughness: 0.95
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 5.2;
        scene.add(ceiling);

        // Shift yorug'lik lentalari (Recessed LED troffers)
        const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-6, -2, 2, 6].forEach((xPos) => {
            const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 20), lightStripMat);
            strip.rotation.x = Math.PI / 2;
            strip.position.set(xPos, 5.18, 0);
            scene.add(strip);
        });

        // Devorlar
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F7, roughness: 0.9 });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        backWall.position.set(0, 2.6, -13);
        backWall.receiveShadow = true;
        scene.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        leftWall.position.set(-13, 2.6, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        rightWall.position.set(13, 2.6, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        scene.add(rightWall);

        // Old panoramali shisha devor (Studiya manzarasi)
        const frontWall = new THREE.Mesh(
            new THREE.PlaneGeometry(28, 5.2),
            new THREE.MeshStandardMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.12,
                roughness: 0.1,
                metalness: 0.2
            })
        );
        frontWall.position.set(0, 2.6, 13);
        frontWall.rotation.y = Math.PI;
        scene.add(frontWall);

        // 5. BLONDE OAK STOLLAR (Apple Store uslubidagi eman stollar)
        const oakTex = createOakWoodTexture();
        const tableOakMat = new THREE.MeshStandardMaterial({
            map: oakTex,
            roughness: 0.42,
            metalness: 0.05
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

            // Shaffof toifa nishoni
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 256;
            badgeCanvas.height = 64;
            const bctx = badgeCanvas.getContext("2d");
            if (bctx) {
                bctx.fillStyle = "rgba(255, 255, 255, 0.92)";
                bctx.roundRect(0, 0, 256, 64, 14);
                bctx.fill();
                bctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
                bctx.lineWidth = 2.5;
                bctx.stroke();

                bctx.fillStyle = "#064e3b";
                bctx.font = "bold 20px system-ui, -apple-system, sans-serif";
                bctx.textAlign = "center";
                bctx.textBaseline = "middle";
                bctx.fillText(title, 128, 32);
            }
            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badge = new THREE.Mesh(
                new THREE.PlaneGeometry(0.75, 0.18),
                new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
            );
            badge.position.set(0, 0.85, 0.77);
            podiumGroup.add(badge);

            scene.add(podiumGroup);
        };

        // 4 ta toifaviy vitrina stollari
        createPodium(-5.5, -0.5, t.showroom.trimmers);
        createPodium(0, -4.5, t.showroom.hairCare);
        createPodium(5.5, -0.5, t.showroom.shavers);
        createPodium(0, 3.5, t.showroom.gadgets);

        // 6. HAQIQIY DB TOVARLARI ASOSIDAGI REKLAMA TAXTALARI (GLASS SCREENS)
        const stands = buildShowroomStands(initialProducts);
        const interactiveMeshes: THREE.Object3D[] = [];
        const animatedHotspots: { ring: THREE.Mesh; core: THREE.Mesh; standId: string; baseY: number }[] = [];
        const scrollingTextures: THREE.CanvasTexture[] = [];
        const cleanups: (() => void)[] = [];

        const greenGlowTex = createRadialGreenGlowTexture();

        stands.forEach((stand) => {
            // Dinamik skroll bo'luvchi tekstura
            const { texture: bbTex, cleanup } = createBillboardTexture(stand, lang);
            scrollingTextures.push(bbTex);
            cleanups.push(cleanup);

            // 3D Ekran va yashil tutqich meshi
            const billboardMesh = createBillboardMesh(stand, bbTex, greenGlowTex);

            // Interaktiv reticle hitbox
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(0.85, 1.3, 0.45),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.set(stand.position[0], stand.position[1] + 0.65, stand.position[2]);
            hitbox.userData = {
                isHotspot: true,
                standId: stand.id,
                itemData: { stand, product: stand.featuredProduct }
            };
            scene.add(hitbox);
            interactiveMeshes.push(hitbox);

            // Hotspot suzuvchi halqasi
            const hotspotGroup = new THREE.Group();
            hotspotGroup.position.set(stand.position[0], stand.position[1] + 1.45, stand.position[2]);

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.12, 0.012, 12, 24),
                new THREE.MeshStandardMaterial({
                    color: 0x10b981,
                    roughness: 0.2,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.85
                })
            );
            ring.rotation.x = Math.PI / 2;
            hotspotGroup.add(ring);

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.032, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x059669 })
            );
            hotspotGroup.add(core);

            animatedHotspots.push({
                ring,
                core,
                standId: stand.id,
                baseY: stand.position[1] + 1.45
            });

            scene.add(hotspotGroup);
            scene.add(billboardMesh);
        });

        // 7. O'YIN SIMULYATORI BOSHQARUVI
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
                const yMultiplier = stateRef.current.invertY ? 1 : -1;

                stateRef.current.yaw += e.movementX * sensitivity;
                stateRef.current.pitch += e.movementY * sensitivity * yMultiplier;
                stateRef.current.pitch = Math.max(-1.48, Math.min(1.48, stateRef.current.pitch));
            } else if (stateRef.current.isDragging && stateRef.current.mode === "FREE_ROAM") {
                const deltaX = e.clientX - stateRef.current.previousMousePosition.x;
                const deltaY = e.clientY - stateRef.current.previousMousePosition.y;
                const yMultiplier = stateRef.current.invertY ? 1 : -1;

                stateRef.current.yaw += deltaX * 0.003;
                stateRef.current.pitch += deltaY * 0.003 * yMultiplier;
                stateRef.current.pitch = Math.max(-1.48, Math.min(1.48, stateRef.current.pitch));
                stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (e.target !== renderer.domElement) return;

            if (!document.pointerLockElement && stateRef.current.mode === "FREE_ROAM") {
                container.requestPointerLock?.();
            }

            stateRef.current.isDragging = true;
            stateRef.current.previousMousePosition = { x: e.clientX, y: e.clientY };

            if (stateRef.current.nearbyItemData) {
                handleSelectProduct(stateRef.current.nearbyItemData);
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

            if (key === "1") handleSelectZone("trimmers");
            if (key === "2") handleSelectZone("hair_care");
            if (key === "3") handleSelectZone("shavers");
            if (key === "4") handleSelectZone("gadgets");
            if (key === "5" || key === "0") handleSelectZone("all");
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            stateRef.current.keysPressed[e.key.toLowerCase()] = false;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // 8. ANIMATION LOOP - ZERO ALLOCATION REUSABLE VECTORS
        let animationFrameId: number;
        let clock = new THREE.Clock();
        let frameCount = 0;

        const _forward = new THREE.Vector3();
        const _right = new THREE.Vector3();
        const _inputDir = new THREE.Vector3();
        const _targetVelocity = new THREE.Vector3();
        const _lookDirection = new THREE.Vector3();
        const _camTarget = new THREE.Vector3();

        // 4 ta stol to'siqlari (Obstacle Sliding)
        const obstacles = [
            { minX: -7.6, maxX: -3.4, minZ: -1.6, maxZ: 0.6 },
            { minX: -2.1, maxX: 2.1, minZ: -5.6, maxZ: -3.4 },
            { minX: 3.4, maxX: 7.6, minZ: -1.6, maxZ: 0.6 },
            { minX: -2.1, maxX: 2.1, minZ: 2.4, maxZ: 4.6 }
        ];

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            frameCount++;
            const delta = Math.min(clock.getDelta(), 0.1);
            const elapsed = clock.getElapsedTime();

            if (stateRef.current.mode === "FREE_ROAM") {
                const keys = stateRef.current.keysPressed;
                const isSprinting = Boolean(keys["shift"]);

                // 1) Yo'nalish hisoblash
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

                // 2) Inertsiya
                const baseSpeed = isSprinting ? 6.8 : 3.8;
                _targetVelocity.copy(_inputDir).multiplyScalar(baseSpeed);

                stateRef.current.velocity.x = THREE.MathUtils.lerp(stateRef.current.velocity.x, _targetVelocity.x, 10 * delta);
                stateRef.current.velocity.z = THREE.MathUtils.lerp(stateRef.current.velocity.z, _targetVelocity.z, 10 * delta);

                // 3) Gravitatsiya
                stateRef.current.verticalVelocity -= 18.0 * delta;
                stateRef.current.playerPos.y += stateRef.current.verticalVelocity * delta;

                if (stateRef.current.playerPos.y <= 1.65) {
                    stateRef.current.playerPos.y = 1.65;
                    stateRef.current.verticalVelocity = 0;
                    stateRef.current.isGrounded = true;
                }

                // 4) To'siqlardan sirpanish (Obstacle Sliding)
                const currentPos = stateRef.current.playerPos;
                const nextX = currentPos.x + stateRef.current.velocity.x * delta;
                const nextZ = currentPos.z + stateRef.current.velocity.z * delta;

                let canMoveX = true;
                if (nextX < -12.4 || nextX > 12.4) canMoveX = false;
                for (let i = 0; i < obstacles.length; i++) {
                    const obs = obstacles[i];
                    if (nextX >= obs.minX && nextX <= obs.maxX && currentPos.z >= obs.minZ && currentPos.z <= obs.maxZ) {
                        canMoveX = false;
                        break;
                    }
                }
                if (canMoveX) currentPos.x = nextX;

                let canMoveZ = true;
                if (nextZ < -11.8 || nextZ > 11.2) canMoveZ = false;
                for (let i = 0; i < obstacles.length; i++) {
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
                    const bobFreq = isSprinting ? 14 : 9;
                    stateRef.current.bobTimer += delta * bobFreq;
                    const bobAmplitude = isSprinting ? 0.045 : 0.025;
                    stateRef.current.bobOffset.set(
                        Math.cos(stateRef.current.bobTimer * 0.5) * bobAmplitude * 0.5,
                        Math.sin(stateRef.current.bobTimer) * bobAmplitude,
                        0
                    );
                } else {
                    stateRef.current.bobOffset.lerp(new THREE.Vector3(0, 0, 0), 8 * delta);
                }

                camera.position.copy(currentPos).add(stateRef.current.bobOffset);

                // 6) Kamera qarashi
                const pitch = stateRef.current.pitch;
                _lookDirection.set(
                    Math.sin(yaw) * Math.cos(pitch),
                    Math.sin(pitch),
                    -Math.cos(yaw) * Math.cos(pitch)
                );
                _camTarget.copy(camera.position).add(_lookDirection);
                camera.lookAt(_camTarget);

                // 7) Har 2 kadrda nishon (Raycasting) tekshiruvi
                if (frameCount % 2 === 0) {
                    raycaster.setFromCamera(screenCenter, camera);
                    const intersects = raycaster.intersectObjects(interactiveMeshes, false);

                    let foundNearby: { stand: ShowroomBillboardStand; product: Product } | null = null;
                    let isAiming = false;

                    if (intersects.length > 0 && intersects[0].distance < 6.5) {
                        const hitObj = intersects[0].object;
                        if (hitObj.userData?.itemData) {
                            foundNearby = hitObj.userData.itemData;
                            isAiming = true;
                        }
                    }

                    if (!foundNearby) {
                        let minDistance = 2.8;
                        for (let i = 0; i < stands.length; i++) {
                            const stand = stands[i];
                            const dist = Math.hypot(
                                currentPos.x - stand.position[0],
                                currentPos.z - stand.position[2]
                            );
                            if (dist < minDistance) {
                                minDistance = dist;
                                foundNearby = { stand, product: stand.featuredProduct };
                            }
                        }
                    }

                    stateRef.current.nearbyItemData = foundNearby;
                    setNearbyItem(foundNearby);
                    setIsAimedAtItem(isAiming);
                }
            } else {
                // INSPECT REJIMI (Ekran oldiga silliq yaqinlashish)
                camera.position.lerp(stateRef.current.inspectCamPos, 0.08);
                stateRef.current.currentInspectLookAt.lerp(stateRef.current.inspectLookAt, 0.08);
                camera.lookAt(stateRef.current.currentInspectLookAt);
            }

            // 8) EKRANLARDA TINIMSIZ MAHSULOT RASMLARI SKROL BO'LISHI (GPU UV SCROLL)
            for (let i = 0; i < scrollingTextures.length; i++) {
                scrollingTextures[i].offset.y += 0.0006;
            }

            // 9) Hotspot suzishi
            const floatOffset = Math.sin(elapsed * 3.5) * 0.035;
            for (let i = 0; i < animatedHotspots.length; i++) {
                const { ring, core, standId, baseY } = animatedHotspots[i];
                const isNearby = stateRef.current.nearbyItemData?.stand.id === standId;
                ring.position.y = baseY + floatOffset;
                core.position.y = baseY + floatOffset;
                ring.rotation.z += 0.015;

                const targetScale = isNearby ? 1.35 : 1.0;
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
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            document.removeEventListener("pointerlockchange", handlePointerLockChange);

            cleanups.forEach((c) => c());
            stoneFloorTex.dispose();
            oakTex.dispose();
            greenGlowTex.dispose();
            renderer.dispose();
            scene.clear();
        };
    }, [initialProducts, handleSelectProduct, handleCloseOverlay, handleSelectZone, lang, t]);

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#F5F5F7] select-none font-sans">
            {/* 3D Canvas Conteyneri */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />

            {/* O'YIN MARKAZIY CROSSHAIR (GTA RETICLE) */}
            {!selectedProduct && (
                <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
                    <div
                        className={`flex items-center justify-center rounded-full transition-all duration-150 ${
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
                                {nearbyItem.product.price?.toLocaleString("uz-UZ")} so&apos;m • {lang === "ru" ? "Осмотреть и купить" : "Ko'rish va xarid"}
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
                        Showroom yuklanmoqda...
                    </span>
                </div>
            )}

            {/* Yuqori chap menyu: Chiqish tugmasi */}
            <div className="fixed top-6 left-6 z-30 flex items-center gap-3">
                <Link
                    href={`/${lang}`}
                    className="flex h-11 items-center gap-2.5 rounded-full border border-black/8 bg-white/90 px-4 text-xs font-semibold text-[#1d1d1f] shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:bg-white hover:scale-105 active:scale-95 ring-1 ring-black/5"
                >
                    <ArrowLeft size={16} />
                    <span>{t.showroom.backToShop}</span>
                </Link>
            </div>

            {/* Yuqori o'ng boshqaruv: Ovoz va Y-O'qi sozlamasi */}
            <div className="fixed top-6 right-6 z-30 flex items-center gap-2">
                <button
                    onClick={toggleInvertY}
                    className={`flex h-11 px-3.5 items-center justify-center rounded-full border text-xs font-bold transition-all shadow-sm backdrop-blur-xl ring-1 ring-black/5 ${
                        invertY
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-white/90 border-black/8 text-[#1d1d1f] hover:bg-white"
                    }`}
                    title={invertY ? "Invert Y: Yoqilgan (Yuqori/Past teskari)" : "Invert Y: O'chiq (Standart)"}
                >
                    Y: {invertY ? "REV" : "NORM"}
                </button>

                <button
                    onClick={toggleSound}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white/90 text-[#1d1d1f] shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-all hover:bg-white hover:scale-105 active:scale-95 ring-1 ring-black/5"
                    title={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
                >
                    {soundEnabled ? <Volume2 size={18} className="text-emerald-600" /> : <VolumeX size={18} className="text-[#86868b]" />}
                </button>
            </div>

            {/* O'yin qo'llanmasi (Boshqarish bo'yicha yo'riqnoma) */}
            <ShowroomControlsHelp lang={lang} invertY={invertY} onToggleInvertY={toggleInvertY} />

            {/* Pastki Navigatsiya Dock'i */}
            <NavigationDock
                activeZone={activeZone}
                lang={lang}
                onSelectZone={handleSelectZone}
            />

            {/* Mahsulot tafsilotlari kartasi */}
            <ProductDetailOverlay
                product={selectedProduct}
                lang={lang}
                onClose={handleCloseOverlay}
            />
        </div>
    );
}
