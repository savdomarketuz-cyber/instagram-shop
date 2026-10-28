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
}

export class ShowroomControls {
    public mode: "FREE_ROAM" | "INSPECT" = "FREE_ROAM";
    public playerPos = new THREE.Vector3(-17.0, 1.65, 3.0);
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

    // TO'SIQLAR: 7 ta bo'lim stollari va tokchalari (Xarita diagrammasi bo'yicha)
    private obstacles: ObstacleBox[] = [
        // 1. Markaziy "MOBILE & TABLETS" doiraviy oroli (x: 0, z: 0)
        { minX: -2.4, maxX: 2.4, minZ: -2.4, maxZ: 2.4 },

        // 2. Trimmerlar bo'lim stoli (x: -9.5, z: -4.5)
        { minX: -11.8, maxX: -7.2, minZ: -5.4, maxZ: -3.6 },

        // 3. Sheyverlar bo'lim stoli (x: -9.5, z: 5.0)
        { minX: -11.8, maxX: -7.2, minZ: 4.1, maxZ: 5.9 },

        // 4. TV & Sound tokchasi va peshtaxtasi (x: 3.5, z: -7.8)
        { minX: -0.9, maxX: 7.9, minZ: -8.4, maxZ: -7.2 },

        // 5. Katta maishiy texnikalar tokchasi (x: -9.5, z: -9.2)
        { minX: -13.9, maxX: -5.1, minZ: -10.2, maxZ: -8.6 },

        // 6. Oshxona & mayda texnikalar tokchasi (x: -9.5, z: 9.2)
        { minX: -13.9, maxX: -5.1, minZ: 8.6, maxZ: 10.2 },

        // 7. Aksessuarlar va tarmoq tokchasi (x: 6.5, z: 8.5)
        { minX: 2.1, maxX: 10.9, minZ: 7.9, maxZ: 9.1 },

        // 8. Checkout & Kassa stollari (x: 18.0, z: -2.0 .. 1.9)
        { minX: 17.2, maxX: 18.8, minZ: -2.6, maxZ: 2.5 },

        // 9. Mijozlarga xizmat va servis stoli (x: 18.0, z: 5.5)
        { minX: 17.2, maxX: 18.8, minZ: 4.0, maxZ: 7.0 }
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

    private canOccupy(px: number, pz: number): boolean {
        // 1. Ichki stend va mebel to'siqlari bilan to'qnashuv
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            if (px >= obs.minX && px <= obs.maxX && pz >= obs.minZ && pz <= obs.maxZ) {
                return false;
            }
        }

        // 2. Tashqi ko'cha va asosiy kirish chegaralari (x < -20.0)
        if (px < -20.0) {
            // Ko'chadagi harakat chegaralari (Tiniq ko'k osmon ostidagi shahar ko'chasi)
            if (px < -37.0 || pz < -11.0 || pz > 17.0) {
                return false;
            }
            // Ko'chadan ichkariga kirish: faqatgina oynali eshik orqali (z: 1.2 .. 4.8) o'tish mumkin
            if (px > -20.2 && (pz < 1.2 || pz > 4.8)) {
                return false;
            }
            return true;
        }

        // 3. Do'kon ichidagi devorlar bilan to'qnashuv (x >= -20.0)
        // Oynali eshik bo'lmagan joyda G'arbiy devor to'sadi
        if (px < -19.7 && (pz < 1.2 || pz > 4.8)) {
            return false;
        }

        // Xaritaning ko'pburchak shakli chegaralari ichida bo'lishi shart
        if (px >= -19.6 && !this.isInsideStorePolygon(px, pz)) {
            return false;
        }

        // Barcha 23 ta qattiq perimetr devorlariga 0.38m dan yaqin kelmaslik
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
        if (this.mode === "FREE_ROAM") {
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
