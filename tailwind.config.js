/** @type {import('tailwindcss').Config} */
module.exports = {
  // prefix: 'ava-',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
  // important: true,
};
