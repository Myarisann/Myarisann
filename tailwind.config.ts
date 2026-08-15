import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ff6b9d",
        "primary-dark": "#e91e63",
        secondary: "#c084fc",
        accent: "#60a5fa",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        bg: "#fff5f7",
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "33%": { transform: "translateY(-30px) rotate(120deg)" },
          "66%": { transform: "translateY(20px) rotate(240deg)" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        float: "float 20s infinite ease-in-out",
        pulseSoft: "pulseSoft 2s infinite",
      },
      borderRadius: {
        xl2: "24px",
        xl3: "28px",
      },
    },
  },
  plugins: [],
};
export default config;
