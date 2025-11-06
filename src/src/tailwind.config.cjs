const { nextui } = require('@nextui-org/react');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.{js,jsx,ts,tsx}',
    './**/*.{js,jsx,ts,tsx}',
    '!./dist/**',
    '!./node_modules/**',
    // jika node_modules di-hoist ke root monorepo:
    '../../node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
    // kalau node_modules lokal di workspace FE → ganti ke:
    // 'node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'hsl(var(--accent))',
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        text: 'hsl(var(--text))',
        background: 'hsl(var(--background))',
        border: 'hsl(var(--border))',
      },
    },
  },
  plugins: [nextui()],
};
