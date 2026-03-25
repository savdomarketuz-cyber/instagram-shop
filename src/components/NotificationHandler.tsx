"use client";

import { useEffect } from 'react';
import { messaging, getToken, onMessage } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/store';

export default function NotificationHandler() {
    const { user } = useStore();

    useEffect(() => {
        if (typeof window === "undefined" || !messaging) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
                    
                    if (vapidKey && messaging) {
                        const token = await getToken(messaging, { vapidKey });

                        if (token && user?.phone) {
                            // Store token in Supabase to target this user later
                            await supabase.from("fcm_tokens").upsert({
                                user_phone: user.phone,
                                token: token,
                                last_updated: new Date().toISOString(),
                                platform: 'web'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token. ', error);
            }
        };

        if (user?.phone) {
            const checkPermission = async () => {
                if (Notification.permission === 'granted') {
                    requestPermission();
                }
            };
            checkPermission();
        }

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
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
