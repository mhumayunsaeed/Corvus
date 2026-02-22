import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "../../apps/web/app/**/*.{ts,tsx}",
    "../../apps/web/components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F0F13",
        surface: "#18181F",
        "surface-raised": "#1E1E27",
        "accent-violet": "#7C6AF7",
        "accent-teal": "#3ECFCF",
        "text-primary": "#F0EFF5",
        "text-muted": "#8A8A9A",
        success: "#3ECF8E",
        danger: "#F75F6E",
        border: "#2A2A35",
        "titlebar-bg": "#0A0A0F",
        "channel-sidebar": "#13131A",
        "hover-row": "#1A1A22",
        "reaction-own": "#2A1F5A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "16px" }],
        body: ["13px", { lineHeight: "20px" }],
        emphasis: ["15px", { lineHeight: "22px" }],
        heading: ["20px", { lineHeight: "28px" }],
        display: ["32px", { lineHeight: "40px" }],
      },
      borderRadius: {
        sm: "8px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
      },
      spacing: {
        titlebar: "32px",
        "server-rail": "68px",
        "channel-sidebar": "240px",
        "member-sidebar": "220px",
      },
      backdropBlur: {
        glass: "12px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(124, 106, 247, 0.15)",
        "glow-teal": "0 0 20px rgba(62, 207, 207, 0.15)",
      },
      animation: {
        "speaking-pulse": "speakingPulse 0.8s ease-in-out infinite",
      },
      keyframes: {
        speakingPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
