import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Proxy dev dibaca dari .env (SATU sumber kebenaran, sama seperti src/config.js):
//   VITE_ODOO_URL -> target proxy (default https://odoo18.hiddenlab.me)
//   VITE_API_BASE -> prefix API yang di-proxy (default /ag_rest_api/v1)
// Proxy membuat dev server satu origin dengan API (tidak ada lagi
// ketergantungan cookie sejak token Bearer 18.0.1.2.3).
// Prefix lama /api, /storage, dan /jsonrpc (Odoo 14) DIHAPUS:
// aplikasi branch odoo 18.0 tidak lagi memakainya.
// '/web' ikut di-proxy agar foto profil /web/image/... bisa dimuat saat dev.

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const odooUrl = env.VITE_ODOO_URL || 'https://odoo18.hiddenlab.me'
  const apiBase = env.VITE_API_BASE || '/ag_rest_api/v1'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        [apiBase]: {
          target: odooUrl,
          changeOrigin: true,
          secure: false,
        },
        '/web': {
          target: odooUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
