"use client";
import { ReactNode } from "react";
import Tap from "./Tap";

interface ChipProps {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  count?: number;
}

export default function Chip({ active, children, onClick, style = {}, count }: ChipProps) {
  return (
    <Tap
      onClick={onClick}
      style={{
        height: 36,
        padding: "0 16px",
        borderRadius: 18,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: active ? "#0F1410" : "#fff",
        color: active ? "#fff" : "#0F1410",
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: -0.1,
        border: active ? "none" : "1px solid rgba(15,20,16,0.08)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
      {count !== undefined && (
        <span style={{
          fontSize: 11,
          color: active ? "rgba(255,255,255,0.6)" : "#9AA29C",
          fontWeight: 500,
        }}>
          {count}
        </span>
      )}
    </Tap>
  );
}
