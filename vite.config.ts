import os from 'node:os'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

interface SessionRecord {
  expired: boolean
  createdAt: number
  pendingAvatars: {
    1?: string
    2?: string
  }
}

function getLocalLanIp(): string {
  const nets = os.networkInterfaces()
  const candidates: string[] = []
  for (const name of Object.keys(nets)) {
    const netList = nets[name]
    if (!netList) continue
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        if (
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(net.address)
        ) {
          return net.address
        }
        candidates.push(net.address)
      }
    }
  }
  return candidates[0] || 'localhost'
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
      if (body.length > 500_000) {
        reject(new Error('Maht on liiga suur'))
      }
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

function parvepaukRelayPlugin(): Plugin {
  const sessions = new Map<string, SessionRecord>()

  return {
    name: 'parvepauk-relay-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next()
        }

        const urlObj = new URL(req.url, 'http://localhost')
        const pathname = urlObj.pathname

        try {
          if (pathname === '/api/lan-info' && req.method === 'GET') {
            return sendJson(res, 200, { ip: getLocalLanIp() })
          }

          if (pathname === '/api/session/create' && req.method === 'POST') {
            const body = await readJsonBody(req)
            const sessionId = String(body.sessionId || '')
            if (!sessionId) {
              return sendJson(res, 400, { error: 'Puudub seansi tunnus.' })
            }
            if (!sessions.has(sessionId)) {
              sessions.set(sessionId, {
                expired: false,
                createdAt: Date.now(),
                pendingAvatars: {},
              })
            } else {
              const rec = sessions.get(sessionId)!
              rec.expired = false
            }
            return sendJson(res, 200, { ok: true })
          }

          if (pathname === '/api/session/status' && req.method === 'GET') {
            const sessionId = urlObj.searchParams.get('session') || ''
            const rec = sessions.get(sessionId)
            if (!rec) {
              return sendJson(res, 200, { exists: false, expired: false })
            }
            return sendJson(res, 200, { exists: true, expired: rec.expired })
          }

          if (pathname === '/api/session/avatar' && req.method === 'POST') {
            const body = await readJsonBody(req)
            const sessionId = String(body.sessionId || '')
            const player = Number(body.player) === 2 ? 2 : 1
            const avatarDataUrl = String(body.avatarDataUrl || '')

            if (!sessionId || !avatarDataUrl.startsWith('data:image/')) {
              return sendJson(res, 400, { error: 'Vigased andmed.' })
            }

            let rec = sessions.get(sessionId)
            if (!rec) {
              rec = {
                expired: false,
                createdAt: Date.now(),
                pendingAvatars: {},
              }
              sessions.set(sessionId, rec)
            }

            if (rec.expired) {
              return sendJson(res, 410, { error: 'See QR-kood on aegunud, sest mäng on lõppenud.' })
            }

            rec.pendingAvatars[player] = avatarDataUrl
            return sendJson(res, 200, { ok: true })
          }

          if (pathname === '/api/session/poll' && req.method === 'GET') {
            const sessionId = urlObj.searchParams.get('session') || ''
            const rec = sessions.get(sessionId)
            if (!rec) {
              return sendJson(res, 200, { expired: false, avatars: {} })
            }

            // Deliver avatars to the desktop game and immediately delete temporary image data from memory
            const delivered: { 1?: string; 2?: string } = {}
            if (rec.pendingAvatars[1]) {
              delivered[1] = rec.pendingAvatars[1]
              delete rec.pendingAvatars[1]
            }
            if (rec.pendingAvatars[2]) {
              delivered[2] = rec.pendingAvatars[2]
              delete rec.pendingAvatars[2]
            }

            return sendJson(res, 200, {
              expired: rec.expired,
              avatars: delivered,
            })
          }

          if (pathname === '/api/session/expire' && req.method === 'POST') {
            const body = await readJsonBody(req)
            const sessionId = String(body.sessionId || '')
            const rec = sessions.get(sessionId)
            if (rec) {
              rec.expired = true
              rec.pendingAvatars = {}
            } else if (sessionId) {
              sessions.set(sessionId, {
                expired: true,
                createdAt: Date.now(),
                pendingAvatars: {},
              })
            }
            return sendJson(res, 200, { ok: true })
          }

          return sendJson(res, 404, { error: 'Endpunkti ei leitud.' })
        } catch {
          return sendJson(res, 500, { error: 'Serveri viga.' })
        }
      })
    },
  }
}

export default defineConfig({
  base: './',
  server: {
    host: true,
  },
  plugins: [react(), tailwindcss(), parvepaukRelayPlugin()],
})
