import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages публикует проект по адресу /<имя-репозитория>/,
  // поэтому все пути к ресурсам в сборке должны начинаться с /minifigma.
  base: '/minifigma/',
  plugins: [react(), tailwindcss()],
})
