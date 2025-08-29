// RD_crypto_dashboard_frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'], // Ensure this includes your .jsx files
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        'crypto-blue': '#1a73e8',
        'crypto-green': '#10b981',
        'crypto-red': '#ef4444',
        'dashboard-bg': '#f9f8f4',
        'gold-yellow': '#fbc318',
        'gold-yellow-hover': '#e6ae15',
        'gold-yellow-dark': '#d19b12',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out', // Match your animation name
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};