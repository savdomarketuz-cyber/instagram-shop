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
 * OCHROQ, TABIIY ILIQ YONG'OQ (WARM WALNUT / TEAK) YOG'OCH TEKSTURASI
 */
function createWarmWalnutTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Iliq, qimmatbaho yong'oq yog'ochi rangi (qop-qora emas, tabiiy oltin-jigarrang tuslar)
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
 * YENGIL OCH KULRANG POL VA ZAMONAVIY NEON YASHIL/ZANGORI NAVIGATSIYA CHIZIQLARI (NAMUNA RASMDAGIDEK)
 */
function createDiagramStyleFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Clean Apple/Retail light grey epoxy floor
    ctx.fillStyle = "#EAECEF";
    ctx.fillRect(0, 0, 1024, 1024);

    // Katta 1.2m x 1.2m plita choklari
    ctx.strokeStyle = "rgba(180, 186, 196, 0.65)";
    ctx.lineWidth = 2.5;
    for (let y = 0; y <= 1024; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
    }
    for (let x = 0; x <= 1024; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
    }

    // Namuna rasmdagi yashil/zangori navigatsiya oqim chiziqlari (Circuit flow lines)
    ctx.strokeStyle = "rgba(16, 185, 129, 0.40)";
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 512);
    ctx.lineTo(512, 512);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(896, 0);
    ctx.lineTo(896, 640);
    ctx.lineTo(512, 640);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.generateMipmaps = true;
    return tex;
}

/**
 * KO'CHA ASFALTI VA OQ YO'L CHIZIQLARI
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
 * UZOQDAN HAM 100% O'TA TINIQ (BLURSIZ) 3:4 MAHSULOT TEKSTURASI
 * Kalit sir: generateMipmaps = false va minFilter = THREE.LinearFilter!
 * WebGL mipmap downsampling qilib blurlab tashlamaydi, doim to'liq aniqlikda turadi!
 */
export function createUltraSharpProductTexture(
    images: string[]
): {
    texture: THREE.CanvasTexture;
    updateImage: (index: number) => void;
    dispose: () => void;
} {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; // 3:4 nisbatda yuqori sifatli canvas (1024 x 1365)
    canvas.height = 1365;
    const ctx = canvas.getContext("2d");

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false; // Mipmap blurini butunlay yo'q qilish!
    texture.minFilter = THREE.LinearFilter; // Uzoqda ham to'liq rezolyutsiyadagi tasvir
    texture.magFilter = THREE.LinearFilter;

    const loadedImgs: (HTMLImageElement | null)[] = images.map(() => null);
    let currentIndex = 0;
    let isDisposed = false;

    const render = (img: HTMLImageElement | null) => {
        if (!ctx || isDisposed) return;
        ctx.clearRect(0, 0, 1024, 1365);

        // 1. Shaffof shisha orqa fon
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.roundRect(16, 16, 992, 1333, 36);
        ctx.fill();

        // Nozik yorqin zumrad neon hoshiya
        ctx.strokeStyle = "rgba(16, 185, 129, 0.70)";
        ctx.lineWidth = 4.0;
        ctx.stroke();

        // 2. Mahsulot fotosurati — TO'LIQ 3:4 EKRANDA (Uzoqdan tiniq ko'rinishi uchun yirik va kontrast)
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
            ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("VELARI PREMIUM", 512, 680);
            ctx.font = "24px system-ui";
            ctx.fillStyle = "#94a3b8";
            ctx.fillText("Yuklanmoqda...", 512, 730);
        }

        // Ko'p rasmli bo'lsa pastki nuqtalar
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
 * 3x4 EKRAN TAGIDAGI ALOHIDA BO'RTIB CHIQQAN ELEKTRON NARX PLASHKASI (ESKI VA YANGI NARX)
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

    // OLED qora-zumrad korpus
    ctx.fillStyle = "rgba(10, 16, 24, 0.98)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 584, 164, 24);
    ctx.fill();

    // Zumrad hoshiya
    ctx.strokeStyle = "rgba(16, 185, 129, 0.90)";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Asosiy narx
    ctx.fillStyle = "#34d399";
    ctx.font = "900 48px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${price.toLocaleString("uz-UZ")} SO'M`, 300, oldPrice && oldPrice > price ? 82 : 106);

    // Eski narx (chizilgan)
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

        // 1. SAHNA & KAMERA — KO'CHADAGI OSMON YORQIN KO'K RANGDA (REAL SKY BLUE)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x60a5fa); // Go'zal tiniq osmon ko'k rangi!
        this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.010); // Yumshoq havo atmosferasi

        const initialFov = calculateResponsiveCameraFov(width, height);
        this.camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 80);
        this.camera.position.set(0, 1.65, 11.0);

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
        this.renderer.toneMappingExposure = 1.18;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        // 3. TEKSTURALAR
        this.floorTex = createDiagramStyleFloorTexture();
        this.warmWalnutTex = createWarmWalnutTexture();
        this.streetTex = createStreetAsphaltTexture();

        // 4. YORUG'LIK (Quyosh nuri + zal yoritgichlari)
        this.setupLighting();

        // 5. DO'KON ME'MORCHILIGI: OCH OQISH DEVORLAR, TEKIS MAT QORA SHIFT VA 45° LED CHIROQLAR
        this.setupArchitecture();

        // 6. OYNALI ESHIKLAR, TASHQI KO'CHA, BINO FASADI VA VELARI 3D LOGO
        this.setupEntranceAndStreet();

        // 7. NAMUNA DIAGRAMMA ZALLARI: MARKAZIY DOIRAVIY OROL, TV & SOUND WALL, GONDOLALAR
        this.setupDepartmentStructures();

        // 8. 48 TA 3:4 TINIQ VITRINA EKRANLARI VA BO'RTIB CHIQQAN NARX PLASHKALARI
        this.setupShowcaseStands(stands);
    }

    private setupLighting() {
        // Yumshoq ambient fon
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
        this.scene.add(ambientLight);

        // Quyosh nuri (Tashqi ko'chadan tushuvchi tabiiy iliq quyosh)
        const sunLight = new THREE.DirectionalLight(0xfffaed, 1.8);
        sunLight.position.set(8, 16, 20);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1.0;
        sunLight.shadow.camera.far = 45;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.bias = -0.0003;
        sunLight.shadow.radius = 2.0;
        this.scene.add(sunLight);

        // Zal ichki yorug'ligi
        const storeLight = new THREE.DirectionalLight(0xf8fafc, 1.4);
        storeLight.position.set(0, 12, -2);
        this.scene.add(storeLight);

        // Zallar ustidagi nuqtaviy nuqsonli chiroqlar
        const spotPositions = [
            [0.0, 4.5, 0.0],   // Markaziy doira
            [0.0, 4.5, -10.0], // TV wall
            [-6.5, 4.5, 0.0],  // Trimmerlar
            [-6.5, 4.5, -5.0],
            [6.5, 4.5, -5.0],  // Fenlar
            [6.5, 4.5, 0.0],   // Gadjetlar
            [11.5, 4.5, 1.0]   // Kassa
        ];
        spotPositions.forEach(([x, y, z]) => {
            const spot = new THREE.PointLight(0xfff5ea, 1.1, 9.0, 2);
            spot.position.set(x, y, z);
            this.scene.add(spot);
        });
    }

    private setupArchitecture() {
        // 1. POL — OCH KULRANG EPOKSI POL (NAVIGATSIYA CHIZIQLARI BILAN)
        const floorMat = new THREE.MeshStandardMaterial({
            map: this.floorTex,
            roughness: 0.45,
            metalness: 0.10
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 28), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, 0); // Z: -14 .. +14
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 2. SHIFT — TEKIS MAT QORA (APPLE CYBERSTORE)
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x0c0e12,
            roughness: 0.95
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(36, 28), ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 5.4, 0);
        this.scene.add(ceiling);

        // 3. SHIFTDA 45 GRADUS BURCHAKDA BIR-BIRIGA QARAMA-QARSHI UZUNCHOQ LED CHIROQLAR (CHEVRON LIGHTS)
        const ledMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.2,
            roughness: 0.2
        });
        const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x1f242d });

        const createChevronFixture = (x: number, z: number, len: number, angleDeg: number) => {
            const group = new THREE.Group();
            group.position.set(x, 5.36, z);
            group.rotation.y = (angleDeg * Math.PI) / 180;

            const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, len), fixtureMat);
            group.add(box);

            const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, len - 0.08), ledMat);
            emitter.position.y = -0.04;
            group.add(emitter);

            this.scene.add(group);
        };

        [-9, 0, 9].forEach((xOff) => {
            [-5, 3].forEach((zOff) => {
                createChevronFixture(xOff, zOff, 10.0, 45);
                createChevronFixture(xOff, zOff, 10.0, -45);
            });
        });

        // 4. DEVORLAR — FOYDALANUVCHI SO'RAGAN OCH OQISH ZAMONAVIY DEVOR RANGI (LIGHT ARCHITECTURAL OFF-WHITE)
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xEEF1F5, roughness: 0.85 });

        // Orqa devor (TV & Sound wall)
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 5.4), wallMat);
        backWall.position.set(0, 2.7, -14);
        backWall.receiveShadow = true;
        this.scene.add(backWall);

        // Chap devor
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.4), wallMat);
        leftWall.position.set(-18, 2.7, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        // O'ng devor
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 5.4), wallMat);
        rightWall.position.set(18, 2.7, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        // Namuna rasmdagi zangori neon devor cheti konturlari (Cyan neon perimeter strip)
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const leftPerimeter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 28), cyanNeonMat);
        leftPerimeter.position.set(-17.92, 5.3, 0);
        this.scene.add(leftPerimeter);

        const rightPerimeter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 28), cyanNeonMat);
        rightPerimeter.position.set(17.92, 5.3, 0);
        this.scene.add(rightPerimeter);

        const backPerimeter = new THREE.Mesh(new THREE.BoxGeometry(36, 0.08, 0.08), cyanNeonMat);
        backPerimeter.position.set(0, 5.3, -13.92);
        this.scene.add(backPerimeter);
    }

    private setupEntranceAndStreet() {
        // 1. OYNALI ESHIKLAR VA PANORAMA FASAD (Z: 14.0)
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.22,
            roughness: 0.05,
            metalness: 0.1
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });

        // Chap fasad oynalari (-18 dan -3.2 gacha)
        const leftFacade = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 5.4), glassMat);
        leftFacade.position.set(-10.6, 2.7, 14.0);
        leftFacade.rotation.y = Math.PI;
        this.scene.add(leftFacade);

        // O'ng fasad oynalari (+3.2 dan +18 gacha)
        const rightFacade = new THREE.Mesh(new THREE.PlaneGeometry(14.8, 5.4), glassMat);
        rightFacade.position.set(10.6, 2.7, 14.0);
        rightFacade.rotation.y = Math.PI;
        this.scene.add(rightFacade);

        // O'rtadagi avtomatik suriluvchi shaffof oynali eshiklar (Haqiqiy shisha eshik qanotlari)
        const doorLeafGeo = new THREE.BoxGeometry(1.6, 4.2, 0.05);
        const doorLeaf1 = new THREE.Mesh(doorLeafGeo, glassMat);
        doorLeaf1.position.set(-1.8, 2.1, 14.0); // Yarim ochiq holatda
        this.scene.add(doorLeaf1);

        const doorLeaf2 = new THREE.Mesh(doorLeafGeo, glassMat);
        doorLeaf2.position.set(1.8, 2.1, 14.0);
        this.scene.add(doorLeaf2);

        // Eshik tutqichlari (Metall vertikal tutqichlar)
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 16);
        const handle1 = new THREE.Mesh(handleGeo, frameMat);
        handle1.position.set(-1.1, 1.8, 14.05);
        this.scene.add(handle1);

        const handle2 = new THREE.Mesh(handleGeo, frameMat);
        handle2.position.set(1.1, 1.8, 14.05);
        this.scene.add(handle2);

        // Eshik tepasidagi metall peshtoq va harakat datchigi
        const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.45, 0.25), frameMat);
        doorHeader.position.set(0, 4.5, 14.0);
        this.scene.add(doorHeader);

        // 2. TASHQI KO'CHA (Z: 14.0 dan 38.0 gacha) — TINIQ KO'K OSMON OSTIDA
        const streetMat = new THREE.MeshStandardMaterial({
            map: this.streetTex,
            roughness: 0.85
        });
        const street = new THREE.Mesh(new THREE.PlaneGeometry(54, 26), streetMat);
        street.rotation.x = -Math.PI / 2;
        street.position.set(0, -0.01, 26.5);
        street.receiveShadow = true;
        this.scene.add(street);

        // Piyodalar yo'lagi (Trotuar) do'kon oldida (Z: 14.0 dan 18.0 gacha)
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xCBD5E1, roughness: 0.7 });
        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(40, 0.12, 4.0), sidewalkMat);
        sidewalk.position.set(0, 0.05, 16.0);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);

        // BINO FASADIDAGI VELARI 3D NEON LOGO
        const logoCanvas = document.createElement("canvas");
        logoCanvas.width = 1024;
        logoCanvas.height = 256;
        const lctx = logoCanvas.getContext("2d");
        if (lctx) {
            lctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            lctx.roundRect(16, 16, 992, 224, 32);
            lctx.fill();

            lctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
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
            lctx.shadowBlur = 12;
            lctx.fillText("SUPERSTORE & CONCEPT SHOWROOM", 512, 190);
        }
        const logoTex = new THREE.CanvasTexture(logoCanvas);
        const logoMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(5.4, 1.35),
            new THREE.MeshStandardMaterial({ map: logoTex, emissive: 0x0284c7, emissiveIntensity: 0.4 })
        );
        logoMesh.position.set(0, 4.2, 14.16);
        this.scene.add(logoMesh);

        // Ko'chadagi zamonaviy osmono'par binolar (Osmon ko'k fonida)
        const buildingMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        [
            [-24, 11, 32, 9, 22, 9],
            [-13, 14, 36, 11, 28, 11],
            [13, 16, 36, 12, 32, 11],
            [24, 12, 32, 9, 24, 9]
        ].forEach(([bx, by, bz, bw, bh, bd]) => {
            const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), buildingMat);
            b.position.set(bx, by, bz);
            this.scene.add(b);
        });
    }

    private setupDepartmentStructures() {
        const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const whiteGlossMat = new THREE.MeshStandardMaterial({ color: 0xF8FAFC, roughness: 0.25, metalness: 0.1 });

        // 1. MARKAZIY "MOBILE & TABLETS" DOIRAVIY OROL (NAMUNA RASMDAGIDEK)
        // Markaziy yarim doira/horseshoe barpeshta (radius 2.4m)
        const centerIsland = new THREE.Mesh(
            new THREE.CylinderGeometry(2.6, 2.6, 0.88, 36, 1, false, 0, Math.PI * 2),
            whiteGlossMat
        );
        centerIsland.position.set(0, 0.44, 0);
        centerIsland.castShadow = true;
        centerIsland.receiveShadow = true;
        this.scene.add(centerIsland);

        // Doira ostidagi neon zangori nur uzugi (Cyan underglow)
        const ringGlow = new THREE.Mesh(
            new THREE.TorusGeometry(2.65, 0.04, 12, 36),
            cyanGlowMat
        );
        ringGlow.rotation.x = Math.PI / 2;
        ringGlow.position.set(0, 0.05, 0);
        this.scene.add(ringGlow);

        // Markaziy osma neon zona belgisi: "MOBILE & TABLETS"
        const centerSignCanvas = document.createElement("canvas");
        centerSignCanvas.width = 512;
        centerSignCanvas.height = 96;
        const csctx = centerSignCanvas.getContext("2d");
        if (csctx) {
            csctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            csctx.roundRect(0, 0, 512, 96, 20);
            csctx.fill();
            csctx.strokeStyle = "#00f0ff";
            csctx.lineWidth = 4;
            csctx.stroke();

            csctx.fillStyle = "#ffffff";
            csctx.font = "900 36px system-ui";
            csctx.textAlign = "center";
            csctx.shadowColor = "#00f0ff";
            csctx.shadowBlur = 15;
            csctx.fillText("MOBILE & TABLETS", 256, 60);
        }
        const centerSignTex = new THREE.CanvasTexture(centerSignCanvas);
        const centerSign = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 0.45),
            new THREE.MeshBasicMaterial({ map: centerSignTex, side: THREE.DoubleSide })
        );
        centerSign.position.set(0, 3.8, 0);
        this.scene.add(centerSign);

        // 2. ORQA DEVOR "TV & SOUND" DEKORATSIYALARI (Z = -12.0)
        const tvWallCanvas = document.createElement("canvas");
        tvWallCanvas.width = 512;
        tvWallCanvas.height = 96;
        const tvctx = tvWallCanvas.getContext("2d");
        if (tvctx) {
            tvctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            tvctx.roundRect(0, 0, 512, 96, 20);
            tvctx.fill();
            tvctx.strokeStyle = "#00f0ff";
            tvctx.lineWidth = 4;
            tvctx.stroke();

            tvctx.fillStyle = "#ffffff";
            tvctx.font = "900 38px system-ui";
            tvctx.textAlign = "center";
            tvctx.shadowColor = "#00f0ff";
            tvctx.shadowBlur = 15;
            tvctx.fillText("TV & SOUND", 256, 60);
        }
        const tvSignTex = new THREE.CanvasTexture(tvWallCanvas);
        const tvSign = new THREE.Mesh(
            new THREE.PlaneGeometry(2.8, 0.52),
            new THREE.MeshBasicMaterial({ map: tvSignTex })
        );
        tvSign.position.set(0, 4.0, -13.85);
        this.scene.add(tvSign);

        // 3. TO'Q EMAS, OCHROQ TABIIY YONG'OQ (WARM WALNUT) BO'LIM STOLLARI
        const tableOakMat = new THREE.MeshStandardMaterial({
            map: this.warmWalnutTex,
            roughness: 0.38,
            metalness: 0.05
        });

        const createPodium = (x: number, z: number, title: string) => {
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.6), tableOakMat);
            top.position.y = 0.85;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);

            const legGeo = new THREE.BoxGeometry(0.22, 0.85, 0.22);
            [
                [-1.85, -0.62],
                [1.85, -0.62],
                [-1.85, 0.62],
                [1.85, 0.62]
            ].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(legGeo, tableOakMat);
                leg.position.set(lx, 0.425, lz);
                leg.castShadow = true;
                group.add(leg);
            });

            // Stol oldidagi toifa nishoni
            const badgeCanvas = document.createElement("canvas");
            badgeCanvas.width = 320;
            badgeCanvas.height = 76;
            const bctx = badgeCanvas.getContext("2d");
            if (bctx) {
                bctx.fillStyle = "rgba(248, 250, 252, 0.95)";
                bctx.roundRect(0, 0, 320, 76, 16);
                bctx.fill();
                bctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
                bctx.lineWidth = 3.5;
                bctx.stroke();

                bctx.fillStyle = "#064e3b";
                bctx.font = "bold 24px system-ui, sans-serif";
                bctx.textAlign = "center";
                bctx.textBaseline = "middle";
                bctx.fillText(title, 160, 38);
            }
            const badgeTex = new THREE.CanvasTexture(badgeCanvas);
            const badge = new THREE.Mesh(
                new THREE.PlaneGeometry(0.85, 0.20),
                new THREE.MeshBasicMaterial({ map: badgeTex })
            );
            badge.position.set(0, 0.85, 0.82);
            group.add(badge);

            this.scene.add(group);
        };

        // 5 ta asosiy bo'lim stollari
        createPodium(-6.5, 0.5, "Trimmerlar & Soch");
        createPodium(-6.5, -5.0, "Soch Mashinkalari");
        createPodium(-6.5, 6.0, "Sheyverlar & Ustara");
        createPodium(6.5, -5.5, "Fenlar & Staylerlar");
        createPodium(6.5, 0.5, "Audio & Quloqchinlar");

        // 4. CHECKOUT & SERVIS ZONASI (O'NG QANOT, NAMUNA RASMDAGIDEK)
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.3 });
        const checkoutDesk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.95, 1.4), deskMat);
        checkoutDesk.position.set(11.5, 0.475, 1.0);
        checkoutDesk.castShadow = true;
        this.scene.add(checkoutDesk);

        // Kassa monitorlari
        const monitorMat = new THREE.MeshStandardMaterial({ color: 0x0F172A, metalness: 0.9 });
        [-1.2, 0, 1.2].forEach((mx) => {
            const mon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), monitorMat);
            mon.position.set(11.5 + mx, 1.25, 0.9);
            this.scene.add(mon);
        });

        // Checkout sarlavhasi
        const checkCanvas = document.createElement("canvas");
        checkCanvas.width = 512;
        checkCanvas.height = 96;
        const cctx = checkCanvas.getContext("2d");
        if (cctx) {
            cctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            cctx.roundRect(0, 0, 512, 96, 20);
            cctx.fill();
            cctx.strokeStyle = "#00f0ff";
            cctx.lineWidth = 4;
            cctx.stroke();

            cctx.fillStyle = "#ffffff";
            cctx.font = "900 36px system-ui";
            cctx.textAlign = "center";
            cctx.shadowColor = "#00f0ff";
            cctx.shadowBlur = 15;
            cctx.fillText("CHECKOUT & SERVICE", 256, 60);
        }
        const checkTex = new THREE.CanvasTexture(checkCanvas);
        const checkSign = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 0.45),
            new THREE.MeshBasicMaterial({ map: checkTex })
        );
        checkSign.position.set(11.5, 3.8, 1.0);
        this.scene.add(checkSign);
    }

    private setupShowcaseStands(stands: ShowroomShowcaseStand[]) {
        stands.forEach((stand) => {
            const showcaseGroup = new THREE.Group();
            showcaseGroup.position.set(...stand.position);
            showcaseGroup.rotation.y = stand.rotationY;

            // 1. Shaffof shisha 3:4 ekran (W: 1.0m, H: 1.33m — BOLD 3:4 RETAIL TOTEM)
            const screenGroup = new THREE.Group();
            screenGroup.position.set(0, 0.78, 0);
            screenGroup.rotation.x = -0.08;

            // A) Rangsiz shisha korpus
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

            // B) Uzoqdan ham o'ta tiniq 3:4 tovar displeyi (LinearFilter, mipmapsiz!)
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

    /**
     * KADR ANIMATSIYASI — 3 SONIYADA KO'RINTURGAN STENDLARNING RASMI ALMASHINADI
     */
    public update(delta: number) {
        const camPos = this.camera.position;

        for (let i = 0; i < this.showcases.length; i++) {
            const sc = this.showcases[i];
            if (sc.stand.images.length <= 1) continue;

            const standPos = sc.mesh.position;
            const distSq = (camPos.x - standPos.x) ** 2 + (camPos.z - standPos.z) ** 2;

            // Faqat 15 metr radiusdagi stendlar yangilanadi
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
