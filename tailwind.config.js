/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./_src/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};
