import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        "name": "खाता बुक",
        "short_name": "खाता",
        "description": "साफ़-सुथरे और आसान इंटरफ़ेस के साथ अपने दैनिक खर्चों को आसानी से ट्रैक करें।",
        "start_url": "/khata-book/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#007bff",
        "icons": [
          {
            "src": "icons/logo192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "icons/logo512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      }
    })
  ],
  base: "/khata-book/",
})
