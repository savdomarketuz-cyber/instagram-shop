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
    image_metadata?: any;
    rect: {
        top: number;
        left: number;
        width: number;
        height: number;
    };
}

type TransitionListener = (payload: TransitionProductPayload | null) => void;

class ProductTransitionManager {
    private listeners = new Set<TransitionListener>();
    private activePayload: TransitionProductPayload | null = null;

    subscribe(listener: TransitionListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    trigger(payload: TransitionProductPayload) {
        this.activePayload = payload;
        this.listeners.forEach((fn) => fn(payload));
    }

    clear() {
        this.activePayload = null;
        this.listeners.forEach((fn) => fn(null));
    }

    getActive() {
        return this.activePayload;
    }
}

export const productTransitionManager = new ProductTransitionManager();
