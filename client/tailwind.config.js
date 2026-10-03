/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { friendly: "#10B981", hostile: "#EF4444", caution: "#F59E0B" },
      fontFamily: {
        head: ['"Barlow Semi Condensed"', "system-ui", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
