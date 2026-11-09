import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveBackendApiUrl } from './src/shared/api/backendUrl.ts'

export default defineConfig(({ mode }) => {
  // Fail before serving/building if the selected backend is missing or malformed.
  resolveBackendApiUrl(mode, loadEnv(mode, process.cwd(), 'VITE_'))
  return { plugins: [react()], server: { port: 5173 } }
})
