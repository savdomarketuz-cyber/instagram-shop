"use client";

import { useEffect, useRef } from "react";

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface TelegramLoginButtonProps {
    botName: string;
    onAuth: (user: TelegramUser) => void;
    buttonSize?: "large" | "medium" | "small";
    cornerRadius?: number;
    requestAccess?: "write";
    usePic?: boolean;
}

export const TelegramLoginButton = ({
    botName, onAuth, buttonSize = "large", cornerRadius = 20, requestAccess = "write", usePic = true
}: TelegramLoginButtonProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Prevent script from loading multiple times
        if (containerRef.current?.innerHTML !== "") return;

        // @ts-ignore
        window.onTelegramAuth = (user: TelegramUser) => {
            onAuth(user);
        };

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", botName);
        script.setAttribute("data-size", buttonSize);
        script.setAttribute("data-radius", cornerRadius.toString());
        script.setAttribute("data-request-access", requestAccess);
        script.setAttribute("data-userpic", usePic.toString());
        script.setAttribute("data-onauth", "onTelegramAuth(user)");
        script.async = true;

        containerRef.current?.appendChild(script);

        return () => {
             // Cleanup global callback
             // @ts-ignore
             delete window.onTelegramAuth;
        };
    }, [botName, onAuth, buttonSize, cornerRadius, requestAccess, usePic]);

    return (
        <div ref={containerRef} className="flex justify-center transition-all hover:scale-105 active:scale-95" />
    );
};
