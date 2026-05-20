"use client";
import { ReactNode, useEffect } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: string | number;
  title?: string;
}

export default function Sheet({ open, onClose, children, height = "auto", title }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          animation: "velari-fade-in 240ms ease-out forwards",
        }}
      />
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        zIndex: 201,
        height,
        maxHeight: "90dvh",
        overflowY: "auto",
        animation: "velari-sheet-up 380ms cubic-bezier(0.22,1,0.36,1) forwards",
        transform: "translateY(100%)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "rgba(15,20,16,0.12)" }} />
        </div>
        {title && (
          <div style={{
            padding: "14px 20px 0",
            fontSize: 17,
            fontWeight: 700,
            color: "#0F1410",
            letterSpacing: -0.3,
          }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
