import * as THREE from "three";
import { Product } from "@/types";
import { ShowroomShowcaseStand } from "./showroom-data";

export interface ObstacleBox {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

export interface ShowroomControlsCallbacks {
    onSelectProduct: (item: { stand: ShowroomShowcaseStand; product: Product }) => void;
    onCloseOverlay: () => void;
    onNearbyChange: (item: { stand: ShowroomShowcaseStand; product: Product } | null, isAiming: boolean) => void;
    onPointerLockChange?: (locked: boolean) => void;
}

export class ShowroomControls {
    public mode: "FREE_ROAM" | "INSPECT" = "FREE_ROAM";
    public playerPos = new THREE.Vector3(0, 1.65, 8.5);
    public velocity = new THREE.Vector3(0, 0, 0);
    public verticalVelocity = 0;
    public isGrounded = true;
    public yaw = 0;
    public pitch = -0.05;
    public invertY = false;

    private bobTimer = 0;
    private bobOffset = new THREE.Vector3(0, 0, 0);

    // Inspect rejimidagi kamera parametrlari
    public inspectCamPos = new THREE.Vector3(0, 1.65, 8.5);
    public inspectLookAt = new THREE.Vector3(0, 1.1, -0.5);
    private currentInspectLookAt = new THREE.Vector3(0, 1.1, -0.5);

    // Kiritish holatlari
    private keysPressed: Record<string, boolean> = {};
    private joystickVector = { x: 0, y: 0 };
    public isSprinting = false;

    // Sichqoncha va sensorli teginish
    private isPointerLocked = false;
    private isMouseDown = false;
    private previousMousePos = { x: 0, y: 0 };

    // Sensorli ekran (Touch Look)
    private activeTouchLookId: number | null = null;
    private touchLookPrevX = 0;
    private touchLookPrevY = 0;
    private touchStartTime = 0;

    // Raycasting va nishon
    private raycaster = new THREE.Raycaster();
    private screenCenter = new THREE.Vector2(0, 0);
    public nearbyItemData: { stand: ShowroomShowcaseStand; product: Product } | null = null;
    public isAimingAtItem = false;

    // To'siqlar: 4 ta katta eman stol (uzunligi 4.2m, kengligi 1.6m) + o'yinchi radiusi 0.35m
    private obstacles: ObstacleBox[] = [
        { minX: -7.95, maxX: -3.05, minZ: -1.65, maxZ: 0.65 }, // Trimmers (x: -5.5, z: -0.5)
        { minX: -2.45, maxX: 2.45, minZ: -5.65, maxZ: -3.35 },  // Hair Care (x: 0.0, z: -4.5)
        { minX: 3.05, maxX: 7.95, minZ: -1.65, maxZ: 0.65 },   // Shavers (x: 5.5, z: -0.5)
        { minX: -2.45, maxX: 2.45, minZ: 2.35, maxZ: 4.65 }     // Gadgets (x: 0.0, z: 3.5)
    ];

    // Qayta ishlatiluvchi yordamchi vektorlar (Garbage Collector yuki bo'lmasligi uchun)
    private _forward = new THREE.Vector3();
    private _right = new THREE.Vector3();
    private _inputDir = new THREE.Vector3();
    private _targetVelocity = new THREE.Vector3();
    private _lookDirection = new THREE.Vector3();
    private _camTarget = new THREE.Vector3();

    private container: HTMLElement;
    private camera: THREE.PerspectiveCamera;
    private stands: ShowroomShowcaseStand[];
    private interactiveMeshes: THREE.Object3D[];
    private callbacks: ShowroomControlsCallbacks;

    // Event listener tozalash uchun
    private listenersCleanup: (() => void)[] = [];

    constructor(
        container: HTMLElement,
        camera: THREE.PerspectiveCamera,
        stands: ShowroomShowcaseStand[],
        interactiveMeshes: THREE.Object3D[],
        callbacks: ShowroomControlsCallbacks
    ) {
        this.container = container;
        this.camera = camera;
        this.stands = stands;
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

        // 2. Mouse Look & Drag
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

            if (!document.pointerLockElement && this.mode === "FREE_ROAM") {
                this.container.requestPointerLock?.();
            }

            this.isMouseDown = true;
            this.previousMousePos = { x: e.clientX, y: e.clientY };

            // Agar nishonda turgan bo'lsa darhol ochish
            if (this.nearbyItemData && this.mode === "FREE_ROAM") {
                this.inspectStand(this.nearbyItemData);
            }
        };

        const onMouseUp = () => {
            this.isMouseDown = false;
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        this.listenersCleanup.push(() => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
        });

        // 3. Sensorli Ekran (Touch 360° Drag Look)
        const onTouchStart = (e: TouchEvent) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = touch.target as HTMLElement;
                if (target.closest("button") || target.closest("a") || target.closest(".no-drag")) {
                    continue;
                }
                // Agar joystick maydonida bo'lmasa, qarash (camera look) uchun olamiz
                if (this.activeTouchLookId === null) {
                    this.activeTouchLookId = touch.identifier;
                    this.touchLookPrevX = touch.clientX;
                    this.touchLookPrevY = touch.clientY;
                    this.touchStartTime = Date.now();
                    break;
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

                    const touchSensitivity = 0.0042;
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
                    const elapsed = Date.now() - this.touchStartTime;
                    // Agar qisqa tap bo'lsa va nishonda tovar bo'lsa, ochish
                    if (elapsed < 280 && this.nearbyItemData && this.mode === "FREE_ROAM") {
                        this.inspectStand(this.nearbyItemData);
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

        // 4. Klaviaturada harakat (Minecraft WASD + Space + Shift)
        const onKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;

            if (key === "shift") {
                this.isSprinting = true;
            }

            if (key === " " || key === "space") {
                this.jump();
            }

            if (key === "e") {
                if (this.mode === "FREE_ROAM" && this.nearbyItemData) {
                    this.inspectStand(this.nearbyItemData);
                } else if (this.mode === "INSPECT") {
                    this.exitInspect();
                }
            }

            if (key === "escape") {
                if (this.mode === "INSPECT") {
                    this.exitInspect();
                }
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false;
            if (key === "shift") {
                this.isSprinting = false;
            }
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        this.listenersCleanup.push(() => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        });
    }

    /**
     * Virtual Joystick'dan olingan harakat vektori (-1..1)
     */
    public setJoystickMove(vector: { x: number; y: number }) {
        this.joystickVector = vector;
    }

    /**
     * Sakrash harakati (Minecraft Jump Impulse)
     */
    public jump() {
        if (this.isGrounded && this.mode === "FREE_ROAM") {
            this.verticalVelocity = 5.2; // m/s sakrash kuchlanishi
            this.isGrounded = false;
        }
    }

    /**
     * Vitrinaga silliq yaqinlashib ko'rish
     */
    public inspectStand(item: { stand: ShowroomShowcaseStand; product: Product }) {
        this.mode = "INSPECT";
        this.inspectCamPos.set(...item.stand.focusPosition);
        this.inspectLookAt.set(...item.stand.lookAtPosition);
        this.callbacks.onSelectProduct(item);
    }

    /**
     * Erkin harakatga qaytish
     */
    public exitInspect() {
        this.mode = "FREE_ROAM";
        this.callbacks.onCloseOverlay();
    }

    /**
     * Belgilangan nuqtaga va burchakka bir zumda teleport qilish
     */
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

    /**
     * Minecraft uslubidagi fizik harakat va to'siqlardan sirpanish
     */
    public update(delta: number, frameCount: number) {
        if (this.mode === "FREE_ROAM") {
            // 1) Kameraning gorizontal yo'nalishi (Horizontal Yaw)
            this._forward.set(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            this._right.set(-this._forward.z, 0, this._forward.x);

            // 2) Kiritish yo'nalishi: Klaviaturadagi tugmalar + Virtual Joystick
            this._inputDir.set(0, 0, 0);

            if (this.keysPressed["w"] || this.keysPressed["arrowup"]) this._inputDir.add(this._forward);
            if (this.keysPressed["s"] || this.keysPressed["arrowdown"]) this._inputDir.sub(this._forward);
            if (this.keysPressed["d"] || this.keysPressed["arrowright"]) this._inputDir.add(this._right);
            if (this.keysPressed["a"] || this.keysPressed["arrowleft"]) this._inputDir.sub(this._right);

            // Virtual Joystick qo'shish
            if (Math.hypot(this.joystickVector.x, this.joystickVector.y) > 0.08) {
                this._inputDir.addScaledVector(this._forward, this.joystickVector.y);
                this._inputDir.addScaledVector(this._right, this.joystickVector.x);
            }

            if (this._inputDir.lengthSq() > 0) {
                this._inputDir.normalize();
            }

            // 3) Minecraft tezlanishi va yer ishqalanishi (Ground Friction & Glide)
            const speed = this.isSprinting ? 6.8 : 4.0;
            this._targetVelocity.copy(this._inputDir).multiplyScalar(speed);

            const accelRate = this._inputDir.lengthSq() > 0 ? 14.0 : 12.0;
            this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, this._targetVelocity.x, accelRate * delta);
            this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, this._targetVelocity.z, accelRate * delta);

            // 4) Gravitatsiya va Sakrash
            this.verticalVelocity -= 18.0 * delta;
            this.playerPos.y += this.verticalVelocity * delta;

            if (this.playerPos.y <= 1.65) {
                this.playerPos.y = 1.65;
                this.verticalVelocity = 0;
                this.isGrounded = true;
            }

            // 5) To'siqlardan sirpanish (Obstacle Sliding Physics)
            // X va Z o'qlari bo'yicha alohida tekshiriladi, bu o'yinchiga devor bo'ylab silliq sirpanish imkonini beradi.
            const nextX = this.playerPos.x + this.velocity.x * delta;
            const nextZ = this.playerPos.z + this.velocity.z * delta;

            let canMoveX = true;
            if (nextX < -12.4 || nextX > 12.4) canMoveX = false;
            for (let i = 0; i < this.obstacles.length; i++) {
                const obs = this.obstacles[i];
                if (nextX >= obs.minX && nextX <= obs.maxX && this.playerPos.z >= obs.minZ && this.playerPos.z <= obs.maxZ) {
                    canMoveX = false;
                    break;
                }
            }
            if (canMoveX) {
                this.playerPos.x = nextX;
            } else {
                this.velocity.x = 0;
            }

            let canMoveZ = true;
            if (nextZ < -11.8 || nextZ > 11.2) canMoveZ = false;
            for (let i = 0; i < this.obstacles.length; i++) {
                const obs = this.obstacles[i];
                if (this.playerPos.x >= obs.minX && this.playerPos.x <= obs.maxX && nextZ >= obs.minZ && nextZ <= obs.maxZ) {
                    canMoveZ = false;
                    break;
                }
            }
            if (canMoveZ) {
                this.playerPos.z = nextZ;
            } else {
                this.velocity.z = 0;
            }

            // 6) Head Bobbing (Qadam bosish tebranishi)
            const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
            if (horizontalSpeed > 0.3 && this.isGrounded) {
                const bobFreq = this.isSprinting ? 14 : 9;
                this.bobTimer += delta * bobFreq;
                const bobAmp = this.isSprinting ? 0.040 : 0.022;
                this.bobOffset.set(
                    Math.cos(this.bobTimer * 0.5) * bobAmp * 0.5,
                    Math.sin(this.bobTimer) * bobAmp,
                    0
                );
            } else {
                this.bobOffset.lerp(new THREE.Vector3(0, 0, 0), 8 * delta);
            }

            this.camera.position.copy(this.playerPos).add(this.bobOffset);

            // 7) Kamera qarashi
            this._lookDirection.set(
                Math.sin(this.yaw) * Math.cos(this.pitch),
                Math.sin(this.pitch),
                -Math.cos(this.yaw) * Math.cos(this.pitch)
            );
            this._camTarget.copy(this.camera.position).add(this._lookDirection);
            this.camera.lookAt(this._camTarget);

            // 8) Nishon (Raycasting) va Yaqinlik tekshiruvi (Har 2 kadrda)
            if (frameCount % 2 === 0) {
                this.raycaster.setFromCamera(this.screenCenter, this.camera);
                const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

                let foundNearby: { stand: ShowroomShowcaseStand; product: Product } | null = null;
                let aiming = false;

                if (intersects.length > 0 && intersects[0].distance < 6.5) {
                    const hitObj = intersects[0].object;
                    if (hitObj.userData?.itemData) {
                        foundNearby = hitObj.userData.itemData;
                        aiming = true;
                    }
                }

                // Agar to'g'ridan-to'g'ri nishonga olinmagan bo'lsa, eng yaqin stendni topish
                if (!foundNearby) {
                    let minDistance = 2.8;
                    for (let i = 0; i < this.stands.length; i++) {
                        const stand = this.stands[i];
                        const dist = Math.hypot(
                            this.playerPos.x - stand.position[0],
                            this.playerPos.z - stand.position[2]
                        );
                        if (dist < minDistance) {
                            minDistance = dist;
                            foundNearby = { stand, product: stand.product };
                        }
                    }
                }

                this.nearbyItemData = foundNearby;
                this.isAimingAtItem = aiming;
                this.callbacks.onNearbyChange(foundNearby, aiming);
            }
        } else {
            // INSPECT REJIMI (Ekran oldiga silliq yaqinlashish va qarash)
            this.camera.position.lerp(this.inspectCamPos, 0.09);
            this.currentInspectLookAt.lerp(this.inspectLookAt, 0.09);
            this.camera.lookAt(this.currentInspectLookAt);
        }
    }

    public dispose() {
        this.listenersCleanup.forEach((fn) => fn());
    }
}
