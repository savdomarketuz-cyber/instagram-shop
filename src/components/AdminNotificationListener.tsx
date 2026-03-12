"use client";

import { useEffect, useState } from 'react';
import { db, collection, query, onSnapshot } from '@/lib/firebase';

export function AdminNotificationListener() {
    const [lastLoadTime] = useState(Date.now());

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Ask for permission if not granted
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const q = query(collection(db, "orders"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const orderData = change.doc.data();
                    
                    // Convert createdAt timestamp to ms safely
                    let orderTime = 0;
                    if (orderData.createdAt?.toMillis) {
                        orderTime = orderData.createdAt.toMillis();
                    } else if (typeof orderData.createdAt === 'number') {
                        orderTime = orderData.createdAt;
                    } else if (typeof orderData.createdAt === 'string') {
                        orderTime = new Date(orderData.createdAt).getTime();
                    }

                    // Only notify for completely new orders exactly AFTER admin loaded the page
                    if (orderTime > lastLoadTime && (!orderData.status || orderData.status === 'pending')) {
                        if (Notification.permission === 'granted') {
                            new Notification('Yangi buyurtma! 🛍️', {
                                body: `Telefon: ${orderData.phone || "Noma'lum"}\nSumma: ${orderData.totalAmount?.toLocaleString() || 0} so'm`,
                                icon: '/icons/icon-192x192.png',
                            });
                        }
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [lastLoadTime]);

    return null;
}
