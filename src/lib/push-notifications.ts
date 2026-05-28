const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
    }
    if (!VAPID_PUBLIC_KEY) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            return existingSubscription;
        }

        const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        };

        const subscription = await registration.pushManager.subscribe(subscribeOptions);

        // Serverga yuborish
        await fetch("/api/auth/push-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subscription,
                userPhone,
                platform: "web"
            })
        });

        return subscription;
    } catch (error) {
        console.error("Push obuna xatosi:", error);
    }
}
