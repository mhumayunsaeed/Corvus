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
        // Core backgrounds — deep, dark, layered
        background: "#0A0B11",
        "bg-deep": "#07080D",
        surface: "#111219",
        "surface-raised": "#171821",
        "surface-overlay": "#1D1E2C",
        "surface-glass": "rgba(17, 18, 25, 0.9)",
        "surface-input": "#13141C",

        // Accent palette — premium violet + teal
        "accent-violet": "#7C6AF7",
        "accent-violet-bright": "#9284FF",
        "accent-violet-dim": "#5B4FBD",
        "accent-teal": "#2DD4BF",
        "accent-teal-dim": "#1E9E8E",
        "accent-warm": "#F5A623",

        // Text hierarchy — clear, readable
        "text-primary": "#ECEDF5",
        "text-secondary": "#AEB3C8",
        "text-muted": "#656A7E",
        "text-faint": "#3D4057",

        // Semantic
        success: "#22C55E",
        "success-dim": "#16A34A",
        danger: "#EF4444",
        "danger-dim": "#B91C1C",
        warning: "#F59E0B",
        info: "#3B82F6",

        // Borders — refined, layered depth
        border: "#1E2030",
        "border-subtle": "#161724",
        "border-highlight": "#272A40",
        "border-active": "#3D3F60",

        // Layout areas
        "titlebar-bg": "#07080D",
        "channel-sidebar": "#0E0F16",
        "member-sidebar": "#0E0F16",

        // Interactive states
        "hover-row": "#14151F",
        "hover-row-strong": "#1A1B28",
        "active-row": "#1E2035",
        "active-row-teal": "#0D2520",
        "reaction-own": "#231A52",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        body: ["13px", { lineHeight: "20px" }],
        emphasis: ["15px", { lineHeight: "22px" }],
        heading: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      spacing: {
        titlebar: "32px",
        "server-rail": "68px",
        "channel-sidebar": "240px",
        "member-sidebar": "220px",
      },
      backdropBlur: {
        glass: "16px",
        "glass-sm": "8px",
      },
      boxShadow: {
        // Violet glow
        glow: "0 0 0 1px rgba(124, 106, 247, 0.15), 0 0 20px rgba(124, 106, 247, 0.12), 0 0 40px rgba(124, 106, 247, 0.06)",
        "glow-sm": "0 0 0 1px rgba(124, 106, 247, 0.12), 0 0 12px rgba(124, 106, 247, 0.08)",
        // Teal glow
        "glow-teal": "0 0 0 1px rgba(45, 212, 191, 0.15), 0 0 20px rgba(45, 212, 191, 0.1)",
        "glow-teal-sm": "0 0 0 1px rgba(45, 212, 191, 0.12), 0 0 12px rgba(45, 212, 191, 0.07)",
        // Warm glow
        "glow-warm": "0 0 24px rgba(245, 166, 35, 0.15)",
        // Elevation shadows
        "float": "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)",
        "float-lg": "0 10px 25px -5px rgba(0,0,0,0.4), 0 4px 10px -5px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0,0,0,0.15)",
        // Input focus
        "focus-violet": "0 0 0 2px rgba(124, 106, 247, 0.2)",
        // Modal
        "modal": "0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
      },
      animation: {
        "speaking-pulse": "speakingPulse 0.8s ease-in-out infinite",
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-up": "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in-sm": "scaleInSm 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        speakingPulse: {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
          "50%": { transform: "scale(1.04)", boxShadow: "0 0 0 3px rgba(45, 212, 191, 0.2)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleInSm: {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
