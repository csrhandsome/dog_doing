import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const clientHost = env.VITE_HOST ?? '0.0.0.0'
  const clientPort = Number(env.VITE_PORT ?? '5173')
  const proxyTarget =
    env.VITE_PROXY_TARGET ??
    `http://${env.VITE_SERVER_HOST ?? '127.0.0.1'}:${env.VITE_SERVER_PORT ?? '3001'}`

  return {
    plugins: [
      react(),
      tailwindcss(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      host: clientHost,
      port: clientPort,
      proxy: {
        '/health': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
