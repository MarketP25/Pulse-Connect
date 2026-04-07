/** @type {import('tailwindcss').Config} */

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // === COLOR PALETTE ===
      colors: {
        // Primary Brand Colors
        'orbit-blue': {
          50: '#E8ECFA',
          100: '#D1D9F5',
          200: '#A3B3EB',
          300: '#758DE1',
          400: '#4766D7',
          500: '#1940CD',
          600: '#0A1428', // Deep Orbit Blue (primary)
          700: '#070E1A',
          800: '#050A12',
          900: '#030508',
        },

        // Accent Colors
        'pulse-cyan': {
          50: '#E0FFFF',
          100: '#B3FFFF',
          200: '#80FFFF',
          300: '#4DFFFF',
          400: '#1AFFFF',
          500: '#00D9FF', // Pulse Cyan (accent)
          600: '#00B8D4',
          700: '#0097AA',
          800: '#007680',
          900: '#005555',
        },

        'stellar-purple': {
          50: '#F3E5FF',
          100: '#E8CCFF',
          200: '#D199FF',
          300: '#BA66FF',
          400: '#A333FF',
          500: '#9D00FF', // Stellar Purple (secondary)
          600: '#7A00CC',
          700: '#5A0099',
          800: '#3D0066',
          900: '#200033',
        },

        // Background & Surface Colors
        'nebula': {
          900: '#0F1929', // Nebula Dark (background)
          800: '#1A2744', // Cosmic Slate
          700: '#252E43',
          600: '#303852',
          500: '#3A4A6A', // Grid Silver
          400: '#4A5A7A',
          300: '#5A6A8A',
        },

        'tech-white': '#F0F4F8',

        // Semantic Colors
        'success': '#10B981',
        'warning': '#F59E0B',
        'critical': '#EF4444',
        'info': '#3B82F6',
      },

      // === TYPOGRAPHY ===
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
      },

      fontSize: {
        // Responsive heading scales
        'h1': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1-mobile': ['36px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],

        'h2': ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2-mobile': ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],

        'h3': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3-mobile': ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],

        'h4': ['22px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],

        'body-lg': ['16px', { lineHeight: '1.6', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body': ['14px', { lineHeight: '1.6', letterSpacing: '-0.01em', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },

      // === SPACING (8px grid) ===
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },

      // === BORDER RADIUS ===
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        'full': '9999px',
      },

      // === SHADOWS ===
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 217, 255, 0.1)',
        'lg': '0 8px 12px -2px rgba(0, 217, 255, 0.15)',
        'xl': '0 16px 24px -4px rgba(0, 217, 255, 0.2)',
        'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-purple': '0 0 20px rgba(157, 0, 255, 0.3)',
        'glow': '0 0 20px rgba(0, 217, 255, 0.3)',
      },

      // === TRANSITIONS ===
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },

      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // === RESPONSIVE BREAKPOINTS ===
      screens: {
        'xxs': '280px',   // Smartwatch
        'xs': '320px',    // Small phones (iPhone SE)
        'sm': '640px',    // Phones
        'md': '768px',    // Tablets
        'lg': '1024px',   // Desktops
        'xl': '1280px',   // Large desktops
        '2xl': '1536px',  // Extra large
        '3xl': '1920px',  // Full HD wide
        '4xl': '2560px',  // QHD (2K)
        '5xl': '3840px',  // 4K Ultra HD
        '6xl': '5120px',  // 5K
        '7xl': '7680px',  // 8K
      },

      // === CONTAINER ===
      maxWidth: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1728px',  // For 1920px screens
        '4xl': '1920px',  // For 2560px screens
        '5xl': '2560px',  // For 4K
        '6xl': '3440px',  // For ultra-wide cinema
      },

      // === GRADIENTS ===
      backgroundImage: {
        'gradient-orbit': 'linear-gradient(135deg, #0A1428 0%, #0F1929 100%)',
        'gradient-pulse': 'linear-gradient(135deg, #00D9FF 0%, #9D00FF 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0A1428 0%, #1A2744 100%)',
      },

      // === ANIMATION ===
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-in-up': 'slideUp 0.4s ease-out',
      },

      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },

  plugins: [
    // Custom plugin for component utilities
    function ({ addComponents, theme }) {
      const components = {
        // Buttons - User Portal variants
        '.btn-primary': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm bg-pulse-cyan-500 text-orbit-blue-600 font-semibold rounded-md hover:bg-pulse-cyan-400 active:bg-pulse-cyan-600 transition-all duration-normal transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
        },
        '.btn-secondary': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm border-2 border-pulse-cyan-500 text-pulse-cyan-500 font-semibold rounded-md hover:bg-pulse-cyan-500 hover:bg-opacity-10 transition-all duration-normal disabled:opacity-50 disabled:cursor-not-allowed',
        },
        '.btn-tertiary': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm bg-nebula-800 text-tech-white font-medium rounded-md hover:bg-nebula-700 transition-colors duration-normal disabled:opacity-50 disabled:cursor-not-allowed',
        },
        '.btn-action': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm bg-gradient-pulse text-white font-semibold rounded-md hover:shadow-glow-purple transition-all duration-normal disabled:opacity-50 disabled:cursor-not-allowed',
        },
        '.btn-danger': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm bg-critical text-white font-semibold rounded-md hover:bg-opacity-90 transition-all duration-normal disabled:opacity-50 disabled:cursor-not-allowed',
        },
        '.btn-success': {
          '@apply': 'inline-flex items-center justify-center px-md py-sm bg-success text-white font-semibold rounded-md hover:bg-opacity-90 transition-all duration-normal disabled:opacity-50 disabled:cursor-not-allowed',
        },

        // Cards with more engagement
        '.card': {
          '@apply': 'bg-nebula-800 border border-nebula-500 rounded-lg p-lg shadow-md hover:shadow-lg transition-all duration-normal hover:border-pulse-cyan-500',
        },
        '.card-hover': {
          '@apply': 'card cursor-pointer hover:translate-y-[-2px]',
        },

        // Input Fields
        '.input-base': {
          '@apply': 'w-full bg-nebula-900 border border-nebula-500 rounded-md px-md py-sm text-body text-tech-white placeholder-nebula-500 focus:border-pulse-cyan-500 focus:ring-2 focus:ring-pulse-cyan-500 focus:ring-opacity-20 transition-all duration-normal',
        },

        // Badge
        '.badge': {
          '@apply': 'inline-flex items-center px-sm py-xs rounded text-caption font-semibold',
        },
        '.badge-primary': {
          '@apply': 'badge bg-pulse-cyan-500 bg-opacity-20 text-pulse-cyan-400',
        },
        '.badge-success': {
          '@apply': 'badge bg-success bg-opacity-20 text-success',
        },
        '.badge-warning': {
          '@apply': 'badge bg-warning bg-opacity-20 text-warning',
        },
        '.badge-critical': {
          '@apply': 'badge bg-critical bg-opacity-20 text-critical',
        },
        '.badge-purple': {
          '@apply': 'badge bg-stellar-purple-500 bg-opacity-20 text-stellar-purple-400',
        },

        // Text utilities
        '.heading-1': {
          '@apply': 'text-h1-mobile md:text-h1 font-bold text-tech-white',
        },
        '.heading-2': {
          '@apply': 'text-h2-mobile md:text-h2 font-bold text-tech-white',
        },
        '.heading-3': {
          '@apply': 'text-h3-mobile md:text-h3 font-semibold text-tech-white',
        },
        '.body-text': {
          '@apply': 'text-body leading-relaxed text-tech-white',
        },
        '.text-muted': {
          '@apply': 'text-caption text-nebula-500',
        },

        // Layout utilities
        '.container-page': {
          '@apply': 'mx-auto px-md md:px-lg lg:px-2xl max-w-2xl py-lg',
        },
        '.container-hero': {
          '@apply': 'mx-auto px-md md:px-lg lg:px-2xl max-w-2xl py-3xl',
        },
      };

      addComponents(components);
    },
  ],

  // Dark mode by default
  darkMode: 'class',

  // Optimization
  safelist: [
    'bg-orbit-blue-600',
    'bg-pulse-cyan-500',
    'text-pulse-cyan-500',
    'border-pulse-cyan-500',
  ],
};
