/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 Color System
        primary: {
          50: '#f3e5f5',
          100: '#e1bee7',
          200: '#ce93d8',
          300: '#ba68c8',
          400: '#ab47bc',
          500: '#6200EE', // Primary color from requirements
          600: '#5a00d4',
          700: '#5200c4',
          800: '#4a00b4',
          900: '#3f009c',
        },
        secondary: {
          50: '#e0f2f1',
          100: '#b2dfdb',
          200: '#80cbc4',
          300: '#4db6ac',
          400: '#26a69a',
          500: '#03DAC6', // Secondary color from requirements
          600: '#00acc1',
          700: '#0097a7',
          800: '#00838f',
          900: '#006064',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#121212',
        },
        error: {
          50: '#ffebee',
          100: '#ffcdd2',
          200: '#ef9a9a',
          300: '#e57373',
          400: '#ef5350',
          500: '#B00020', // Error color from requirements
          600: '#e53935',
          700: '#d32f2f',
          800: '#c62828',
          900: '#b71c1c',
        },
        // Material Design 3 neutral colors
        neutral: {
          0: '#000000',
          10: '#1c1b1f',
          20: '#313033',
          25: '#3a383c',
          30: '#48464a',
          35: '#54515e',
          40: '#605d64',
          50: '#787579',
          60: '#939094',
          70: '#aeaaae',
          80: '#c9c5ca',
          90: '#e6e1e5',
          95: '#f4eff4',
          99: '#fffbfe',
          100: '#ffffff',
        },
      },
      spacing: {
        // Material Design 3 spacing system (8dp base)
        '2': '8px',   // 8dp
        '4': '16px',  // 16dp
        '6': '24px',  // 24dp
        '8': '32px',  // 32dp
        '12': '48px', // 48dp
        '16': '64px', // 64dp
      },
      borderRadius: {
        // Material Design 3 shape system
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      boxShadow: {
        // Material Design 3 elevation system
        'elevation-1': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'elevation-4': '0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'elevation-5': '0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
      },
      fontFamily: {
        // Material Design 3 typography
        'roboto': ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Material Design 3 type scale
        'display-large': ['57px', { lineHeight: '64px', letterSpacing: '-0.25px' }],
        'display-medium': ['45px', { lineHeight: '52px', letterSpacing: '0px' }],
        'display-small': ['36px', { lineHeight: '44px', letterSpacing: '0px' }],
        'headline-large': ['32px', { lineHeight: '40px', letterSpacing: '0px' }],
        'headline-medium': ['28px', { lineHeight: '36px', letterSpacing: '0px' }],
        'headline-small': ['24px', { lineHeight: '32px', letterSpacing: '0px' }],
        'title-large': ['22px', { lineHeight: '28px', letterSpacing: '0px' }],
        'title-medium': ['16px', { lineHeight: '24px', letterSpacing: '0.15px' }],
        'title-small': ['14px', { lineHeight: '20px', letterSpacing: '0.1px' }],
        'label-large': ['14px', { lineHeight: '20px', letterSpacing: '0.1px' }],
        'label-medium': ['12px', { lineHeight: '16px', letterSpacing: '0.5px' }],
        'label-small': ['11px', { lineHeight: '16px', letterSpacing: '0.5px' }],
        'body-large': ['16px', { lineHeight: '24px', letterSpacing: '0.5px' }],
        'body-medium': ['14px', { lineHeight: '20px', letterSpacing: '0.25px' }],
        'body-small': ['12px', { lineHeight: '16px', letterSpacing: '0.4px' }],
      },
      screens: {
        // Material Design 3 responsive breakpoints
        'xs': '480px',
        'sm': '600px',
        'md': '840px',
        'lg': '1200px',
        'xl': '1600px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}