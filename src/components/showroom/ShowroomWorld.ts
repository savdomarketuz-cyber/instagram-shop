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
 * Har qanday ekran o'lchami uchun doimiy gorizontal ko'rish maydoni (HFOV ~ 80°)
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
 * XARITA DIAGRAMMASI SHAKLIDAGI DO'KON PERIMETR KOORDINATALARI (NO-RECTANGLE CUSTOM SHAPE)
 */
export const STORE_POLYGON_VERTICES: [number, number][] = [
    // 1. ASOSIY KIRISH FOYESI (G'arbiy qanot, x ≈ -20 .. -16)
    [-20.0, 1.0],
    [-20.0, 5.0],   // Kirish oynali eshiklari joylashgan devor
    [-17.0, 6.5],   // Kirish foye burchagi
    [-15.0, 6.0],

    // 2. OSHXONA VA MAYDA TEXNIKALAR (Janubi-g'arbiy zal, z: 6 .. 10.5)
    [-15.0, 10.5],  // Qavariq burchak
    [-4.0, 10.5],   // Janubiy devor
    [-3.0, 7.5],    // Ichki burilish
    [1.0, 7.5],

    // 3. AKSESSUARLAR VA TARMOQ (Janubiy markaziy zal, z: 7.5 .. 10.5)
    [1.0, 10.5],
    [11.0, 10.5],   // Janubiy devor
    [12.5, 7.5],    // Ichki burilish

    // 4. MIJOZLARGA XIZMAT VA SERVIS (Janubi-sharqiy zal, x: 12.5 .. 22.5, z: 7.5)
    [22.5, 7.5],
    [24.0, 4.0],    // 45° qiya burchak

    // 5. CHECKOUT VA SKLAD (Sharqiy devor, x ≈ 24.0)
    [24.0, -3.0],   // Kassa sharqiy devori
    [24.0, -7.5],   // Sklad burchagi
    [12.0, -7.5],   // Sklad shimoliy devori
    [10.5, -5.5],   // TV & Sound ga o'tish

    // 6. TV & SOUND (Shimoliy markaziy zal, z ≈ -5.5 .. -8.5)
    [9.0, -8.5],
    [-2.0, -8.5],   // TV devori
    [-3.5, -5.5],   // Ichki burilish

    // 7. KATTA MAISHIY TEXNIKALAR (Shimoli-g'arbiy zal, z ≈ -5.5 .. -10.5)
    [-5.0, -10.5],
    [-15.0, -10.5], // Shimoliy devor
    [-17.0, -6.5],  // Shimoli-g'arbiy 45° qiya burchak
    [-17.0, -1.0],  // Kirish foye shimoliy devori
    [-20.0, 1.0]    // Asosiy kirishga qaytish
];

/**
 * ILIQ, TABIIY YONG'OQ (WARM WALNUT) YOG'OCH TEKSTURASI
 */
function createWarmWalnutTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, "#563821");
    grad.addColorStop(0.25, "#6E482C");
    grad.addColorStop(0.5, "#5B3C24");
    grad.addColorStop(0.75, "#754F31");
    grad.addColorStop(1.0, "#5E3E26");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    for (let y = 0; y < 256; y += 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        let curY = y;
        const alpha = 0.08 + Math.random() * 0.12;
        ctx.strokeStyle = Math.random() > 0.5 ? `rgba(45, 26, 12, ${alpha})` : `rgba(165, 120, 80, ${alpha * 0.8})`;
        ctx.lineWidth = 1.2;

        for (let x = 0; x <= 512; x += 32) {
            curY += (Math.random() - 0.5) * 1.5;
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
 * XARITA BO'YICHA POL TEKSTURASI VA NAVIGATSIYA OQIM CHIZIQLARI
 */
function createDiagramFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = "#ECEFF3";
    ctx.fillRect(0, 0, 1024, 1024);

    // 1.2m x 1.2m plita choklari
    ctx.strokeStyle = "rgba(195, 202, 212, 0.65)";
    ctx.lineWidth = 2.0;
    for (let y = 0; y <= 1024; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
    }
    for (let x = 0; x <= 1024; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 8);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * TASHQI KO'CHA ASFALTI
 */
function createStreetAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = "#262A32";
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(60, 65, 75, 0.4)" : "rgba(15, 18, 22, 0.4)";
        ctx.fillRect(x, y, 2, 2);
    }

    // Yo'ldagi oq chiziqlar
    ctx.fillStyle = "rgba(245, 245, 250, 0.9)";
    ctx.fillRect(242, 40, 28, 140);
    ctx.fillRect(242, 320, 28, 140);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * UZOQDAN HAM O'TA TINIQ (MIPMAPSIZ) 3:4 MAHSULOT TEKSTURASI
 */
export function createUltraSharpProductTexture(
    images: string[]
): {
    texture: THREE.CanvasTexture;
    updateImage: (index: number) => void;
    dispose: () => void;
} {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1365;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const loadedImgs: (HTMLImageElement | null)[] = images.map(() => null);
    let currentIndex = 0;
    let isDisposed = false;

    const render = (img: HTMLImageElement | null) => {
        if (!ctx || isDisposed) return;
        ctx.clearRect(0, 0, 1024, 1365);

        // Shaffof shisha ramka
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.roundRect(16, 16, 992, 1333, 36);
        ctx.fill();

        ctx.strokeStyle = "rgba(16, 185, 129, 0.70)";
        ctx.lineWidth = 4.0;
        ctx.stroke();

        if (img && img.complete && img.naturalWidth > 0) {
            const pad = 36;
            const targetW = 1024 - pad * 2;
            const targetH = 1365 - pad * 2;
            const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight) * 0.98;
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            const dx = (1024 - dw) / 2;
            const dy = (1365 - dh) / 2;

            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 16;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        } else {
            ctx.fillStyle = "#10b981";
            ctx.font = "bold 44px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("VELARI PREMIUM", 512, 680);
            ctx.font = "24px system-ui";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Yuklanmoqda...", 512, 730);
        }

        if (images.length > 1) {
            const dotY = 1320;
            const totalDots = Math.min(images.length, 5);
            const startX = 512 - ((totalDots - 1) * 22) / 2;
            for (let i = 0; i < totalDots; i++) {
                ctx.fillStyle = i === currentIndex % totalDots ? "#10b981" : "rgba(255, 255, 255, 0.40)";
                ctx.beginPath();
                ctx.arc(startX + i * 22, dotY, i === currentIndex % totalDots ? 7 : 4.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        texture.needsUpdate = true;
    };

    render(null);

    images.forEach((url, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = getSafeImageUrl(url);
        img.onload = () => {
            if (isDisposed) return;
            loadedImgs[i] = img;
            if (i === currentIndex) render(img);
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
 * 3x4 EKRAN TAGIDAGI ALOHIDA BO'RTIB CHIQQAN ELEKTRON NARX PLASHKASI
 */
function createProtrudingPriceTexture(
    price: number,
    oldPrice?: number
): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    if (!ctx) return texture;

    ctx.fillStyle = "rgba(10, 16, 24, 0.98)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 584, 164, 24);
    ctx.fill();

    ctx.strokeStyle = "rgba(16, 185, 129, 0.90)";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "900 48px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${price.toLocaleString("uz-UZ")} SO'M`, 300, oldPrice && oldPrice > price ? 82 : 106);

    if (oldPrice && oldPrice > price) {
        ctx.fillStyle = "#9ca3af";
        ctx.font = "600 28px system-ui";
        const oldText = `${oldPrice.toLocaleString("uz-UZ")} so'm`;
        ctx.fillText(oldText, 300, 136);

        const oldW = ctx.measureText(oldText).width;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(300 - oldW / 2 - 6, 126);
        ctx.lineTo(300 + oldW / 2 + 6, 126);
        ctx.stroke();
    }

    texture.needsUpdate = true;
    return texture;
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
    private warmWalnutTex: THREE.CanvasTexture;
    private streetTex: THREE.CanvasTexture;

    constructor(
        container: HTMLElement,
        stands: ShowroomShowcaseStand[],
        lang: "uz" | "ru",
        allProducts: Product[]
    ) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. SAHNA & KAMERA — TINIQ KO'K OSMON
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x60a5fa); // Go'zal tiniq osmon ko'k rangi!
        this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.008);

        const initialFov = calculateResponsiveCameraFov(width, height);
        this.camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 90);
        // Boshlang'ich kamera: Asosiy kirish oynali eshiklari ichida, zalga qaragan
        this.camera.position.set(-17.0, 1.65, 3.0);

        // 2. RENDERER
        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: true,
            stencil: false,
            depth: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.20;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        // 3. TEKSTURALAR
        this.floorTex = createDiagramFloorTexture();
        this.warmWalnutTex = createWarmWalnutTexture();
        this.streetTex = createStreetAsphaltTexture();

        // 4. YORUG'LIK (Quyosh nuri + zal ichki yoritgichlari)
        this.setupLighting();

        // 5. XARITA POLIGONI BO'YICHA NO-RECTANGLE XONA (POL, SHIFT VA PERIMETR DEVORLARI)
        this.setupCustomShapedBuilding();

        // 6. G'ARBIY OYNALI KIRISH ESHIKLARI VA TASHQI KO'CHA (KO'K OSMON BILAN)
        this.setupEntranceAndExteriorStreet();

        // 7. POLdagi NEON OQIM CHIZIQLARI (CIRCUIT NAVIGATION LINES)
        this.setupFloorNavigationLines();

        // 8. DIAGRAMMADAGI BARCHA BO'LIMLAR (MOBILE OROL, TV WALL, KATTA MAISHIY, CHECKOUT, SERVIS)
        this.setupDepartmentStructures();

        // 9. 48 TA VITRINA STENDLARI
        this.setupShowcaseStands(stands);
    }

    private setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
        this.scene.add(ambientLight);

        // Tashqi quyosh nuri (G'arbiy oynali kirish eshiklaridan ichkariga tushuvchi)
        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.9);
        sunLight.position.set(-28, 16, 3);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1.0;
        sunLight.shadow.camera.far = 65;
        sunLight.shadow.camera.left = -25;
        sunLight.shadow.camera.right = 25;
        sunLight.shadow.camera.top = 25;
        sunLight.shadow.camera.bottom = -25;
        sunLight.shadow.bias = -0.0003;
        sunLight.shadow.radius = 2.0;
        this.scene.add(sunLight);

        // Zal ichki ship chiroqlari
        const interiorLight = new THREE.DirectionalLight(0xf1f5f9, 1.5);
        interiorLight.position.set(0, 14, 0);
        this.scene.add(interiorLight);

        // Zallardagi nuqtaviy studiya chiroqlari
        const spots = [
            [-17.0, 4.2, 3.0], // Kirish foye
            [0.0, 4.5, 0.0],   // Markaziy Mobile doira
            [3.5, 4.5, -7.0],  // TV & Sound
            [-9.5, 4.5, -8.0], // Katta maishiy
            [-9.5, 4.5, 7.5],  // Oshxona
            [6.0, 4.5, 7.5],   // Aksessuarlar
            [18.0, 4.5, 0.0]   // Checkout & Servis
        ];
        spots.forEach(([x, y, z]) => {
            const spot = new THREE.PointLight(0xfff6eb, 1.2, 10.0, 2);
            spot.position.set(x, y, z);
            this.scene.add(spot);
        });
    }

    /**
     * SIZ BERGAN XARITA CHIZMASI SHAKLIDAGI HAQIQIY NO-RECTANGLE XONA (POL, DEVORLAR, SHIFT)
     */
    private setupCustomShapedBuilding() {
        const floorShape = new THREE.Shape();
        const p0 = STORE_POLYGON_VERTICES[0];
        floorShape.moveTo(p0[0], p0[1]);

        for (let i = 1; i < STORE_POLYGON_VERTICES.length; i++) {
            const pt = STORE_POLYGON_VERTICES[i];
            floorShape.lineTo(pt[0], pt[1]);
        }
        floorShape.closePath();

        // 1. POL (Xaritaning aniq ko'pburchak shaklidagi poli)
        const floorGeo = new THREE.ShapeGeometry(floorShape);
        floorGeo.rotateX(-Math.PI / 2); // 3D sahnaga gorizontal yotqizish

        const floorMat = new THREE.MeshStandardMaterial({
            map: this.floorTex,
            roughness: 0.45,
            metalness: 0.08
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. SHIFT (Xaritaning ko'pburchak shaklidagi mat qora shifti)
        const ceilingGeo = new THREE.ShapeGeometry(floorShape);
        ceilingGeo.rotateX(Math.PI / 2);

        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x0C0E12,
            roughness: 0.95
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.position.set(0, 5.2, 0);
        this.scene.add(ceiling);

        // Shiftga 45 gradusli chevron chiroqlar
        const ledMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.2,
            roughness: 0.2
        });
        const createChevron = (x: number, z: number, len: number, angle: number) => {
            const g = new THREE.Group();
            g.position.set(x, 5.16, z);
            g.rotation.y = (angle * Math.PI) / 180;
            const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, len), new THREE.MeshStandardMaterial({ color: 0x1E242E }));
            g.add(b);
            const e = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, len - 0.08), ledMat);
            e.position.y = -0.04;
            g.add(e);
            this.scene.add(g);
        };
        [-10, 0, 10, 18].forEach((xOff) => {
            [-5, 3].forEach((zOff) => {
                createChevron(xOff, zOff, 8.5, 45);
                createChevron(xOff, zOff, 8.5, -45);
            });
        });

        // 3. XARITA PERIMETRI BO'YLAB DEVORLAR (OCH OQISH ICHKI DEVOR, TASHQI NAVY KORPUS VA ZANGORI NEON CHIZIQ)
        const wallInnerMat = new THREE.MeshStandardMaterial({ color: 0xEEF1F5, roughness: 0.85 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        for (let i = 0; i < STORE_POLYGON_VERTICES.length - 1; i++) {
            const [x1, z1] = STORE_POLYGON_VERTICES[i];
            const [x2, z2] = STORE_POLYGON_VERTICES[i + 1];

            // Agar bu kirish oynali eshigi devori bo'lsa (x1 === -20, z: 1 .. 5), uni alohida shisha qilamiz
            if (x1 === -20.0 && x2 === -20.0) {
                continue;
            }

            const dx = x2 - x1;
            const dz = z2 - z1;
            const length = Math.hypot(dx, dz);
            const angle = Math.atan2(dx, dz);
            const midX = (x1 + x2) / 2;
            const midZ = (z1 + z2) / 2;

            // Devor bloki
            const wallMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 5.2, length),
                wallInnerMat
            );
            wallMesh.position.set(midX, 2.6, midZ);
            wallMesh.rotation.y = angle;
            wallMesh.receiveShadow = true;
            this.scene.add(wallMesh);

            // Devor tepasidagi neon zangori kontur (Diagrammadagi neon konturlar kabi)
            const neonLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, length),
                cyanNeonMat
            );
            neonLine.position.set(midX, 5.16, midZ);
            neonLine.rotation.y = angle;
            this.scene.add(neonLine);
        }
    }

    /**
     * G'ARBIY OYNALI KIRISH ESHIKLARI VA TASHQI KO'CHA (TINIQ KO'K OSMON)
     */
    private setupEntranceAndExteriorStreet() {
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.22,
            roughness: 0.05,
            metalness: 0.1
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

        // 1. ASOSIY KIRISH OYNALI ESHIKLARI (X: -20.0, Z: 1.0 .. 5.0 oralig'ida)
        // 2 ta suriluvchi shisha eshik qanotlari
        const doorLeaf1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 1.4), glassMat);
        doorLeaf1.position.set(-20.0, 2.1, 1.8);
        this.scene.add(doorLeaf1);

        const doorLeaf2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 1.4), glassMat);
        doorLeaf2.position.set(-20.0, 2.1, 4.2);
        this.scene.add(doorLeaf2);

        // Eshik metall tutqichlari
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 16);
        const h1 = new THREE.Mesh(handleGeo, frameMat);
        h1.position.set(-19.95, 1.8, 2.4);
        this.scene.add(h1);

        const h2 = new THREE.Mesh(handleGeo, frameMat);
        h2.position.set(-19.95, 1.8, 3.6);
        this.scene.add(h2);

        // Eshik peshtoqiga neon "ASOSIY KIRISH" tablichkasi
        const signCanvas = document.createElement("canvas");
        signCanvas.width = 512;
        signCanvas.height = 96;
        const sctx = signCanvas.getContext("2d");
        if (sctx) {
            sctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            sctx.roundRect(0, 0, 512, 96, 20);
            sctx.fill();
            sctx.strokeStyle = "#00f0ff";
            sctx.lineWidth = 4;
            sctx.stroke();

            sctx.fillStyle = "#ffffff";
            sctx.font = "900 36px system-ui, sans-serif";
            sctx.textAlign = "center";
            sctx.shadowColor = "#00f0ff";
            sctx.shadowBlur = 15;
            sctx.fillText("ASOSIY KIRISH", 256, 60);
        }
        const signTex = new THREE.CanvasTexture(signCanvas);
        const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
        signMesh.position.set(-19.95, 4.4, 3.0);
        signMesh.rotation.y = Math.PI / 2; // Ichkariga qaragan
        this.scene.add(signMesh);

        // 2. TASHQI KO'CHA PLAZASI (X: -20 dan -44 gacha) — TINIQ KO'K OSMON
        const streetMat = new THREE.MeshStandardMaterial({
            map: this.streetTex,
            roughness: 0.85
        });
        const street = new THREE.Mesh(new THREE.PlaneGeometry(24, 34), streetMat);
        street.rotation.x = -Math.PI / 2;
        street.position.set(-32.0, -0.01, 3.0);
        street.receiveShadow = true;
        this.scene.add(street);

        // Trotuar
        const sidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 0.12, 30.0),
            new THREE.MeshStandardMaterial({ color: 0xCBD5E1, roughness: 0.7 })
        );
        sidewalk.position.set(-22.0, 0.05, 3.0);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);

        // BINO TASHQI FASADIDAGI ULKAN VELARI 3D LOGOTIPI (Ko'chadan qaraganda ko'rinadi)
        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = 1024;
        logoCanvas.height = 256;
        const lctx = logoCanvas.getContext("2d");
        if (lctx) {
            lctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            lctx.roundRect(16, 16, 992, 224, 32);
            lctx.fill();
            lctx.strokeStyle = "#00f0ff";
            lctx.lineWidth = 6;
            lctx.stroke();

            lctx.fillStyle = "#ffffff";
            lctx.font = "900 115px system-ui, sans-serif";
            lctx.textAlign = "center";
            lctx.shadowColor = "#00f0ff";
            lctx.shadowBlur = 35;
            lctx.fillText("V E L A R I", 512, 140);

            lctx.fillStyle = "#38bdf8";
            lctx.font = "bold 26px system-ui";
            lctx.fillText("SUPERSTORE & CONCEPT SHOWROOM", 512, 190);
        }
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        const logoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(5.4, 1.35),
            new THREE.MeshStandardMaterial({ map: logoTex, emissive: 0x0284c7, emissiveIntensity: 0.4 })
        );
        logoMesh.position.set(-20.15, 4.4, 3.0);
        logoMesh.rotation.y = -Math.PI / 2; // Ko'chaga qaragan
        this.scene.add(logoMesh);

        // Shahar binolari silueti (Ko'k osmon ostida)
        const bMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        [
            [-36, 12, -8, 8, 24, 8],
            [-40, 16, 3, 10, 32, 10],
            [-36, 14, 14, 8, 28, 8]
        ].forEach(([bx, by, bz, bw, bh, bd]) => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
            b.position.set(bx, by, bz);
            this.scene.add(b);
        });
    }

    /**
     * POLDA YASHIL VA ZANGORI NAVIGATSIYA OQIM CHIZIQLARI (CIRCUIT NAVIGATION LINES)
     */
    private setupFloorNavigationLines() {
        const lineMatCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
        const lineMatGreen = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85 });

        const createPathSegment = (x: number, z: number, w: number, h: number, mat: THREE.Material) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, 0.006, z);
            this.scene.add(mesh);
        };

        // Kirishdan markazga asosiy oqim (X: -19 dan 0 gacha)
        createPathSegment(-9.5, 3.0, 19.0, 0.16, lineMatCyan);

        // Oshxonaga shoxlanish
        createPathSegment(-10.0, 5.5, 0.16, 5.0, lineMatGreen);
        createPathSegment(-10.0, 8.0, 4.0, 0.16, lineMatGreen);

        // Katta maishiyga shoxlanish
        createPathSegment(-10.0, 0.0, 0.16, 6.0, lineMatCyan);
        createPathSegment(-10.0, -3.0, 4.0, 0.16, lineMatCyan);

        // Markaziy Mobile orolini aylanib o'tuvchi chiziq
        createPathSegment(0.0, 3.2, 5.0, 0.16, lineMatCyan);
        createPathSegment(2.5, 0.0, 0.16, 6.4, lineMatCyan);

        // Checkout & Kassaga to'g'ridan-to'g'ri eltuvchi asosiy chiziq
        createPathSegment(10.0, 0.0, 15.0, 0.16, lineMatCyan);
        createPathSegment(17.5, 0.0, 0.16, 5.0, lineMatGreen);
    }

    /**
     * DIAGRAMMADAGI BARCHA BO'LIMLAR ME'MORCHILIGI (MOBILE ROTUNDA, TV WALL, GONDOLALAR, KASSA)
     */
    private setupDepartmentStructures() {
        const whiteGlossMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.25, metalness: 0.1 });
        const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        // 1. MARKAZIY "MOBILE & TABLETS" DOIRAVIY OROL (DIAGRAMMA MARKAZIDAGIDEK)
        // Markaziy doiraviy counter (radius 2.1m)
        const centerIsland = new THREE.Mesh(
            new THREE.CylinderGeometry(2.3, 2.3, 0.88, 36),
            whiteGlossMat
        );
        centerIsland.position.set(0, 0.44, 0);
        centerIsland.castShadow = true;
        this.scene.add(centerIsland);

        // Doira ostidagi neon zangori nur uzugi (Cyan underglow)
        const ringGlow = new THREE.Mesh(
            new THREE.TorusGeometry(2.35, 0.04, 12, 36),
            cyanGlowMat
        );
        ringGlow.rotation.x = Math.PI / 2;
        ringGlow.position.set(0, 0.05, 0);
        this.scene.add(ringGlow);

        // Markaziy neon sarlavha: "MOBILE & TABLETS"
        const mobileSign = this.createNeonSign("MOBILE & TABLETS", 2.4, 0.45);
        mobileSign.position.set(0, 3.8, 0);
        this.scene.add(mobileSign);

        // 2. "TV & SOUND" DEVORI (Shimoliy devor: x = 3.5, z = -8.2)
        const tvSign = this.createNeonSign("TV & SOUND", 2.6, 0.48);
        tvSign.position.set(3.5, 4.2, -8.3);
        this.scene.add(tvSign);

        // 3 ta katta devor TV ekranlari
        const tvMat = new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.1, metalness: 0.8 });
        [1.0, 3.5, 6.0].forEach((tx) => {
            const tv = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.08), tvMat);
            tv.position.set(tx, 2.5, -8.3);
            this.scene.add(tv);
        });

        // 3. "KATTA MAISHIY TEXNIKALAR" (Shimoli-g'arbiy zal)
        const appSign = this.createNeonSign("KATTA MAISHIY TEXNIKALAR", 3.2, 0.48);
        appSign.position.set(-9.5, 4.2, -10.3);
        this.scene.add(appSign);

        // Muzlatgichlar va kir yuvish mashinalari 3D qatori
        const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.4, roughness: 0.2 });
        [-12.0, -10.5, -9.0].forEach((fx) => {
            const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.8), fridgeMat);
            fridge.position.set(fx, 0.925, -9.8);
            this.scene.add(fridge);
        });

        // 4. "OSHXONA VA MAYDA TEXNIKALAR" (Janubi-g'arbiy zal)
        const kitchenSign = this.createNeonSign("OSHXONA VA MAYDA TEXNIKALAR", 3.2, 0.48);
        kitchenSign.position.set(-9.5, 4.2, 10.3);
        this.scene.add(kitchenSign);

        // 5. "AKSESSUARLAR VA TARMOQ" (Janubiy markaziy zal)
        const accSign = this.createNeonSign("AKSESSUARLAR VA TARMOQ", 3.0, 0.48);
        accSign.position.set(6.0, 4.2, 10.3);
        this.scene.add(accSign);

        // 6. "CHECKOUT - KASSA" (Sharqiy zal: x = 18.0, z = -1.0)
        const checkSign = this.createNeonSign("CHECKOUT - KASSA", 2.6, 0.48);
        checkSign.position.set(18.0, 4.2, -1.0);
        checkSign.rotation.y = -Math.PI / 2;
        this.scene.add(checkSign);

        // 4 ta kassa stollari va monitorlar
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.3 });
        const monMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9 });
        [-2.0, -0.7, 0.6, 1.9].forEach((cz) => {
            const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 0.8), deskMat);
            desk.position.set(18.0, 0.475, cz);
            this.scene.add(desk);

            const mon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.55), monMat);
            mon.position.set(17.9, 1.15, cz);
            this.scene.add(mon);
        });

        // 7. "MIJOZLARGA XIZMAT VA SERVIS" (Janubi-sharqiy zal: x = 18.0, z = 5.5)
        const servSign = this.createNeonSign("MIJOZLARGA XIZMAT VA SERVIS", 3.0, 0.48);
        servSign.position.set(18.0, 4.2, 5.5);
        servSign.rotation.y = -Math.PI / 2;
        this.scene.add(servSign);

        // Servis stollari
        const servDesk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 2.8), deskMat);
        servDesk.position.set(18.0, 0.475, 5.5);
        this.scene.add(servDesk);

        // 8. OCHROQ TABIIY YONG'OQ BO'LIM STOLLARI
        const tableMat = new THREE.MeshStandardMaterial({
            map: this.warmWalnutTex,
            roughness: 0.38,
            metalness: 0.05
        });

        const createTable = (x: number, z: number, w: number, d: number) => {
            const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), tableMat);
            top.position.set(x, 0.85, z);
            top.castShadow = true;
            top.receiveShadow = true;
            this.scene.add(top);

            const legGeo = new THREE.BoxGeometry(0.2, 0.85, 0.2);
            [
                [-w / 2 + 0.25, -d / 2 + 0.25],
                [w / 2 - 0.25, -d / 2 + 0.25],
                [-w / 2 + 0.25, d / 2 - 0.25],
                [w / 2 - 0.25, d / 2 - 0.25]
            ].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeo, tableMat);
                leg.position.set(x + lx, 0.425, z + lz);
                this.scene.add(leg);
            });
        };

        // Bo'lim stollari
        createTable(-9.5, -4.5, 4.2, 1.4); // Trimmerlar
        createTable(-9.5, 5.0, 4.2, 1.4);  // Sheyverlar
        createTable(-9.5, -9.2, 8.5, 0.9); // Katta maishiy tokcha
        createTable(-9.5, 9.2, 8.5, 0.9);  // Oshxona tokcha
        createTable(3.5, -7.8, 8.5, 0.9);  // TV & Sound tokcha
        createTable(6.5, 8.5, 8.5, 0.9);   // Aksessuarlar tokcha
    }

    private createNeonSign(text: string, w: number, h: number): THREE.Mesh {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 96;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
            ctx.roundRect(0, 0, 512, 96, 20);
            ctx.fill();
            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.font = "900 34px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "#00f0ff";
            ctx.shadowBlur = 15;
            ctx.fillText(text, 256, 60);
        }
        const tex = new THREE.CanvasTexture(canvas);
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    }

    /**
     * 48 TA VITRINA STENDLARI (3:4 SHAFSHOF EKRAN + BO'RTIB CHIQQAN NARX PLASHKASI)
     */
    private setupShowcaseStands(stands: ShowroomShowcaseStand[]) {
        stands.forEach((stand) => {
            const showcaseGroup = new THREE.Group();
            showcaseGroup.position.set(...stand.position);
            showcaseGroup.rotation.y = stand.rotationY;

            // 1. Shaffof shisha 3:4 ekran (W: 1.0m, H: 1.33m)
            const screenGroup = new THREE.Group();
            screenGroup.position.set(0, 0.78, 0);
            screenGroup.rotation.x = -0.08;

            // Rangsiz shisha korpus
            const glassBody = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 1.33, 0.02),
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

            // Uzoqdan ham o'ta tiniq 3:4 displey (LinearFilter, mipmapsiz!)
            const { texture: displayTex, updateImage, dispose: texDispose } = createUltraSharpProductTexture(stand.images);
            this.cleanups.push(texDispose);

            const displayFace = new THREE.Mesh(
                new THREE.PlaneGeometry(0.96, 1.29),
                new THREE.MeshBasicMaterial({
                    map: displayTex,
                    transparent: true,
                    opacity: 0.98,
                    side: THREE.FrontSide
                })
            );
            displayFace.position.z = 0.012;
            screenGroup.add(displayFace);

            // 2. 3x4 EKRAN TAGIDAGI ALOHIDA BO'RTIB CHIQQAN ELEKTRON NARX PLASHKASI
            const priceTex = createProtrudingPriceTexture(stand.product.price, (stand.product as any).old_price || stand.product.oldPrice);
            this.cleanups.push(() => priceTex.dispose());

            const priceBox = new THREE.Mesh(
                new THREE.BoxGeometry(0.70, 0.20, 0.05),
                new THREE.MeshStandardMaterial({
                    map: priceTex,
                    roughness: 0.25,
                    metalness: 0.5
                })
            );
            priceBox.position.set(0, -0.74, 0.04);
            screenGroup.add(priceBox);

            showcaseGroup.add(screenGroup);
            this.scene.add(showcaseGroup);

            // 3. INTERAKTIV HITBOX
            const hitbox = new THREE.Mesh(
                new THREE.BoxGeometry(1.05, 1.55, 0.5),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            hitbox.position.set(stand.position[0], stand.position[1] + 0.78, stand.position[2]);
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
                slideTimer: Math.random() * 3.0,
                dispose: texDispose
            });
        });
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

    public update(delta: number) {
        const camPos = this.camera.position;

        for (let i = 0; i < this.showcases.length; i++) {
            const sc = this.showcases[i];
            if (sc.stand.images.length <= 1) continue;

            const standPos = sc.mesh.position;
            const distSq = (camPos.x - standPos.x) ** 2 + (camPos.z - standPos.z) ** 2;

            if (distSq < 225) {
                sc.slideTimer += delta;
                if (sc.slideTimer >= 3.0) {
                    sc.slideTimer = 0;
                    sc.currentSlide = (sc.currentSlide + 1) % sc.stand.images.length;
                    sc.updateImage(sc.currentSlide);
                }
            }
        }
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public dispose() {
        this.cleanups.forEach((c) => c());
        this.floorTex.dispose();
        this.warmWalnutTex.dispose();
        this.streetTex.dispose();
        this.renderer.dispose();
        this.scene.clear();
    }
}
