import * as THREE from "three";
import { Product } from "@/types";
import { ShowroomShowcaseStand } from "./showroom-data";
import { STORE_POLYGON_VERTICES } from "./ShowroomWorld";

export interface ObstacleBox {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

export interface ShowroomControlsCallbacks {
    onSelectProduct: (item: { stand: ShowroomShowcaseStand; product: Product }) => void;
    onCloseOverlay: () => void;
    onPointerLockChange?: (locked: boolean) => void;
    onViewModeChange?: (mode: "FREE_ROAM" | "TOP_DOWN_2D") => void;
}

export class ShowroomControls {
    public mode: "FREE_ROAM" | "TOP_DOWN_2D" | "INSPECT" = "FREE_ROAM";
    public playerPos = new THREE.Vector3(-19.0, 1.65, 3.0);
    public velocity = new THREE.Vector3(0, 0, 0);
    public verticalVelocity = 0;
    public isGrounded = true;
    public yaw = Math.PI / 2; // G'arbdan Sharqqa - do'kon markaziga qaragan
    public pitch = -0.05;
    public invertY = false;

    private bobTimer = 0;
    private bobOffset = new THREE.Vector3(0, 0, 0);

    // Inspect rejimidagi kamera
    public inspectCamPos = new THREE.Vector3(0, 1.65, 8.5);
    public inspectLookAt = new THREE.Vector3(0, 1.1, -0.5);
    private currentInspectLookAt = new THREE.Vector3(0, 1.1, -0.5);

    // 2D Tepadan ko'rish (Top-Down / Bird's eye) kamerasi
    public topDownCamPos = new THREE.Vector3(2.5, 38.0, 12.0);
    public topDownLookAt = new THREE.Vector3(2.5, 0.0, 0.0);
    private currentTopDownLookAt = new THREE.Vector3(2.5, 0.0, 0.0);

    // Kiritish
    private keysPressed: Record<string, boolean> = {};
    private joystickVector = { x: 0, y: 0 };

    // Sichqoncha va sensorli drag
    private isPointerLocked = false;
    private isMouseDown = false;
    private previousMousePos = { x: 0, y: 0 };

    // Tap/Click aniqlash (Adashib ochilib ketmaslik uchun)
    private pointerDownPos = { x: 0, y: 0 };
    private pointerDownTime = 0;

    // Sensorli ekran (Touch Look - o'ng taraf)
    private activeTouchLookId: number | null = null;
    private touchLookPrevX = 0;
    private touchLookPrevY = 0;

    // Raycasting (Faqat to'g'ridan-to'g'ri bosilganda ishlatiladi)
    private raycaster = new THREE.Raycaster();
    private tapVector = new THREE.Vector2();

    // TO'SIQLAR: 7 ta bo'lim stollari, tokchalari va to'siq devorlari
    private obstacles: ObstacleBox[] = [
        // 1. Markaziy "MOBILE & TABLETS" oroli va podlari
        { minX: -2.7, maxX: 2.7, minZ: -2.7, maxZ: 2.7 },
        { minX: -2.8, maxX: 2.8, minZ: -3.5, maxZ: -2.1 },
        { minX: -4.5, maxX: -3.1, minZ: -0.4, maxZ: 1.8 },
        { minX: 3.1, maxX: 4.5, minZ: -0.4, maxZ: 1.8 },

        // 2. TV & Sound stollari va devori
        { minX: 4.0, maxX: 13.5, minZ: -10.3, maxZ: -8.7 },
        { minX: 4.0, maxX: 13.5, minZ: -7.3, maxZ: -5.7 },
        { minX: 0.0, maxX: 14.5, minZ: -14.2, maxZ: -13.2 },

        // 3. Katta maishiy texnikalar stollari & tokchalari
        { minX: -16.0, maxX: -5.0, minZ: -10.3, maxZ: -8.7 },

        // 4. Oshxona & mayda texnikalar gondolalari
        { minX: -16.0, maxX: -5.0, minZ: 9.2, maxZ: 10.8 },

        // 5. Aksessuarlar va tarmoq gondolalari
        { minX: 3.5, maxX: 14.0, minZ: 9.2, maxZ: 10.8 },

        // 6. Checkout bo'limining ichki to'siq devori (Partition Wall)
        { minX: 15.7, maxX: 16.3, minZ: -5.5, maxZ: -0.8 },
        { minX: 15.7, maxX: 16.3, minZ: 2.2, maxZ: 5.0 },
        { minX: 17.0, maxX: 25.0, minZ: -0.6, maxZ: 0.6 }, // Kassa stollari

        // 7. Sklad va Checkout ajratuvchi devor
        { minX: 16.0, maxX: 28.0, minZ: -5.8, maxZ: -5.2 },

        // 8. Servis va Checkout ajratuvchi devor
        { minX: 16.0, maxX: 28.0, minZ: 4.7, maxZ: 5.3 },

        // 9. Servis stollari
        { minX: 17.5, maxX: 25.5, minZ: 7.7, maxZ: 9.3 },

        // 10. Kirishdagi resepshn va aravalar
        { minX: -19.0, maxX: -16.0, minZ: 1.2, maxZ: 2.8 }
    ];

    private _forward = new THREE.Vector3();
    private _right = new THREE.Vector3();
    private _inputDir = new THREE.Vector3();
    private _targetVelocity = new THREE.Vector3();
    private _lookDirection = new THREE.Vector3();
    private _camTarget = new THREE.Vector3();

    private container: HTMLElement;
    private camera: THREE.PerspectiveCamera;
    private interactiveMeshes: THREE.Object3D[];
    private callbacks: ShowroomControlsCallbacks;
    private listenersCleanup: (() => void)[] = [];

    constructor(
        container: HTMLElement,
        camera: THREE.PerspectiveCamera,
        interactiveMeshes: THREE.Object3D[],
        callbacks: ShowroomControlsCallbacks
    ) {
        this.container = container;
        this.camera = camera;
        this.interactiveMeshes = interactiveMeshes;
        this.callbacks = callbacks;

        this.bindEvents();
    }

    private bindEvents() {
        // 1. Pointer Lock
        const onPointerLockChange = () => {
            const locked = document.pointerLockElement === this.container;
            this.isPointerLocked = locked;
            this.callbacks.onPointerLockChange?.(locked);
        };
        document.addEventListener("pointerlockchange", onPointerLockChange);
        this.listenersCleanup.push(() => document.removeEventListener("pointerlockchange", onPointerLockChange));

        // 2. Mouse Look & Clean Click
        const onMouseMove = (e: MouseEvent) => {
            const yMult = this.invertY ? 1 : -1;
            if (this.isPointerLocked) {
                const sensitivity = 0.0022;
                this.yaw += e.movementX * sensitivity;
                this.pitch += e.movementY * sensitivity * yMult;
                this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
            } else if (this.isMouseDown && this.mode === "FREE_ROAM") {
                const dx = e.clientX - this.previousMousePos.x;
                const dy = e.clientY - this.previousMousePos.y;
                this.yaw += dx * 0.003;
                this.pitch += dy * 0.003 * yMult;
                this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
                this.previousMousePos = { x: e.clientX, y: e.clientY };
            }
        };

        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;

            this.isMouseDown = true;
            this.previousMousePos = { x: e.clientX, y: e.clientY };
            this.pointerDownPos = { x: e.clientX, y: e.clientY };
            this.pointerDownTime = Date.now();

            if (!document.pointerLockElement && this.mode === "FREE_ROAM") {
                this.container.requestPointerLock?.();
            }
        };

        const onMouseUp = (e: MouseEvent) => {
            this.isMouseDown = false;

            // Agar qisqa toza bosish (drag emas) bo'lsa, mahsulotni tekshirish
            const moveDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
            const elapsed = Date.now() - this.pointerDownTime;
            if (moveDist < 7 && elapsed < 300 && this.mode === "FREE_ROAM") {
                this.checkTapOnProduct(e.clientX, e.clientY);
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        this.listenersCleanup.push(() => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
        });

        // 3. Sensorli Ekran (Ekranning o'ng tomoni orqali Touch Look)
        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = touch.target as HTMLElement;
                if (target.closest("button") || target.closest("a") || target.closest(".no-drag")) {
                    continue;
                }

                // Ekranning o'ng yarmi: Kamerani aylantirish (Look around)
                if (touch.clientX >= window.innerWidth / 2 && this.activeTouchLookId === null) {
                    this.activeTouchLookId = touch.identifier;
                    this.touchLookPrevX = touch.clientX;
                    this.touchLookPrevY = touch.clientY;
                    this.pointerDownPos = { x: touch.clientX, y: touch.clientY };
                    this.pointerDownTime = Date.now();
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (this.activeTouchLookId === null || this.mode !== "FREE_ROAM") return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.activeTouchLookId) {
                    const dx = touch.clientX - this.touchLookPrevX;
                    const dy = touch.clientY - this.touchLookPrevY;
                    this.touchLookPrevX = touch.clientX;
                    this.touchLookPrevY = touch.clientY;

                    const touchSensitivity = 0.0044;
                    const yMult = this.invertY ? 1 : -1;
                    this.yaw += dx * touchSensitivity;
                    this.pitch += dy * touchSensitivity * yMult;
                    this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
                    break;
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.activeTouchLookId) {
                    const moveDist = Math.hypot(touch.clientX - this.pointerDownPos.x, touch.clientY - this.pointerDownPos.y);
                    const elapsed = Date.now() - this.pointerDownTime;
                    if (moveDist < 8 && elapsed < 280 && this.mode === "FREE_ROAM") {
                        this.checkTapOnProduct(touch.clientX, touch.clientY);
                    }
                    this.activeTouchLookId = null;
                    break;
                }
            }
        };

        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        this.listenersCleanup.push(() => {
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        });

        // 4. Klaviaturada harakat (Minecraft WASD + Space)
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;

            if (key === " " || key === "space") {
                this.jump();
            }

            if (key === "escape") {
                if (this.mode === "INSPECT") {
                    this.exitInspect();
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        this.listenersCleanup.push(() => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        });
    }

    /**
     * FAQATGINA TO'G'RIDAN-TO'G'RI MAHSULOT USTIGA BOSILGANDA RAYCAST TEKSHIRUVI
     * Adashib ochilib ketish 100% yo'qoladi!
     */
    public checkTapOnProduct(clientX: number, clientY: number) {
        this.tapVector.x = (clientX / window.innerWidth) * 2 - 1;
        this.tapVector.y = -(clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.tapVector, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            // Faqat o'yinchidan yaqin masofadagi (< 5.5 metr) stendlar ochiladi
            if (hit.distance < 5.5 && hit.object.userData?.stand && hit.object.userData?.product) {
                this.inspectStand({
                    stand: hit.object.userData.stand,
                    product: hit.object.userData.product
                });
            }
        }
    }

    public setJoystickMove(vector: { x: number; y: number }) {
        this.joystickVector = vector;
    }

    public jump() {
        if (this.isGrounded && this.mode === "FREE_ROAM") {
            this.verticalVelocity = 5.2;
            this.isGrounded = false;
        }
    }

    public inspectStand(item: { stand: ShowroomShowcaseStand; product: Product }) {
        this.mode = "INSPECT";
        this.inspectCamPos.set(...item.stand.focusPosition);
        this.inspectLookAt.set(...item.stand.lookAtPosition);
        this.callbacks.onSelectProduct(item);
    }

    public exitInspect() {
        this.mode = "FREE_ROAM";
        this.callbacks.onCloseOverlay();
    }

    public teleportTo(pos: [number, number, number], lookAt: [number, number, number]) {
        this.mode = "FREE_ROAM";
        this.playerPos.set(...pos);
        this.velocity.set(0, 0, 0);
        this.verticalVelocity = 0;

        const dx = lookAt[0] - pos[0];
        const dz = lookAt[2] - pos[2];
        this.yaw = Math.atan2(dx, -dz);
        this.pitch = -0.05;
    }

    private distToSegmentSq(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const l2 = dx * dx + dz * dz;
        if (l2 === 0) return (px - x1) * (px - x1) + (pz - z1) * (pz - z1);
        let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
        t = Math.max(0, Math.min(1, t));
        const nx = x1 + t * dx;
        const nz = z1 + t * dz;
        const ex = px - nx;
        const ez = pz - nz;
        return ex * ex + ez * ez;
    }

    private isInsideStorePolygon(px: number, pz: number): boolean {
        let inside = false;
        for (let i = 0, j = STORE_POLYGON_VERTICES.length - 1; i < STORE_POLYGON_VERTICES.length; j = i++) {
            const xi = STORE_POLYGON_VERTICES[i][0];
            const zi = STORE_POLYGON_VERTICES[i][1];
            const xj = STORE_POLYGON_VERTICES[j][0];
            const zj = STORE_POLYGON_VERTICES[j][1];
            const intersect = ((zi > pz) !== (zj > pz)) && (px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    public toggleViewMode(): "FREE_ROAM" | "TOP_DOWN_2D" {
        if (this.mode === "FREE_ROAM") {
            this.mode = "TOP_DOWN_2D";
            this.velocity.set(0, 0, 0);
            this.callbacks.onViewModeChange?.("TOP_DOWN_2D");
            if (document.pointerLockElement) {
                document.exitPointerLock?.();
            }
        } else {
            this.mode = "FREE_ROAM";
            this.callbacks.onViewModeChange?.("FREE_ROAM");
        }
        return this.mode as "FREE_ROAM" | "TOP_DOWN_2D";
    }

    public setViewMode(mode: "FREE_ROAM" | "TOP_DOWN_2D") {
        this.mode = mode;
        if (mode === "TOP_DOWN_2D") {
            this.velocity.set(0, 0, 0);
            if (document.pointerLockElement) {
                document.exitPointerLock?.();
            }
        }
        this.callbacks.onViewModeChange?.(mode);
    }

    private canOccupy(px: number, pz: number): boolean {
        // 1. Ichki stend va mebel to'siqlari bilan to'qnashuv
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (px >= obs.minX && px <= obs.maxX && pz >= obs.minZ && pz <= obs.maxZ) {
                return false;
            }
        }

        // 2. Tashqi ko'cha va asosiy kirish chegaralari (x < -22.0)
        if (px < -22.0) {
            // Ko'chadagi harakat chegaralari (Tiniq ko'k osmon ostidagi shahar ko'chasi)
            if (px < -42.0 || pz < -14.0 || pz > 14.0) {
                return false;
            }
            // Ko'chadan ichkariga kirish: faqatgina oynali eshik orqali (z: 1.2 .. 4.8) o'tish mumkin
            if (px > -22.2 && (pz < 1.2 || pz > 4.8)) {
                return false;
            }
            return true;
        }

        // 3. Do'kon ichidagi devorlar bilan to'qnashuv (x >= -22.0)
        // Oynali eshik bo'lmagan joyda G'arbiy devor to'sadi
        if (px < -21.7 && (pz < 1.2 || pz > 4.8)) {
            return false;
        }

        // Xaritaning ko'pburchak shakli chegaralari ichida bo'lishi shart
        if (px >= -21.6 && !this.isInsideStorePolygon(px, pz)) {
            return false;
        }

        // Barcha 24 ta qattiq perimetr devorlariga 0.38m dan yaqin kelmaslik
        const playerRadiusSq = 0.38 * 0.38;
        for (let i = 1; i < STORE_POLYGON_VERTICES.length - 1; i++) {
            const [x1, z1] = STORE_POLYGON_VERTICES[i];
            const [x2, z2] = STORE_POLYGON_VERTICES[i + 1];
            if (this.distToSegmentSq(px, pz, x1, z1, x2, z2) < playerRadiusSq) {
                return false;
            }
        }

        return true;
    }

    /**
     * MINECRAFT FIZIKASI VA STOLLAR/DEVORLARDAN SIRPANISH (OBSTACLE SLIDING)
     */
    public update(delta: number) {
        if (this.mode === "TOP_DOWN_2D") {
            // 2D TEPADAN KO'RISH REJIMI (Qush parvozi)
            this.camera.position.lerp(this.topDownCamPos, 0.08);
            this.currentTopDownLookAt.lerp(this.topDownLookAt, 0.08);
            this.camera.lookAt(this.currentTopDownLookAt);
        } else if (this.mode === "FREE_ROAM") {
            // 1) Kameraning gorizontal yo'nalishi
            this._forward.set(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            this._right.set(-this._forward.z, 0, this._forward.x);

            // 2) Kiritish: Klaviatura + Suzuvchi Joystik
            this._inputDir.set(0, 0, 0);

            if (this.keysPressed["w"] || this.keysPressed["arrowup"]) this._inputDir.add(this._forward);
            if (this.keysPressed["s"] || this.keysPressed["arrowdown"]) this._inputDir.sub(this._forward);
            if (this.keysPressed["d"] || this.keysPressed["arrowright"]) this._inputDir.add(this._right);
            if (this.keysPressed["a"] || this.keysPressed["arrowleft"]) this._inputDir.sub(this._right);

            if (Math.hypot(this.joystickVector.x, this.joystickVector.y) > 0.06) {
                this._inputDir.addScaledVector(this._forward, this.joystickVector.y);
                this._inputDir.addScaledVector(this._right, this.joystickVector.x);
            }

            if (this._inputDir.lengthSq() > 0) {
                this._inputDir.normalize();
            }

            // 3) Optimal, tez va qulay yurish tezligi (4.8 m/s)
            const walkSpeed = 4.8;
            this._targetVelocity.copy(this._inputDir).multiplyScalar(walkSpeed);

            const accelRate = this._inputDir.lengthSq() > 0 ? 15.0 : 12.0;
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, this._targetVelocity.x, accelRate * delta);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, this._targetVelocity.z, accelRate * delta);

            // 4) Gravitatsiya
            this.verticalVelocity -= 18.0 * delta;
            this.playerPos.y += this.verticalVelocity * delta;

            if (this.playerPos.y <= 1.65) {
                this.playerPos.y = 1.65;
                this.verticalVelocity = 0;
                this.isGrounded = true;
            }

            // 5) To'siqlardan va me'moriy devorlardan silliq sirpanish (Smooth sliding)
            const nextX = this.playerPos.x + this.velocity.x * delta;
            const nextZ = this.playerPos.z + this.velocity.z * delta;

            if (this.canOccupy(nextX, this.playerPos.z)) {
                this.playerPos.x = nextX;
            } else {
                this.velocity.x = 0;
            }

            if (this.canOccupy(this.playerPos.x, nextZ)) {
                this.playerPos.z = nextZ;
            } else {
                this.velocity.z = 0;
            }

            // 6) Head Bobbing
            const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
            if (hSpeed > 0.3 && this.isGrounded) {
                this.bobTimer += delta * 10;
                this.bobOffset.set(
                    Math.cos(this.bobTimer * 0.5) * 0.025 * 0.5,
                    Math.sin(this.bobTimer) * 0.025,
                    0
                );
            } else {
                this.bobOffset.lerp(new THREE.Vector3(0, 0, 0), 8 * delta);
            }

            this.camera.position.copy(this.playerPos).add(this.bobOffset);

            // 7) Kamera yo'nalishi
            this._lookDirection.set(
                Math.sin(this.yaw) * Math.cos(this.pitch),
                Math.sin(this.pitch),
                -Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            this._camTarget.copy(this.camera.position).add(this._lookDirection);
            this.camera.lookAt(this._camTarget);
        } else {
            // INSPECT REJIMI
            this.camera.position.lerp(this.inspectCamPos, 0.09);
            this.currentInspectLookAt.lerp(this.inspectLookAt, 0.09);
            this.camera.lookAt(this.currentInspectLookAt);
        }
    }

    public dispose() {
        this.listenersCleanup.forEach((fn) => fn());
    }
}
