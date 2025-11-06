import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'
import rootApp from './index.js'

const PORT = Number(process.env.PORT) || 8787  // ⬅️ pakai env

const { injectWebSocket } = createNodeWebSocket({ app: rootApp })

const server = serve({
  fetch: rootApp.fetch,
  port: PORT,
})

console.log(`🚀 Server running at http://localhost:${PORT}`)
injectWebSocket(server)
