import { build, loadEnv } from 'vite'

// Bundle Firebase into a classic worker so iOS 16.4 does not depend on module-worker or CDN imports.
export function pushWorkerPlugin(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const config = { apiKey: env.VITE_FIREBASE_API_KEY || '', projectId: env.VITE_FIREBASE_PROJECT_ID || '', messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '', appId: env.VITE_FIREBASE_APP_ID || '' }
  const configured = Object.values(config).every(Boolean) && !!env.VITE_FIREBASE_VAPID_KEY
  const options = { configFile: false, publicDir: false, logLevel: 'silent', define: { __FIREBASE_CONFIG__: JSON.stringify(config), __FIREBASE_CONFIGURED__: JSON.stringify(configured) }, build: { outDir: 'dist', emptyOutDir: false, lib: { entry: 'firebase-worker.js', formats: ['iife'], name: 'ShiftSyncPush', fileName: () => 'sw.js' } } }
  let serving = false, compiled
  return {
    name: 'shiftsync-push-worker',
    configureServer(server) {
      serving = true
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/sw.js') return next()
        try {
          compiled ??= build({ ...options, build: { ...options.build, write: false } }).then(result => (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk').code)
          response.setHeader('Content-Type', 'application/javascript'); response.setHeader('Cache-Control', 'no-store'); response.end(await compiled)
        } catch { compiled = undefined; response.statusCode = 503; response.end('// Push worker is not ready; restart the dev server after checking Firebase config.') }
      })
    },
    async closeBundle() { if (!serving) await build(options) },
  }
}
