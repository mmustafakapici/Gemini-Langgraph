/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    colors: {
      'floral_white': '#fffcf2',
      'timberwolf': '#ccc5b9',
      'black_olive': '#403d39',
      'eerie_black': '#252422',
      'flame': '#eb5e28',
      // Tailwind'in varsayılan renklerini kullanmak istersen buraya ekleyebilirsin,
      // aksi takdirde sadece yukarıdaki renkler kullanılacaktır.
      // Örneğin, 'white': '#ffffff', 'gray': { 100: '#f3f4f6', ... }
      // Şu an sadece senin verdiğin renkler tanımlı.
    },
  },
  plugins: [],
};
