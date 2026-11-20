import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/* En local, /api/claude est relayé vers Anthropic avec la clé lue dans .env
   (ANTHROPIC_API_KEY, sans préfixe VITE_ : jamais incorporée au code du navigateur). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (mode === 'development' && !env.ANTHROPIC_API_KEY) {
    console.warn('\n[FeedbackPO] ANTHROPIC_API_KEY absente de .env : les appels IA échoueront en local.\n')
  }
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/claude': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: () => '/v1/messages',
          headers: { 'x-api-key': env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
        },
      },
    },
  }
})
