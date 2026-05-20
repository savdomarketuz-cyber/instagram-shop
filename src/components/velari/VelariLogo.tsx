import { CSSProperties } from "react";

interface VelariLogoProps {
  size?: number;
  dark?: boolean;
  style?: CSSProperties;
}

const GREEN = "#2D6E3E";

export default function VelariLogo({ size = 32, dark = false, style = {} }: VelariLogoProps) {
  const fg = dark ? "#fff" : "#0F1410";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, ...style }}>
      <span style={{
        fontFamily: "-apple-system, system-ui, sans-serif",
        fontSize: size,
        fontWeight: 800,
        letterSpacing: -size * 0.04,
        color: fg,
        lineHeight: 1,
      }}>
        VELARI<span style={{ color: GREEN }}>.</span>
      </span>
      <svg width={size * 2.3} height={size * 0.36} viewBox="0 0 100 14">
        <path
          d="M2 4 Q50 18 98 4"
          stroke={GREEN}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
