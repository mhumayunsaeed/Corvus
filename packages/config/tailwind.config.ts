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
        // Core backgrounds — richer, more layered depth
        background: "#0C0D12",
        "bg-deep": "#08090D",
        surface: "#15161E",
        "surface-raised": "#1C1D28",
        "surface-overlay": "#1A1B26",
        "surface-glass": "rgba(22, 23, 34, 0.85)",

        // Accent palette — refined primary + warm secondary
        "accent-violet": "#7C6AF7",
        "accent-violet-bright": "#8B7BFF",
        "accent-teal": "#36D1B7",
        "accent-warm": "#F5A623",

        // Text hierarchy
        "text-primary": "#EDEEF3",
        "text-secondary": "#B8BCCC",
        "text-muted": "#6E7384",
        "text-faint": "#4A4E5E",

        // Semantic
        success: "#34D399",
        danger: "#F06370",
        warning: "#FBBF24",
        info: "#60A5FA",

        // Borders — more refined
        border: "#232536",
        "border-subtle": "#1C1E2E",
        "border-highlight": "#2D3050",

        // Layout areas
        "titlebar-bg": "#08090D",
        "channel-sidebar": "#111219",
        "member-sidebar": "#111219",

        // Interactive
        "hover-row": "#1A1C2A",
        "active-row": "#22243A",
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
        glow: "0 0 24px rgba(124, 106, 247, 0.2), 0 0 8px rgba(124, 106, 247, 0.1)",
        "glow-teal": "0 0 24px rgba(54, 209, 183, 0.2), 0 0 8px rgba(54, 209, 183, 0.1)",
        "glow-warm": "0 0 24px rgba(245, 166, 35, 0.15)",
        "float": "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
      },
      animation: {
        "speaking-pulse": "speakingPulse 0.8s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        speakingPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
