const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BDjNKYY_cp8NDYQsowXfhIlfikWZmhCDTvFJOWubcNwvOW-LPnBH70sITFARnWBxHOOF-xuT3d3kuy9lkwzQKs8";

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribeToPushNotifications(userPhone?: string) {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return;
    }

    // Telefon raqam berilmagan bo'lsa, localStorage/state dan qidiramiz
    let phone = userPhone;
    if (!phone) {
        try {
            const rawStore = localStorage.getItem("velari-store");
            if (rawStore) {
                const parsed = JSON.parse(rawStore);
                phone = parsed?.state?.user?.phone || undefined;
            }
        } catch {}
    }

    try {
        // Agar ruxsat berilmagan bo'lsa, so'raymiz
        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;
        } else if (Notification.permission !== "granted") {
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            };
            subscription = await registration.pushManager.subscribe(subscribeOptions);
        }

        // ⚠️ MUHIM: Obuna mavjud bo'lsa ham, uni doim serverga yuboramiz (telefon raqam bilan bog'lash uchun)
        if (subscription) {
            await fetch("/api/auth/push-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscription,
                    userPhone: userPhone || undefined,
                    platform: "web"
                })
            });
        }

        return subscription;
    } catch (error) {
        console.error("Push obuna xatosi:", error);
    }
}
