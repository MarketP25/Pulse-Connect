/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "320px", // Planetary Support: Small phones (iPhone SE)
        "3xl": "2560px", // Planetary Support: QHD / Ultra-wide
        "4k": "3840px" // Large TV / Professional Displays
      },
      maxWidth: {
        "screen-3xl": "2240px",
        "screen-4k": "3440px"
      },
      spacing: {
        // Responsive spacing using clamp for fluid layouts
        "safe-gap": "clamp(1rem, 5vw, 3rem)"
      },
      colors: {
        // Reference the variables injected by the layout
        brand: "var(--brand-primary)",
        "stellar-purple": {
          100: "#e0ccff",
          400: "#a855f7",
          500: "#8b5cf6",
          600: "#7c3aed",
          900: "#4c1d95"
        },
        "nebula-900": "#0b011d",
        "grid-silver": "#94a3b8",
        "cosmic-slate": "#1e293b",
        "tech-white": "#f8fafc"
      }
    }
  },
  plugins: []
};
