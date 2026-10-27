import * as THREE from "three";
import { Product } from "@/types";
import { ShowroomShowcaseStand } from "./showroom-data";

/**
 * Tasvirni CORS xatosiz yuklash uchun ichki Next.js rewrite proxy'ga yo'naltirish
 */
export function getSafeImageUrl(url?: string): string {
    if (!url) return "";
    if (url.startsWith("https://media.velari.uz/")) {
        return url.replace("https://media.velari.uz/", "/media-proxy/");
    }
    return url;
}

/**
 * Har qanday ekran o'lchami (mobil, planshet, kompyuter, VR) uchun buzilmas,
 * doimiy gorizontal ko'rish maydonini (HFOV ~ 80°) hisoblovchi funksiya.
 */
export function calculateResponsiveCameraFov(width: number, height: number): number {
    const aspect = width / height;
    const baseHFovRad = (80 * Math.PI) / 180; // 80 daraja gorizontal ko'rish burchagi

    if (aspect >= 1.0) {
        // Landscape (Desktop, iPad landscape): Standart 58 daraja vFOV
        return 58;
    }

    // Portrait (Mobil telefonlar): Aspect kichrayganda vFOV ni dinamik kengaytirish
    // vFOV = 2 * atan( tan(hFOV / 2) / aspect )
    const vFovRad = 2 * Math.atan(Math.tan(baseHFovRad / 2) / aspect);
    const vFovDeg = (vFovRad * 180) / Math.PI;

    // Telefonlarda haddan tashqari cho'zilishni oldini olish uchun [55..85] chegarasida ushlaymiz
    return Math.max(55, Math.min(85, vFovDeg));
}

/**
 * Yuqori unumdorlikka ega (512x256) Blonde Oak yog'och teksturasi
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
 * Tutqich tagidagi yoyilgan yashil nur teksturasi
 */
function createRadialGreenGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
    grad.addColorStop(0, "rgba(16, 185, 129, 0.90)");
    grad.addColorStop(0.35, "rgba(16, 185, 129, 0.50)");
    grad.addColorStop(0.7, "rgba(5, 150, 105, 0.20)");
    grad.addColorStop(1, "rgba(5, 150, 105, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Shaffof shisha ekran ustida faqat bitta mahsulot tasviri, nomi va narxini chizish.
 * Ekranning orqa foni 100% shaffof shisha bo'lib turadi!
 */
export function createSingleProductGlassTexture(
    product: Product,
    categoryTitle: string,
    lang: "uz" | "ru"
): { texture: THREE.CanvasTexture; cleanup: () => void } {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;

    if (!ctx) return { texture, cleanup: () => {} };

    const name = lang === "ru" ? (product.name_ru || product.name) : (product.name_uz || product.name);
    const price = product.price || 0;
    const oldPrice = product.oldPrice || (product as any).old_price;

    const render = (img: HTMLImageElement | null) => {
        // 1. Orqa fonni tozalash — Shaffof oyna effekti!
        ctx.clearRect(0, 0, 512, 768);

        // 2. Yengil shaffof shisha tebranishi (Very subtle frosted glass tint)
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.roundRect(16, 16, 480, 736, 24);
        ctx.fill();

        // Nozik zumrad neon hoshiya (Subtle glowing frame)
        ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 3. Shisha tepasidagi yaltiroqlik (Glass reflection highlight)
        const glossGrad = ctx.createLinearGradient(0, 16, 0, 180);
        glossGrad.addColorStop(0, "rgba(255, 255, 255, 0.18)");
        glossGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
        ctx.fillStyle = glossGrad;
        ctx.beginPath();
        ctx.roundRect(18, 18, 476, 140, [22, 22, 0, 0]);
        ctx.fill();

        // 4. Toifa nishoni (Yuqorida)
        ctx.fillStyle = "rgba(6, 78, 59, 0.70)";
        ctx.beginPath();
        ctx.roundRect(32, 34, 240, 34, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#6ee7b7";
        ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
        ctx.fillText(categoryTitle.toUpperCase(), 44, 56);

        // Jonli holat nuqtasi
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(466, 50, 6, 0, Math.PI * 2);
        ctx.fill();

        // 5. Mahsulot fotosurati (Markazda, soya bilan shishada suzib turadi)
        const imgAreaX = 46;
        const imgAreaY = 90;
        const imgAreaW = 420;
        const imgAreaH = 380;

        if (img && img.complete && img.naturalWidth > 0) {
            const scale = Math.min(imgAreaW / img.naturalWidth, imgAreaH / img.naturalHeight) * 0.92;
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            const dx = imgAreaX + (imgAreaW - dw) / 2;
            const dy = imgAreaY + (imgAreaH - dh) / 2;

            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
            ctx.shadowBlur = 24;
            ctx.shadowOffsetY = 8;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
            ctx.beginPath();
            ctx.roundRect(imgAreaX + 20, imgAreaY + 20, imgAreaW - 40, imgAreaH - 40, 20);
            ctx.fill();

            ctx.fillStyle = "#34d399";
            ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("VELARI PREMIUM", 256, imgAreaY + 180);
            ctx.font = "14px system-ui";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Original Retail Edition", 256, imgAreaY + 210);
            ctx.textAlign = "left";
        }

        // 6. Mahsulot nomi (Oq yorqin matn, shishada aniq o'qilishi uchun)
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.beginPath();
        ctx.roundRect(28, 490, 456, 76, 14);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;

        const words = (name || "").split(" ");
        let line1 = "";
        let line2 = "";
        for (const w of words) {
            if ((line1 + " " + w).length < 28) {
                line1 += (line1 ? " " : "") + w;
            } else if ((line2 + " " + w).length < 32) {
                line2 += (line2 ? " " : "") + w;
            }
        }
        if (!line2 && words.length > 4) line2 = words.slice(line1.split(" ").length).join(" ");
        if (line2.length > 34) line2 = line2.slice(0, 31) + "...";

        ctx.fillText(line1, 44, 524);
        if (line2) {
            ctx.fillText(line2, 44, 550);
        }
        ctx.shadowBlur = 0;

        // 7. Ekranni tagidagi narx va tugma plashkasi
        const priceBoxY = 582;
        ctx.fillStyle = "rgba(6, 78, 59, 0.75)";
        ctx.beginPath();
        ctx.roundRect(28, priceBoxY, 456, 140, 18);
        ctx.fill();
        ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Yorug'lik nuri chizig'i
        const glowLine = ctx.createLinearGradient(28, priceBoxY, 484, priceBoxY);
        glowLine.addColorStop(0, "rgba(52, 211, 153, 0)");
        glowLine.addColorStop(0.5, "rgba(52, 211, 153, 0.9)");
        glowLine.addColorStop(1, "rgba(52, 211, 153, 0)");
        ctx.fillStyle = glowLine;
        ctx.fillRect(28, priceBoxY, 456, 2);

        // "NARX" yozuvi
        ctx.fillStyle = "#a7f3d0";
        ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
        ctx.fillText(lang === "ru" ? "ЦЕНА ОНЛАЙН" : "MAXSUS NARX", 46, priceBoxY + 32);

        // Asosiy narx
        ctx.fillStyle = "#34d399";
        ctx.font = "900 28px system-ui, -apple-system, sans-serif";
        ctx.fillText(`${price.toLocaleString("uz-UZ")} SO'M`, 46, priceBoxY + 70);

        // Eski narx (agar chegirma bo'lsa)
        if (oldPrice && oldPrice > price) {
            ctx.fillStyle = "#9ca3af";
            ctx.font = "600 15px system-ui";
            const oldText = `${oldPrice.toLocaleString("uz-UZ")} so'm`;
            ctx.fillText(oldText, 46, priceBoxY + 104);

            const oldW = ctx.measureText(oldText).width;
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(44, priceBoxY + 99);
            ctx.lineTo(46 + oldW + 4, priceBoxY + 99);
            ctx.stroke();
        }

        // "[ E ] KO'RISH" interaktiv tugmasi
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.roundRect(330, priceBoxY + 38, 134, 52, 14);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(lang === "ru" ? "ВИТРИНА" : "KO'RISH", 397, priceBoxY + 70);
        ctx.textAlign = "left";

        texture.needsUpdate = true;
    };

    // Placeholder tezkor render
    render(null);

    // Mahsulot rasmini yuklash
    let active = true;
    if (product.image) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = getSafeImageUrl(product.image);
        img.onload = () => {
            if (active) render(img);
        };
        img.onerror = () => {
            if (!active) return;
            const fallback = new Image();
            fallback.src = product.image;
            fallback.onload = () => {
                if (active) render(fallback);
            };
        };
    }

    return {
        texture,
        cleanup: () => {
            active = false;
            texture.dispose();
        }
    };
}

/**
 * 3D Shaffof Shishali Ekran, Titanyum Bo'yin va Yashil Yoyilgan Taglik Meshi
 */
function createShowcaseScreenMesh(
    stand: ShowroomShowcaseStand,
    glassTex: THREE.CanvasTexture,
    greenGlowTex: THREE.CanvasTexture
): THREE.Group {
    const group = new THREE.Group();
    group.position.set(...stand.position);
    group.rotation.y = stand.rotationY;

    // 1. STOL USTIDAGI YOYILGAN YASHIL NUR DISKI
    const glowMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 0.85),
        new THREE.MeshBasicMaterial({
            map: greenGlowTex,
            transparent: true,
            opacity: 0.70,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.y = 0.005;
    group.add(glowMesh);

    // 2. METALL ZUMRAD TAGLIK (Pedestal footplate)
    const footMat = new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        metalness: 0.85,
        roughness: 0.25
    });
    const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 0.024, 32),
        footMat
    );
    foot.position.y = 0.012;
    foot.castShadow = true;
    foot.receiveShadow = true;
    group.add(foot);

    // 3. YASHIL TITANYUM BO'YIN / TUTQICH
    const bracketMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        metalness: 0.88,
        roughness: 0.18
    });
    const stem = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.20, 0.05),
        bracketMat
    );
    stem.position.set(0, 0.11, -0.01);
    stem.castShadow = true;
    group.add(stem);

    const clamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.035, 0.055),
        bracketMat
    );
    clamp.position.set(0, 0.20, 0);
    group.add(clamp);

    // 4. SHAFSHOF RANGSIZ SHISHALI EKRAN (Crystal Transparent Glass Panel)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.70, 0);
    screenGroup.rotation.x = -0.12; // Ergonomik ~7° orqaga egilish

    // A) Shaffof shisha korpusi (See-through clear glass slab)
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.30,
        roughness: 0.04,
        metalness: 0.08,
        side: THREE.DoubleSide
    });
    const glassBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.70, 1.02, 0.016),
        glassMat
    );
    glassBody.castShadow = true;
    screenGroup.add(glassBody);

    // B) Shisha chetidagi nozik to'q grafit ramka
    const bezelMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.3
    });
    const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 1.04, 0.012),
        bezelMat
    );
    bezel.position.z = -0.003;
    screenGroup.add(bezel);

    // C) Displey yuzasi (Tekstura shaffof shisha ustida)
    const displayMat = new THREE.MeshBasicMaterial({
        map: glassTex,
        transparent: true,
        opacity: 0.98,
        side: THREE.FrontSide
    });
    const displayFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.66, 0.98),
        displayMat
    );
    displayFace.position.z = 0.010;
    screenGroup.add(displayFace);

    group.add(screenGroup);
    return group;
}

export interface HotspotAnimationData {
    ring: THREE.Mesh;
    core: THREE.Mesh;
    standId: string;
    baseY: number;
}

export class ShowroomWorld {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public interactiveMeshes: THREE.Object3D[] = [];
    public hotspots: HotspotAnimationData[] = [];
    public cleanups: (() => void)[] = [];

    private stoneFloorTex: THREE.CanvasTexture;
    private oakTex: THREE.CanvasTexture;
    private greenGlowTex: THREE.CanvasTexture;

    constructor(container: HTMLElement, stands: ShowroomShowcaseStand[], lang: "uz" | "ru", categoryTitles: {
        trimmers: string;
        hairCare: string;
        shavers: string;
        gadgets: string;
    }) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. SAHNA & KAMERA (Dinamik Responsive FOV bilan)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF5F5F7);
        this.scene.fog = new THREE.FogExp2(0xF5F5F7, 0.020);

        const initialFov = calculateResponsiveCameraFov(width, height);
        this.camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 60);
        this.camera.position.set(0, 1.65, 8.5);

        // 2. RENDERER (Optimizatsiya qilingan GPU pipeline)
        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: false,
            stencil: false,
            depth: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate = false;

        container.appendChild(this.renderer.domElement);

        // 3. YORUG'LIK O'RNATILISHI (Studiya yorug'ligi)
        this.setupLighting();

        // 4. ME'MORCHILIK: POL, SHIFT, DEVORLAR
        this.stoneFloorTex = createStoneFloorTexture();
        this.oakTex = createOakWoodTexture();
        this.greenGlowTex = createRadialGreenGlowTexture();
        this.setupArchitecture();

        // 5. BLONDE OAK STOLLAR (Apple Store uslubidagi 4 ta katta eman stol)
        this.setupTables(categoryTitles);

        // 6. 24 TA SHAFSHOF SHISHA EKRANLI VITRINA STENDLARI (2 TARAFLAMA)
        this.setupStands(stands, lang);

        // Boshlang'ich soyalarni yangilash
        this.renderer.shadowMap.needsUpdate = true;
    }

    private setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.85);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
        sunLight.position.set(6, 14, 7);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 1.0;
        sunLight.shadow.camera.far = 30;
        sunLight.shadow.camera.left = -12;
        sunLight.shadow.camera.right = 12;
        sunLight.shadow.camera.top = 12;
        sunLight.shadow.camera.bottom = -12;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        const windowFillLight = new THREE.DirectionalLight(0xe5f1fc, 0.8);
        windowFillLight.position.set(0, 6, -14);
        this.scene.add(windowFillLight);

        // 4 ta stol ustidagi studiya nuqtaviy chiroqlari
        const spotCoords: [number, number, number][] = [
            [-5.5, 4.0, -0.5],
            [0.0, 4.0, -4.5],
            [5.5, 4.0, -0.5],
            [0.0, 4.0, 3.5]
        ];
        spotCoords.forEach(([x, y, z]) => {
            const spot = new THREE.PointLight(0xfff6ea, 1.25, 9, 2);
            spot.position.set(x, y, z);
            this.scene.add(spot);
        });
    }

    private setupArchitecture() {
        // Pol (Pietra Serena toshi)
        const floorMat = new THREE.MeshStandardMaterial({
            map: this.stoneFloorTex,
            roughness: 0.85,
            metalness: 0.05
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Shift
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0xfcfcfd,
            roughness: 0.95
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 5.2;
        this.scene.add(ceiling);

        // Shift LED chiroq lentalari
        const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-6, -2, 2, 6].forEach((xPos) => {
            const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 20), lightStripMat);
            strip.rotation.x = Math.PI / 2;
            strip.position.set(xPos, 5.18, 0);
            this.scene.add(strip);
        });

        // Devorlar
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F7, roughness: 0.9 });

        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        backWall.position.set(0, 2.6, -13);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        leftWall.position.set(-13, 2.6, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.2), wallMat);
        rightWall.position.set(13, 2.6, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Panoramik old fasad oynasi
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
        this.scene.add(frontWall);
    }

    private setupTables(categoryTitles: {
        trimmers: string;
        hairCare: string;
        shavers: string;
        gadgets: string;
    }) {
        const tableOakMat = new THREE.MeshStandardMaterial({
            map: this.oakTex,
            roughness: 0.42,
            metalness: 0.05
        });

        const createPodium = (x: number, z: number, title: string) => {
            const podiumGroup = new THREE.Group();
            podiumGroup.position.set(x, 0, z);

            // Stol ustki qoplamasi: 4.2m uzunlik, 1.6m kenglik (2 taraflama stendlar sig'ishi uchun)
            const topMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.6), tableOakMat);
            topMesh.position.y = 0.85;
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            podiumGroup.add(topMesh);

            // 4 ta mustahkam eman oyoqlari
            const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
            [
                [-1.85, -0.62],
                [1.85, -0.62],
                [-1.85, 0.62],
                [1.85, 0.62]
            ].forEach(([lx, lz]) => {
                const legMesh = new THREE.Mesh(legGeo, tableOakMat);
                legMesh.position.set(lx, 0.425, lz);
                legMesh.castShadow = true;
                legMesh.receiveShadow = true;
                podiumGroup.add(legMesh);
            });

            // Stol oldidagi toifa nishoni
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 300;
            badgeCanvas.height = 70;
            const bctx = badgeCanvas.getContext("2d");
            if (bctx) {
                bctx.fillStyle = "rgba(255, 255, 255, 0.94)";
                bctx.roundRect(0, 0, 300, 70, 16);
                bctx.fill();
                bctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
                bctx.lineWidth = 3.0;
                bctx.stroke();

                bctx.fillStyle = "#064e3b";
                bctx.font = "bold 22px system-ui, -apple-system, sans-serif";
                bctx.textAlign = "center";
                bctx.textBaseline = "middle";
                bctx.fillText(title, 150, 35);
            }
            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badge = new THREE.Mesh(
                new THREE.PlaneGeometry(0.85, 0.20),
                new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
            );
            badge.position.set(0, 0.85, 0.82);
            podiumGroup.add(badge);

            this.scene.add(podiumGroup);
        };

        // 4 ta toifaviy stol
        createPodium(-5.5, -0.5, categoryTitles.trimmers);
        createPodium(0.0, -4.5, categoryTitles.hairCare);
        createPodium(5.5, -0.5, categoryTitles.shavers);
        createPodium(0.0, 3.5, categoryTitles.gadgets);
    }

    private setupStands(stands: ShowroomShowcaseStand[], lang: "uz" | "ru") {
        stands.forEach((stand) => {
            const catTitle = lang === "ru" ? stand.categoryTitleRu : stand.categoryTitleUz;
            const { texture: glassTex, cleanup } = createSingleProductGlassTexture(stand.product, catTitle, lang);
            this.cleanups.push(cleanup);

            // 3D Shaffof shisha ekran va taglik
            const screenMesh = createShowcaseScreenMesh(stand, glassTex, this.greenGlowTex);
            this.scene.add(screenMesh);

            // Interaktiv hitbox (Nishonga olish uchun)
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(0.80, 1.25, 0.45),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.set(stand.position[0], stand.position[1] + 0.65, stand.position[2]);
            hitbox.userData = {
                isHotspot: true,
                standId: stand.id,
                itemData: { stand, product: stand.product }
            };
            this.scene.add(hitbox);
            this.interactiveMeshes.push(hitbox);

            // Shisha ekran ustidagi suzuvchi zumrad indikator halqasi
            const hotspotGroup = new THREE.Group();
            hotspotGroup.position.set(stand.position[0], stand.position[1] + 1.42, stand.position[2]);

            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.11, 0.012, 12, 24),
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
                new THREE.SphereGeometry(0.030, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x059669 })
            );
            hotspotGroup.add(core);

            this.hotspots.push({
                ring,
                core,
                standId: stand.id,
                baseY: stand.position[1] + 1.42
            });

            this.scene.add(hotspotGroup);
        });
    }

    /**
     * Ekran o'lchami o'zgarganda (yoki telefon o'girilganda) kamera va rendererni yangilash
     */
    public handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.fov = calculateResponsiveCameraFov(width, height);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        this.renderer.shadowMap.needsUpdate = true;
    }

    /**
     * Kadr animatsiyasi (Suzuvchi hotspotlar va b.)
     */
    public update(elapsed: number, nearbyStandId?: string) {
        const floatOffset = Math.sin(elapsed * 3.5) * 0.032;
        for (let i = 0; i < this.hotspots.length; i++) {
            const { ring, core, standId, baseY } = this.hotspots[i];
            const isTargeted = nearbyStandId === standId;
            ring.position.y = baseY + floatOffset;
            core.position.y = baseY + floatOffset;
            ring.rotation.z += 0.015;

            const targetScale = isTargeted ? 1.35 : 1.0;
            ring.scale.set(targetScale, targetScale, targetScale);
        }
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public dispose() {
        this.cleanups.forEach((c) => c());
        this.stoneFloorTex.dispose();
        this.oakTex.dispose();
        this.greenGlowTex.dispose();
        this.renderer.dispose();
        this.scene.clear();
    }
}
