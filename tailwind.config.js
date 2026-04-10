export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores baseadas na logo (Monocromático Premium)
        brand: {
          light: '#f9fafb', // Quase branco
          DEFAULT: '#171717', // Cinza muito escuro / Preto fosco
          dark: '#0a0a0a',   // Preto quase absoluto
          accent: '#404040', // Base para hover e elementos secundários
        }
      }
    },
  },
  plugins: [],
}
