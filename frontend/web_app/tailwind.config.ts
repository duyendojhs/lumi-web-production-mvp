import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        mist: "#F6F8FB",
        line: "#DDE5EE",
        teal: "#0F766E",
        amber: "#B45309",
      },
      boxShadow: {
        panel: "0 14px 40px rgba(23, 32, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
