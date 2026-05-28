import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        "name": "Khata-Book",
        "short_name": "Khata-Book",
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
  server: (() => {
    const devHttps = process.env.DEV_HTTPS === 'true' || process.env.DEV_HTTPS === '1' || process.env.DEV_HTTPS === 'true';
    if (!devHttps) return { host: true };

    // Allow optional custom cert/key via env vars DEV_HTTPS_KEY and DEV_HTTPS_CERT
    const keyPath = process.env.DEV_HTTPS_KEY || process.env.DEV_HTTPS_KEY_FILE;
    const certPath = process.env.DEV_HTTPS_CERT || process.env.DEV_HTTPS_CERT_FILE;

    if (keyPath && certPath) {
      try {
        const key = fs.readFileSync(path.resolve(keyPath));
        const cert = fs.readFileSync(path.resolve(certPath));
        return { host: true, https: { key, cert } };
      } catch (err) {
        console.warn('DEV_HTTPS is enabled but failed to read cert/key files, falling back to https: true', err);
        return { host: true, https: true };
      }
    }

    // Let Vite use its default self-signed/https behaviour
    return { host: true, https: true };
  })(),
})
