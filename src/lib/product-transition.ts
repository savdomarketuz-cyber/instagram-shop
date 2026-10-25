/**
 * Shared Element / Hero Transition Controller for Velari Products
 * Bosilgan kartochkaning o'rnidan tovar sahifasidagi o'rniga 0ms da silliq kattalashuvchi tizim.
 */

export interface TransitionProductPayload {
    id: string;
    name: string;
    name_uz?: string;
    name_ru?: string;
    price: number;
    oldPrice?: number;
    image: string;
    cardImgSrc?: string;
    secondImgSrc?: string;
    images?: string[];
    isOriginal?: boolean;
    rating?: number;
    reviewCount?: number;
    image_metadata?: any;
    rect: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
}

type TransitionListener = (payload: TransitionProductPayload | null) => void;
type ReadyListener = (productId?: string) => void;

class ProductTransitionManager {
    private listeners = new Set<TransitionListener>();
    private readyListeners = new Set<ReadyListener>();
    private activePayload: TransitionProductPayload | null = null;
    private destinationReady: boolean = false;

    subscribe(listener: TransitionListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    subscribeReady(listener: ReadyListener) {
        this.readyListeners.add(listener);
        return () => {
            this.readyListeners.delete(listener);
        };
    }

    trigger(payload: TransitionProductPayload) {
        this.activePayload = payload;
        this.destinationReady = false;
        this.listeners.forEach((fn) => fn(payload));
    }

    markReady(productId?: string) {
        this.destinationReady = true;
        this.readyListeners.forEach((fn) => fn(productId));
    }

    isReady() {
        return this.destinationReady;
    }

    clear() {
        this.activePayload = null;
        this.destinationReady = false;
        this.listeners.forEach((fn) => fn(null));
    }

    getActive() {
        return this.activePayload;
    }
}

export const productTransitionManager = new ProductTransitionManager();
