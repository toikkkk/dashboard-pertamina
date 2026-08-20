import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pertamina: {
          primary: "#0369A1",
          primaryDark: "#075985",
          navy: "#0F172A",
          navyMuted: "#94A3B8",
          ink: "#0F172A",
          border: "#D6DEE8",
          success: "#15803D",
          warning: "#B45309",
          revision: "#6D28D9",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "2px",
        xl: "4px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        modalPop: {
          "0%": { opacity: "0", transform: "scale(0.94) translateY(6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        backdropIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        drawLine: {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        growUp: {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        dropIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(-6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        fadeOut: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-4px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
        fadeInUp: "fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) both",
        modalPop: "modalPop 0.28s cubic-bezier(0.16,1,0.3,1) both",
        backdropIn: "backdropIn 0.2s ease-out both",
        drawLine: "drawLine 1s ease-out forwards",
        popIn: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
        growUp: "growUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        dropIn: "dropIn 0.2s cubic-bezier(0.16,1,0.3,1) both",
        fadeOut: "fadeOut 0.18s ease-in forwards",
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
