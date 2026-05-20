/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      borderWidth: {
        '3': '1px',
      },
      boxShadow: {
        'neo': '1px 1px 4px 0px rgba(42, 42, 42, 0.04)',
        'neo-sm': '1px 1px 2px 0px rgba(42, 42, 42, 0.03)',
        'neo-lg': '2px 2px 6px 0px rgba(42, 42, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
