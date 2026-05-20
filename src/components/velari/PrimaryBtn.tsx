"use client";
import { ReactNode } from "react";
import Tap from "./Tap";

interface PrimaryBtnProps {
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
  icon?: ReactNode;
  style?: React.CSSProperties;
  variant?: "solid" | "outline";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

const GREEN = "#2D6E3E";

export default function PrimaryBtn({
  children,
  onClick,
  full = true,
  icon,
  style = {},
  variant = "solid",
  disabled = false,
  type = "button",
}: PrimaryBtnProps) {
  const isSolid = variant === "solid";
  return (
    <Tap
      as="button"
      onClick={onClick}
      style={{
        width: full ? "100%" : "auto",
        height: 54,
        borderRadius: 27,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: isSolid ? (disabled ? "#9AA29C" : GREEN) : "transparent",
        color: isSolid ? "#fff" : GREEN,
        border: isSolid ? "none" : `1.5px solid ${GREEN}`,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: -0.2,
        boxShadow: isSolid && !disabled
          ? "0 8px 24px rgba(45,110,62,0.28), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "none",
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      {...({ type } as Record<string, unknown>)}
    >
      {icon}
      <span>{children}</span>
    </Tap>
  );
}
