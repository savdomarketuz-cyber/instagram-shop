"use client";

import { useEffect } from 'react';
import { messaging, getToken, onMessage, db, doc, setDoc } from '@/lib/firebase';
import { useStore } from '@/store/store';

export default function NotificationHandler() {
    const { user } = useStore();

    useEffect(() => {
        if (typeof window === "undefined" || !messaging) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // console.log('Notification permission granted.');
                    
                    // You need to generate a VAPID key in Firebase Console
                    // Project Settings -> Cloud Messaging -> Web Push certificates
                    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                    
                    if (vapidKey && messaging) {
                        const token = await getToken(messaging, { vapidKey });

                        if (token && user?.phone) {
                            // Store token in Firestore to target this user later
                            await setDoc(doc(db, "fcm_tokens", user.phone), {
                                token: token,
                                lastUpdated: new Date().toISOString(),
                                platform: 'web'
                            }, { merge: true });
                        }
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token. ', error);
            }
        };

        if (user?.phone) {
            const checkPermission = async () => {
                if (Notification.permission === 'default') {
                    // Do not ask yet, browsers require user interaction for requestPermission
                    // console.log('Notification permission is default. Waiting for user interaction to ask.');
                } else if (Notification.permission === 'granted') {
                    requestPermission(); // Already granted, just refresh token
                }
            };
            checkPermission();
        }

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            // Show custom toast or browser notification if app is in foreground
            if (payload.notification) {
                new Notification(payload.notification.title || 'New Message', {
                    body: payload.notification.body,
                    icon: '/icons/icon-192x192.png'
                });
            }
        });

        return () => unsubscribe();
    }, [user?.phone]);

    return null;
}
