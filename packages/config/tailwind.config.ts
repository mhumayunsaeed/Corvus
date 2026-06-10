import type { Config } from "tailwindcss";

/**
 * Channel-based color token.
 * Values live as `R G B` channels in CSS variables (packages/ui/src/styles/tokens.css)
 * so Tailwind opacity modifiers (e.g. `bg-accent-violet/40`) keep working across
 * both themes via the `<alpha-value>` placeholder.
 */
const ch = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "../../apps/web/app/**/*.{ts,tsx}",
    "../../apps/web/components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──────────────────────────────────────
        background: ch("background"),
        "bg-deep": ch("bg-deep"),
        surface: ch("surface"),
        "surface-raised": ch("surface-raised"),
        "surface-overlay": ch("surface-overlay"),
        "surface-glass": "rgb(var(--c-surface) / 0.9)",
        "surface-input": ch("surface-input"),

        // New semantic aliases (preferred for new work)
        "bg-app": ch("background"),
        "bg-sunken": ch("bg-deep"),
        "bg-surface": ch("surface"),
        "bg-raised": ch("surface-raised"),
        "bg-overlay": ch("surface-overlay"),

        // ── Accent palette ────────────────────────────────
        "accent-violet": ch("accent-violet"),
        "accent-violet-bright": ch("accent-violet-bright"),
        "accent-violet-dim": ch("accent-violet-dim"),
        "accent-teal": ch("accent-teal"),
        "accent-teal-dim": ch("accent-teal-dim"),
        "accent-warm": ch("accent-warm"),

        // Brand-neutral accent aliases
        accent: ch("accent-violet"),
        "accent-hover": ch("accent-violet-bright"),
        "accent-pressed": ch("accent-violet-dim"),
        "accent-soft": "rgb(var(--c-accent-violet) / 0.14)",
        "accent-muted": "rgb(var(--c-accent-violet) / 0.5)",
        "accent-contrast": ch("text-on-accent"),
        "on-accent": ch("text-on-accent"),
        live: ch("live"),
        "live-soft": "rgb(var(--c-live) / 0.14)",

        // ── Presence / status ─────────────────────────────
        "status-online": ch("status-online"),
        "status-idle": ch("status-idle"),
        "status-dnd": ch("status-dnd"),

        // ── Text hierarchy ────────────────────────────────
        "text-primary": ch("text-primary"),
        "text-secondary": ch("text-secondary"),
        "text-muted": ch("text-muted"),
        "text-faint": ch("text-faint"),
        "text-on-accent": ch("text-on-accent"),

        // ── Semantic states ───────────────────────────────
        success: ch("success"),
        "success-dim": ch("success-dim"),
        danger: ch("danger"),
        "danger-dim": ch("danger-dim"),
        warning: ch("warning"),
        info: ch("info"),

        // ── Borders ───────────────────────────────────────
        border: ch("border"),
        "border-subtle": ch("border-subtle"),
        "border-highlight": ch("border-highlight"),
        "border-active": ch("border-active"),

        // ── Layout areas ──────────────────────────────────
        "titlebar-bg": ch("titlebar-bg"),
        "channel-sidebar": ch("channel-sidebar"),
        "member-sidebar": ch("member-sidebar"),

        // ── Interactive states ────────────────────────────
        "hover-row": ch("hover-row"),
        "hover-row-strong": ch("hover-row-strong"),
        "active-row": ch("active-row"),
        "active-row-teal": ch("active-row-teal"),
        "reaction-own": ch("reaction-own"),
      },
      backgroundImage: {
        aurora: "var(--aurora-gradient)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        body: ["13px", { lineHeight: "20px" }],
        emphasis: ["15px", { lineHeight: "22px" }],
        heading: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        // Semantic type scale (redesign)
        caption: ["11px", { lineHeight: "15px", letterSpacing: "0.02em" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        "body-sm": ["13px", { lineHeight: "20px" }],
        title: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "display-md": ["30px", { lineHeight: "36px", letterSpacing: "-0.02em" }],
        "display-lg": ["40px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
        "2xl": "28px",
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
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "240ms",
        page: "320ms",
      },
      boxShadow: {
        // Accent glow (amber)
        glow: "0 0 0 1px rgba(232, 163, 61, 0.15), 0 0 20px rgba(232, 163, 61, 0.12), 0 0 40px rgba(232, 163, 61, 0.06)",
        "glow-sm": "0 0 0 1px rgba(232, 163, 61, 0.12), 0 0 12px rgba(232, 163, 61, 0.08)",
        // Teal glow
        "glow-teal": "0 0 0 1px rgba(45, 212, 191, 0.15), 0 0 20px rgba(45, 212, 191, 0.1)",
        "glow-teal-sm": "0 0 0 1px rgba(45, 212, 191, 0.12), 0 0 12px rgba(45, 212, 191, 0.07)",
        // Warm glow
        "glow-warm": "0 0 24px rgba(245, 166, 35, 0.15)",
        // Elevation shadows (legacy names kept)
        float: "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)",
        "float-lg": "0 10px 25px -5px rgba(0,0,0,0.4), 0 4px 10px -5px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.04), inset 0 -1px 0 rgba(0,0,0,0.15)",
        // Input focus
        "focus-violet": "0 0 0 2px rgba(232, 163, 61, 0.2)",
        "focus-accent": "0 0 0 3px rgba(232, 163, 61, 0.25)",
        // Modal
        modal: "0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        // Theme-aware elevation system (e1–e4)
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)",
        e3: "var(--shadow-e3)",
        e4: "var(--shadow-e4)",
        aurora: "var(--aurora-glow)",
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
