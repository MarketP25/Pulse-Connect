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
        brand: "var(--brand-primary)"
      }
    }
  },
  plugins: []
};
