import { serve } from '@hono/node-server'
import rootApp, { injectWebSocket } from './index.js'
import { startWhatsApp } from './routes/whatsapp.js'

const PORT = Number(process.env.PORT) || 8787

const server = serve({ fetch: rootApp.fetch, port: PORT })
console.log(`🚀 Server running at http://localhost:${PORT}`)
injectWebSocket(server)

;(async () => {
  await startWhatsApp()
})()