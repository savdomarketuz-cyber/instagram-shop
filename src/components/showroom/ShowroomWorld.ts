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
 * Har qanday ekran o'lchami (mobil, planshet, kompyuter, VR) uchun doimiy gorizontal ko'rish maydoni (HFOV ~ 80°)
 */
export function calculateResponsiveCameraFov(width: number, height: number): number {
    const aspect = width / height;
    const baseHFovRad = (80 * Math.PI) / 180;
    if (aspect >= 1.0) {
        return 58;
    }
    const vFovRad = 2 * Math.atan(Math.tan(baseHFovRad / 2) / aspect);
    const vFovDeg = (vFovRad * 180) / Math.PI;
    return Math.max(55, Math.min(85, vFovDeg));
}

/**
 * TO'Q YONG'OQ (DARK WALNUT) LAKLANGAN PREMIUM YOG'OCH TEKSTURASI
 */
function createDarkWalnutTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, "#22160F");
    grad.addColorStop(0.3, "#2F1E14");
    grad.addColorStop(0.6, "#26170E");
    grad.addColorStop(0.85, "#382419");
    grad.addColorStop(1.0, "#2B1B12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    for (let y = 0; y < 256; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        let curY = y;
        const alpha = 0.08 + Math.random() * 0.12;
        ctx.strokeStyle = Math.random() > 0.5 ? `rgba(15, 9, 5, ${alpha})` : `rgba(75, 48, 32, ${alpha * 0.7})`;
        ctx.lineWidth = 1.0;

        for (let x = 0; x <= 512; x += 32) {
            curY += (Math.random() - 0.5) * 1.4;
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
 * YURISHNI ANIQ HIS QILDIRUVCHI KONTRASTLI 1.2m x 1.2m PLITKALI POL TEKSTURASI
 */
function createContrastingFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Asosiy zamonaviy och-kulrang tosh
    ctx.fillStyle = "#E4E1D8";
    ctx.fillRect(0, 0, 512, 512);

    // Tosh tolalari
    for (let i = 0; i < 3500; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const s = Math.random() * 2;
        const a = Math.random() * 0.10;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(140, 135, 125, ${a})` : `rgba(255, 255, 255, ${a * 1.5})`;
        ctx.fillRect(x, y, s, s);
    }

    // YURGANDA ANIQ SILJISHI KO'RINADIGAN TO'Q ANTRATSIT CHOKLAR
    ctx.strokeStyle = "rgba(65, 70, 80, 0.75)";
    ctx.lineWidth = 4.0;

    for (let y = 0; y <= 512; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    for (let x = 0; x <= 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
    }

    // Plita chetidagi nozik soya beveli (3D qabariq hissi)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.5;
    for (let y = 3; y <= 512; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(7, 7);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    return tex;
}

/**
 * KO'CHA ASFALT VA OQ YO'L CHIZIQLARI TEKSTURASI
 */
function createStreetAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = "#1E2024"; // Qora-kulrang asfalt
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(45, 48, 55, 0.5)" : "rgba(10, 12, 15, 0.5)";
        ctx.fillRect(x, y, 2, 2);
    }

    // Yo'ldagi oq ajratuvchi chiziq
    ctx.fillStyle = "rgba(240, 240, 245, 0.85)";
    ctx.fillRect(240, 40, 32, 140);
    ctx.fillRect(240, 320, 32, 140);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * Yashil nurli taglik diski teksturasi
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
 * 3x4 EKRAN UCHUN TO'LIQ RASMLI TINIQ TEXTURE (UZIQDAN HAM TINIQ ANISOTROPY BILAN)
 */
export function create3x4ProductImageTexture(
    images: string[]
): {
    texture: THREE.CanvasTexture;
    updateImage: (index: number) => void;
    dispose: () => void;
} {
    const canvas = document.createElement("canvas");
    canvas.width = 768; // 3:4 aspect ratio (768 x 1024)
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8; // Uzoqdan xira ko'rinmasligi uchun yuqori darajadagi anisotropy!

    const loadedImgs: (HTMLImageElement | null)[] = images.map(() => null);
    let currentIndex = 0;
    let isDisposed = false;

    const render = (img: HTMLImageElement | null) => {
        if (!ctx || isDisposed) return;
        ctx.clearRect(0, 0, 768, 1024);

        // 1. Shaffof shisha orqa fon
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.beginPath();
        ctx.roundRect(12, 12, 744, 1000, 28);
        ctx.fill();

        // Nozik zumrad hoshiya
        ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // 2. Mahsulot fotosurati — TO'LIQ 3x4 EKRANDA (Ortiqcha yozuvlarsiz!)
        if (img && img.complete && img.naturalWidth > 0) {
            const pad = 24;
            const targetW = 768 - pad * 2;
            const targetH = 1024 - pad * 2;
            const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight) * 0.96;
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            const dx = (768 - dw) / 2;
            const dy = (1024 - dh) / 2;

            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
            ctx.shadowBlur = 32;
            ctx.shadowOffsetY = 12;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        } else {
            // Zamonaviy placeholder
            ctx.fillStyle = "#10b981";
            ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("VELARI RETAIL", 384, 512);
            ctx.font = "18px system-ui";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Yuklanmoqda...", 384, 552);
        }

        // Ko'p rasmli bo'lsa pastda kichik dots ko'rsatkichi
        if (images.length > 1) {
            const dotY = 990;
            const totalDots = Math.min(images.length, 5);
            const startX = 384 - ((totalDots - 1) * 16) / 2;
            for (let i = 0; i < totalDots; i++) {
                ctx.fillStyle = i === currentIndex % totalDots ? "#10b981" : "rgba(255, 255, 255, 0.35)";
                ctx.beginPath();
                ctx.arc(startX + i * 16, dotY, i === currentIndex % totalDots ? 5 : 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        texture.needsUpdate = true;
    };

    // Boshlang'ich render
    render(null);

    // Rasmlarni yuklash
    images.forEach((url, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = getSafeImageUrl(url);
        img.onload = () => {
            if (isDisposed) return;
            loadedImgs[i] = img;
            if (i === currentIndex) {
                render(img);
            }
        };
        img.onerror = () => {
            if (isDisposed) return;
            const fb = new Image();
            fb.src = url;
            fb.onload = () => {
                if (isDisposed) return;
                loadedImgs[i] = fb;
                if (i === currentIndex) render(fb);
            };
        };
    });

    const updateImage = (index: number) => {
        if (isDisposed || images.length === 0) return;
        currentIndex = index % images.length;
        render(loadedImgs[currentIndex]);
    };

    return {
        texture,
        updateImage,
        dispose: () => {
            isDisposed = true;
            texture.dispose();
        }
    };
}

/**
 * 3x4 EKRAN TAGIDAGI ALOHIDA BO'RTIB CHIQQAN ELEKTRON NARX PLASHKASI TEKSTURASI (ESKI VA YANGI NARX)
 */
function createProtrudingPriceTexture(
    price: number,
    oldPrice?: number
): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 8;

    if (!ctx) return texture;

    // To'q qora-yashil metall OLED korpusi
    ctx.fillStyle = "rgba(8, 14, 20, 0.96)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 20);
    ctx.fill();

    // Zumrad hoshiya
    ctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Yuqori nozik nur chizig'i
    const gloss = ctx.createLinearGradient(8, 8, 504, 8);
    gloss.addColorStop(0, "rgba(52, 211, 153, 0)");
    gloss.addColorStop(0.5, "rgba(52, 211, 153, 0.95)");
    gloss.addColorStop(1, "rgba(52, 211, 153, 0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(8, 8, 496, 3);

    // Asosiy Yangi Narx (Katta, o'ta tiniq o'qiladigan yashil font)
    ctx.fillStyle = "#34d399";
    ctx.font = "900 42px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${price.toLocaleString("uz-UZ")} SO'M`, 256, oldPrice && oldPrice > price ? 74 : 94);

    // Eski Narx (qizil chiziq bilan chizilgan)
    if (oldPrice && oldPrice > price) {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "600 24px system-ui, -apple-system, sans-serif";
        const oldText = `${oldPrice.toLocaleString("uz-UZ")} so'm`;
        ctx.fillText(oldText, 256, 122);

        const oldW = ctx.measureText(oldText).width;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(256 - oldW / 2 - 4, 114);
        ctx.lineTo(256 + oldW / 2 + 4, 114);
        ctx.stroke();
    }

    texture.needsUpdate = true;
    return texture;
}

/**
 * DEVORDAGI KATTA 3:4 FORMATDAGI RAQAMLI REKLAMA BILLBORDI TEKSTURASI
 */
function createWallBillboardTexture(
    products: Product[],
    label: string
): { texture: THREE.CanvasTexture; update: () => void; dispose: () => void } {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.anisotropy = 8;

    let currentIndex = 0;
    let isDisposed = false;

    const render = () => {
        if (!ctx || isDisposed) return;
        ctx.clearRect(0, 0, 768, 1024);

        // Reklama korpusi
        ctx.fillStyle = "#0c1017";
        ctx.fillRect(0, 0, 768, 1024);

        // Ramka
        ctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, 744, 1000);

        // Brend sarlavhasi
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
        ctx.fillText("VELARI FLAGSHIP STORE", 40, 70);

        ctx.fillStyle = "#ffffff";
        ctx.font = "900 44px system-ui, -apple-system, sans-serif";
        ctx.fillText(label.toUpperCase(), 40, 130);

        // Tovar rasmi
        const p = products[currentIndex % products.length];
        if (p && p.image) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = getSafeImageUrl(p.image);
            img.onload = () => {
                if (isDisposed) return;
                const scale = Math.min(680 / img.naturalWidth, 680 / img.naturalHeight);
                const dw = img.naturalWidth * scale;
                const dh = img.naturalHeight * scale;
                ctx.drawImage(img, (768 - dw) / 2, 220 + (600 - dh) / 2, dw, dh);

                // Mahsulot narxi va nomi
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 32px system-ui";
                ctx.textAlign = "center";
                ctx.fillText(p.name_uz || p.name, 384, 880);

                ctx.fillStyle = "#34d399";
                ctx.font = "900 42px system-ui";
                ctx.fillText(`${(p.price || 0).toLocaleString("uz-UZ")} SO'M`, 384, 940);
                ctx.textAlign = "left";

                texture.needsUpdate = true;
            };
        }

        texture.needsUpdate = true;
    };

    render();

    return {
        texture,
        update: () => {
            if (isDisposed) return;
            currentIndex++;
            render();
        },
        dispose: () => {
            isDisposed = true;
            texture.dispose();
        }
    };
}

export interface ShowcaseController {
    stand: ShowroomShowcaseStand;
    mesh: THREE.Group;
    updateImage: (idx: number) => void;
    currentSlide: number;
    slideTimer: number;
    dispose: () => void;
}

export class ShowroomWorld {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public interactiveMeshes: THREE.Object3D[] = [];
    public showcases: ShowcaseController[] = [];
    public cleanups: (() => void)[] = [];

    private floorTex: THREE.CanvasTexture;
    private darkWalnutTex: THREE.CanvasTexture;
    private streetTex: THREE.CanvasTexture;
    private greenGlowTex: THREE.CanvasTexture;

    // Wall Billboards
    private billboard1Update?: () => void;
    private billboard2Update?: () => void;
    private billboardTimer = 0;

    constructor(
        container: HTMLElement,
        stands: ShowroomShowcaseStand[],
        lang: "uz" | "ru",
        allProducts: Product[]
    ) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. SAHNA & KAMERA (Responsive HFOV)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0e1117); // Shahar osmoni / tungi zamonaviy
        this.scene.fog = new THREE.FogExp2(0x0e1117, 0.016);

        const initialFov = calculateResponsiveCameraFov(width, height);
        this.camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 75);
        this.camera.position.set(0, 1.65, 9.2);

        // 2. RENDERER (Yumshoq soyalar va yuqori unumdorlik)
        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: true,
            stencil: false,
            depth: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Yumshoq realistik soyalar

        container.appendChild(this.renderer.domElement);

        // 3. TEKSTURALAR
        this.floorTex = createContrastingFloorTexture();
        this.darkWalnutTex = createDarkWalnutTexture();
        this.streetTex = createStreetAsphaltTexture();
        this.greenGlowTex = createRadialGreenGlowTexture();

        // 4. YORUG'LIK VA SOYALAR (Chiroqqa to'liq bo'ysunuvchi to'g'ri proyeksiyalar)
        this.setupLighting();

        // 5. DO'KON ME'MORCHILIGI: POL, QORA SHIFT, 45° KROSSOVER CHIPROQLAR
        this.setupArchitecture();

        // 6. TASHQI KO'CHA, BINO FASADI VA VELARI 3D NEON LOGO
        this.setupExteriorStreet();

        // 7. TO'Q YONG'OQ STOLLAR (8 TA KENGAYTIRILGAN STOL)
        this.setupTables();

        // 8. 48 TA 3x4 EKRANLI VITRINA VA BO'RTIB CHIQQAN NARX PLASHKASI
        this.setupShowcaseStands(stands);

        // 9. DEVORDAGI KATTA 3:4 RAQAMLI REKLAMA BILLBORDLARI
        this.setupWallBillboards(allProducts);
    }

    private setupLighting() {
        // Yumshoq ambient fon
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        // Asosiy quyosh/zal yoritgichi (Aniq pastga tushuvchi vertikal soya)
        const mainLight = new THREE.DirectionalLight(0xfff8eb, 1.8);
        mainLight.position.set(0, 12, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 1.0;
        mainLight.shadow.camera.far = 28;
        mainLight.shadow.camera.left = -16;
        mainLight.shadow.camera.right = 16;
        mainLight.shadow.camera.top = 16;
        mainLight.shadow.camera.bottom = -16;
        mainLight.shadow.bias = -0.0004;
        mainLight.shadow.radius = 2.5; // Yumshoq soya chegarasi
        this.scene.add(mainLight);

        // Ko'cha yoritgichi
        const streetLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
        streetLight.position.set(0, 10, 22);
        streetLight.castShadow = true;
        streetLight.shadow.mapSize.width = 1024;
        streetLight.shadow.mapSize.height = 1024;
        streetLight.shadow.camera.left = -18;
        streetLight.shadow.camera.right = 18;
        streetLight.shadow.camera.top = 18;
        streetLight.shadow.camera.bottom = -18;
        this.scene.add(streetLight);

        // Stollar ustidagi nuqtaviy studiya chiroqlari
        const spotPositions = [
            [-5.5, 4.4, 1.0],
            [-5.5, 4.4, -4.5],
            [5.5, 4.4, 1.0],
            [5.5, 4.4, -4.5],
            [0.0, 4.4, -1.5],
            [0.0, 4.4, -7.0]
        ];
        spotPositions.forEach(([x, y, z]) => {
            const spot = new THREE.PointLight(0xfff3db, 1.1, 8.5, 2);
            spot.position.set(x, y, z);
            this.scene.add(spot);
        });
    }

    private setupArchitecture() {
        // 1. POL — Kontrastli, yurish yaqqol seziladigan 1.2m x 1.2m plitalar
        const floorMat = new THREE.MeshStandardMaterial({
            map: this.floorTex,
            roughness: 0.55,
            metalness: 0.12
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, 0); // Z: -12 .. +12
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. SHIFT — TEKIS MAT QORA (APPLE / TESLA USLUBIDA)
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x0c0e12,
            roughness: 0.96
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(30, 24), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 5.2, 0);
        this.scene.add(ceiling);

        // 3. SHIFTDA 45 GRADUS BURCHAKDA BIR-BIRIGA QARAMA-QARSHI UZUNCHOQ CHIROQLAR (CHEVRON LED ARRAYS)
        const ledStripMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.2,
            roughness: 0.2
        });

        const lampHousingMat = new THREE.MeshStandardMaterial({
            color: 0x1a1d24,
            metalness: 0.8,
            roughness: 0.3
        });

        // 45° va -45° burchakda bir-birini kesib o'tuvchi xoch chiroqlar
        const createDiagonalFixture = (x: number, z: number, length: number, angleDeg: number) => {
            const fixtureGroup = new THREE.Group();
            fixtureGroup.position.set(x, 5.16, z);
            fixtureGroup.rotation.y = (angleDeg * Math.PI) / 180;

            const casing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, length), lampHousingMat);
            fixtureGroup.add(casing);

            const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, length - 0.08), ledStripMat);
            emitter.position.y = -0.04;
            fixtureGroup.add(emitter);

            this.scene.add(fixtureGroup);
        };

        // Zal bo'ylab simmetrik 45° diagonal chiroqlar
        [-8, 0, 8].forEach((xOffset) => {
            [-4, 3].forEach((zOffset) => {
                createDiagonalFixture(xOffset, zOffset, 9.5, 45);
                createDiagonalFixture(xOffset, zOffset, 9.5, -45);
            });
        });

        // 4. DEVORLAR
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x15181F, roughness: 0.85 });

        // Orqa devor
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 5.2), wallMat);
        backWall.position.set(0, 2.6, -12);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Chap devor
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.2), wallMat);
        leftWall.position.set(-15, 2.6, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // O'ng devor
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 5.2), wallMat);
        rightWall.position.set(15, 2.6, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // 5. OLD KIRISH FASADI VA OYNALI ESHIKLAR (Z: 11.0)
        // Chap va o'ng shisha devorlar, o'rtada keng ochiq shisha eshik o'tish joyi
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.22,
            roughness: 0.08,
            metalness: 0.15
        });

        // Chap fasad oynasi (-15 dan -3 gacha)
        const frontGlassLeft = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), glassMat);
        frontGlassLeft.position.set(-9, 2.6, 11.0);
        frontGlassLeft.rotation.y = Math.PI;
        this.scene.add(frontGlassLeft);

        // O'ng fasad oynasi (+3 dan +15 gacha)
        const frontGlassRight = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.2), glassMat);
        frontGlassRight.position.set(9, 2.6, 11.0);
        frontGlassRight.rotation.y = Math.PI;
        this.scene.add(frontGlassRight);

        // O'rtadagi avtomatik ochiluvchi shaffof oynali eshiklar (o'tish joyi -3 dan +3 gacha ochiq)
        const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.35, 0.2), doorFrameMat);
        doorHeader.position.set(0, 5.0, 11.0);
        this.scene.add(doorHeader);
    }

    private setupExteriorStreet() {
        // TASHQI KO'CHA ASFALTI (Z: 11.0 dan 36.0 gacha)
        const streetMat = new THREE.MeshStandardMaterial({
            map: this.streetTex,
            roughness: 0.88,
            metalness: 0.08
        });
        const street = new THREE.Mesh(new THREE.PlaneGeometry(48, 26), streetMat);
        street.rotation.x = -Math.PI / 2;
        street.position.set(0, -0.01, 23.5);
        street.receiveShadow = true;
        this.scene.add(street);

        // Piyodalar yo'lagi (Trotuar) do'kon oldida (Z: 11.0 dan 15.0 gacha)
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(34, 0.12, 4.0), sidewalkMat);
        sidewalk.position.set(0, 0.05, 13.0);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);

        // BINONING TASHQI FASADIDAGI VELARI 3D/NEON LOGOTIPI
        const logoGroup = new THREE.Group();
        logoGroup.position.set(0, 4.4, 11.15);

        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = 1024;
        logoCanvas.height = 256;
        const lctx = logoCanvas.getContext("2d");
        if (lctx) {
            lctx.fillStyle = "rgba(10, 15, 24, 0.95)";
            lctx.roundRect(16, 16, 992, 224, 36);
            lctx.fill();

            lctx.strokeStyle = "rgba(16, 185, 129, 0.85)";
            lctx.lineWidth = 6;
            lctx.stroke();

            // Katta yorqin "VELARI" logotipi
            lctx.fillStyle = "#ffffff";
            lctx.font = "900 110px system-ui, -apple-system, sans-serif";
            lctx.textAlign = "center";
            lctx.shadowColor = "#10b981";
            lctx.shadowBlur = 30;
            lctx.fillText("V E L A R I", 512, 135);

            lctx.fillStyle = "#34d399";
            lctx.font = "bold 26px system-ui, sans-serif";
            lctx.shadowBlur = 10;
            lctx.fillText("FLAGSHIP CONCEPT STORE", 512, 185);
        }
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        const logoSign = new THREE.Mesh(
            new THREE.PlaneGeometry(5.2, 1.3),
            new THREE.MeshStandardMaterial({ map: logoTex, emissive: 0x059669, emissiveIntensity: 0.4 })
        );
        logoGroup.add(logoSign);
        this.scene.add(logoGroup);

        // SHAHAR BINOLARI SILUETI (Exterior Skyline Buildings)
        const cityBuildingMat = new THREE.MeshStandardMaterial({
            color: 0x111622,
            roughness: 0.9,
            metalness: 0.1
        });
        const buildingPositions = [
            [-22, 10, 30, 8, 20, 8],
            [-12, 12, 34, 10, 24, 10],
            [12, 14, 34, 11, 28, 10],
            [22, 11, 30, 9, 22, 9]
        ];
        buildingPositions.forEach(([bx, by, bz, bw, bh, bd]) => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cityBuildingMat);
            b.position.set(bx, by, bz);
            this.scene.add(b);
        });

        // Ko'cha chiroq ustunlari
        [-8, 8].forEach((lx) => {
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.1, 4.5, 16),
                new THREE.MeshStandardMaterial({ color: 0x334155 })
            );
            pole.position.set(lx, 2.25, 14.8);
            this.scene.add(pole);

            const lampHead = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.15, 0.8),
                new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0 })
            );
            lampHead.position.set(lx, 4.5, 14.8);
            this.scene.add(lampHead);
        });
    }

    private setupTables() {
        // TO'Q YONG'OQ (DARK WALNUT) LAKLANGAN STOLLAR
        const tableMat = new THREE.MeshStandardMaterial({
            map: this.darkWalnutTex,
            roughness: 0.35,
            metalness: 0.08
        });

        const createPodium = (x: number, z: number, title: string) => {
            const podiumGroup = new THREE.Group();
            podiumGroup.position.set(x, 0, z);

            const topMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.6), tableMat);
            topMesh.position.y = 0.85;
            topMesh.castShadow = true;
            topMesh.receiveShadow = true;
            podiumGroup.add(topMesh);

            const legGeo = new THREE.BoxGeometry(0.24, 0.85, 0.24);
            [
                [-1.85, -0.62],
                [1.85, -0.62],
                [-1.85, 0.62],
                [1.85, 0.62]
            ].forEach(([lx, lz]) => {
                const legMesh = new THREE.Mesh(legGeo, tableMat);
                legMesh.position.set(lx, 0.425, lz);
                legMesh.castShadow = true;
                legMesh.receiveShadow = true;
                podiumGroup.add(legMesh);
            });

            // To'q yong'oq rangiga mos keluvchi to'q titan stol nishoni
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 320;
            badgeCanvas.height = 76;
            const bctx = badgeCanvas.getContext("2d");
            if (bctx) {
                bctx.fillStyle = "rgba(18, 24, 32, 0.94)";
                bctx.roundRect(0, 0, 320, 76, 16);
                bctx.fill();
                bctx.strokeStyle = "rgba(16, 185, 129, 0.75)";
                bctx.lineWidth = 3.0;
                bctx.stroke();

                bctx.fillStyle = "#34d399";
                bctx.font = "bold 24px system-ui, -apple-system, sans-serif";
                bctx.textAlign = "center";
                bctx.textBaseline = "middle";
                bctx.fillText(title, 160, 38);
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

        // 8 ta to'q yong'oq stollar
        createPodium(-5.5, 1.0, "Trimmerlar & Soch");
        createPodium(-5.5, -4.5, "Fenlar & Staylerlar");
        createPodium(5.5, 1.0, "Sheyverlar & Ustara");
        createPodium(5.5, -4.5, "Audio & Gadjetlar");
        createPodium(0.0, -1.5, "Velari Flagman To'plam");
        createPodium(0.0, -7.0, "Yangi Kolleksiya");
        createPodium(-10.5, -1.5, "Professional Seriya");
        createPodium(10.5, -1.5, "Gigiyena & Parvarish");
    }

    private setupShowcaseStands(stands: ShowroomShowcaseStand[]) {
        stands.forEach((stand) => {
            const showcaseGroup = new THREE.Group();
            showcaseGroup.position.set(...stand.position);
            showcaseGroup.rotation.y = stand.rotationY;

            // 1. Stol ustidagi yashil nur diski
            const glowMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.85, 0.85),
                new THREE.MeshBasicMaterial({
                    map: this.greenGlowTex,
                    transparent: true,
                    opacity: 0.65,
                    side: THREE.DoubleSide,
                    depthWrite: false
                })
            );
            glowMesh.rotation.x = -Math.PI / 2;
            glowMesh.position.y = 0.005;
            showcaseGroup.add(glowMesh);

            // 2. To'q metall oyoq va bo'yin
            const foot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.22, 0.024, 32),
                new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.9, roughness: 0.2 })
            );
            foot.position.y = 0.012;
            foot.castShadow = true;
            showcaseGroup.add(foot);

            const stem = new THREE.Mesh(
                new THREE.BoxGeometry(0.07, 0.20, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.9, roughness: 0.2 })
            );
            stem.position.set(0, 0.11, -0.01);
            showcaseGroup.add(stem);

            // 3. ASOSIY 3:4 SHAFSHOF SHISHA EKRAN (W: 0.84, H: 1.12 — NISBAT ANIQ 3:4)
            const screenGroup = new THREE.Group();
            screenGroup.position.set(0, 0.74, 0);
            screenGroup.rotation.x = -0.10; // Ergonomik orqaga egilish

            // A) Shaffof shisha plita
            const glassBody = new THREE.Mesh(
                new THREE.BoxGeometry(0.84, 1.12, 0.018),
                new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.25,
                    roughness: 0.04,
                    metalness: 0.08,
                    side: THREE.DoubleSide
                })
            );
            glassBody.castShadow = true;
            screenGroup.add(glassBody);

            // B) 3:4 Tovar Rasmlari Displeyi
            const { texture: displayTex, updateImage, dispose: texDispose } = create3x4ProductImageTexture(stand.images);
            this.cleanups.push(texDispose);

            const displayFace = new THREE.Mesh(
                new THREE.PlaneGeometry(0.80, 1.08),
                new THREE.MeshBasicMaterial({
                    map: displayTex,
                    transparent: true,
                    opacity: 0.98,
                    side: THREE.FrontSide
                })
            );
            displayFace.position.z = 0.011;
            screenGroup.add(displayFace);

            // 4. EKRAN TAGIDAGI ALOHIDA BO'RTIB CHIQQAN ELEKTRON NARX PLASHKASI (ESKI VA YANGI NARX)
            const priceTex = createProtrudingPriceTexture(stand.product.price, (stand.product as any).old_price || stand.product.oldPrice);
            this.cleanups.push(() => priceTex.dispose());

            const priceBox = new THREE.Mesh(
                new THREE.BoxGeometry(0.60, 0.18, 0.045),
                new THREE.MeshStandardMaterial({
                    map: priceTex,
                    roughness: 0.3,
                    metalness: 0.4
                })
            );
            priceBox.position.set(0, -0.62, 0.035); // Shisha tagidan alohida bo'rtib chiqqan
            screenGroup.add(priceBox);

            showcaseGroup.add(screenGroup);
            this.scene.add(showcaseGroup);

            // 5. INTERAKTIV HITBOX (Faqat to'g'ridan-to'g'ri bosilganda ochilishi uchun)
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(0.90, 1.35, 0.45),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.set(stand.position[0], stand.position[1] + 0.70, stand.position[2]);
            hitbox.userData = {
                isStandHitbox: true,
                standId: stand.id,
                product: stand.product,
                stand
            };
            this.scene.add(hitbox);
            this.interactiveMeshes.push(hitbox);

            this.showcases.push({
                stand,
                mesh: showcaseGroup,
                updateImage,
                currentSlide: 0,
                slideTimer: Math.random() * 3.0, // Har xil vaqtda navbatlanishi uchun
                dispose: texDispose
            });
        });
    }

    private setupWallBillboards(allProducts: Product[]) {
        if (!allProducts || allProducts.length === 0) return;

        // Chap devor reklama taxtasi (3:4 format)
        const b1 = createWallBillboardTexture(allProducts, "Eng Ko'p Sotilganlar");
        this.cleanups.push(b1.dispose);
        this.billboard1Update = b1.update;

        const mesh1 = new THREE.Mesh(
            new THREE.PlaneGeometry(2.7, 3.6),
            new THREE.MeshBasicMaterial({ map: b1.texture })
        );
        mesh1.position.set(-14.85, 2.5, 3.5);
        mesh1.rotation.y = Math.PI / 2;
        this.scene.add(mesh1);

        // O'ng devor reklama taxtasi (3:4 format)
        const b2 = createWallBillboardTexture(allProducts.slice().reverse(), "Maxsus Taklif");
        this.cleanups.push(b2.dispose);
        this.billboard2Update = b2.update;

        const mesh2 = new THREE.Mesh(
            new THREE.PlaneGeometry(2.7, 3.6),
            new THREE.MeshBasicMaterial({ map: b2.texture })
        );
        mesh2.position.set(14.85, 2.5, 3.5);
        mesh2.rotation.y = -Math.PI / 2;
        this.scene.add(mesh2);
    }

    public handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.fov = calculateResponsiveCameraFov(width, height);
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    }

    /**
     * KADR ANIMATSIYASI — HAR 3 SONIYADA KO'RINIB TURGAN STENDLARNING RASMI ALMASHINADI
     * Telefonni qiynamaslik uchun faqat kameraga yaqin (< 14m) va oldida bo'lgan stendlar yangilanadi!
     */
    public update(delta: number) {
        const camPos = this.camera.position;
        const camForward = new THREE.Vector3();
        this.camera.getWorldDirection(camForward);

        for (let i = 0; i < this.showcases.length; i++) {
            const sc = this.showcases[i];
            if (sc.stand.images.length <= 1) continue;

            // Masofa va ko'rish maydoni tekshiruvi (Frustum & Distance optimization)
            const standPos = sc.mesh.position;
            const distSq = (camPos.x - standPos.x) ** 2 + (camPos.z - standPos.z) ** 2;

            // Faqat 14 metr radiusdagi stendlar tekshiriladi
            if (distSq < 196) {
                sc.slideTimer += delta;
                if (sc.slideTimer >= 3.0) {
                    sc.slideTimer = 0;
                    sc.currentSlide = (sc.currentSlide + 1) % sc.stand.images.length;
                    sc.updateImage(sc.currentSlide);
                }
            }
        }

        // Katta reklama billbordlari yangilanishi (Har 8 soniyada)
        this.billboardTimer += delta;
        if (this.billboardTimer >= 8.0) {
            this.billboardTimer = 0;
            this.billboard1Update?.();
            this.billboard2Update?.();
        }
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public dispose() {
        this.cleanups.forEach((c) => c());
        this.floorTex.dispose();
        this.darkWalnutTex.dispose();
        this.streetTex.dispose();
        this.greenGlowTex.dispose();
        this.renderer.dispose();
        this.scene.clear();
    }
}
