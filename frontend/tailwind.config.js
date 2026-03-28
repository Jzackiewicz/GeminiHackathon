import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["Manrope", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        label: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#f7f9fb",
        surface: {
          DEFAULT: "#f7f9fb",
          dim: "#d8dadc",
          bright: "#f7f9fb",
          container: {
            DEFAULT: "#eceef0",
            lowest: "#ffffff",
            low: "#f2f4f6",
            high: "#e6e8ea",
            highest: "#e0e3e5",
          },
          variant: "#e0e3e5",
          tint: "#565e74",
        },
        primary: {
          DEFAULT: "#000000",
          container: "#131b2e",
          fixed: "#dae2fd",
          "fixed-dim": "#bec6e0",
        },
        secondary: {
          DEFAULT: "#515f74",
          container: "#d5e3fd",
          fixed: "#d5e3fd",
          "fixed-dim": "#b9c7e0",
        },
        tertiary: {
          DEFAULT: "#000000",
          container: "#002113",
          fixed: "#6ffbbe",
          "fixed-dim": "#4edea3",
        },
        error: {
          DEFAULT: "#ba1a1a",
          container: "#ffdad6",
        },
        outline: {
          DEFAULT: "#76777d",
          variant: "#c6c6cd",
        },
        "on-surface": {
          DEFAULT: "#191c1e",
          variant: "#45464d",
        },
        "on-primary": {
          DEFAULT: "#ffffff",
          container: "#7c839b",
          fixed: "#131b2e",
          "fixed-variant": "#3f465c",
        },
        "on-secondary": {
          DEFAULT: "#ffffff",
          container: "#57657b",
          fixed: "#0d1c2f",
          "fixed-variant": "#3a485c",
        },
        "on-tertiary": {
          DEFAULT: "#ffffff",
          container: "#009668",
          fixed: "#002113",
          "fixed-variant": "#005236",
        },
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-background": "#191c1e",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#bec6e0",
        // Convenience aliases
        accent: {
          DEFAULT: "#000000",
          light: "#d5e3fd",
          dark: "#131b2e",
        },
        success: {
          DEFAULT: "#009668",
          light: "#4edea3",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#ba1a1a",
          light: "#ffdad6",
        },
        muted: {
          DEFAULT: "#45464d",
          light: "#76777d",
        },
        panel: "#ffffff",
        "panel-border": "#c6c6cd",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
        "2xl": "2rem",
        "3xl": "3rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(25, 28, 30, 0.06), 0 1px 6px rgba(25, 28, 30, 0.06)",
        "card-hover":
          "0 4px 16px rgba(25, 28, 30, 0.10), 0 2px 6px rgba(25, 28, 30, 0.06)",
        ambient: "0 8px 28px rgba(25, 28, 30, 0.10)",
        glow: "0 0 20px rgba(78, 222, 163, 0.15)",
        "xl": "0 20px 40px rgba(25, 28, 30, 0.12)",
      },
    },
  },
  plugins: [tailwindAnimate],
};
