const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
]

function encodeRemainingLength(len: number): number[] {
  const out: number[] = []
  do {
    let byte = len % 128
    len = Math.floor(len / 128)
    if (len > 0) byte |= 0x80
    out.push(byte)
  } while (len > 0)
  return out
}

function decodeRemainingLength(
  buf: Uint8Array,
  startOffset: number
): { value: number; bytesUsed: number } {
  let multiplier = 1
  let value = 0
  let bytesUsed = 0
  let encodedByte = 0
  do {
    if (startOffset + bytesUsed >= buf.length) return { value: -1, bytesUsed: 0 }
    encodedByte = buf[startOffset + bytesUsed]
    value += (encodedByte & 127) * multiplier
    multiplier *= 128
    bytesUsed++
  } while ((encodedByte & 128) !== 0 && bytesUsed < 4)
  return { value, bytesUsed }
}

function buildConnectPacket(clientId: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const cid = enc.encode(clientId)
  const vh = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3c]
  const pl = [cid.length >> 8, cid.length & 0xff, ...cid]
  const rem = encodeRemainingLength(vh.length + pl.length)
  return new Uint8Array([0x10, ...rem, ...vh, ...pl])
}

function buildSubscribePacket(topic: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const tBytes = enc.encode(topic)
  const vh = [0x00, 0x01]
  const pl = [tBytes.length >> 8, tBytes.length & 0xff, ...tBytes, 0x00]
  const rem = encodeRemainingLength(vh.length + pl.length)
  return new Uint8Array([0x82, ...rem, ...vh, ...pl])
}

function buildPublishPacket(topic: string, message: string, retain = true): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder()
  const tBytes = enc.encode(topic)
  const mBytes = enc.encode(message)
  // QoS 1 (0x02) + Retain (0x01) => 0x33
  const headerByte = retain ? 0x33 : 0x32
  const vh = [tBytes.length >> 8, tBytes.length & 0xff, ...tBytes, 0x00, 0x07]
  const rem = encodeRemainingLength(vh.length + mBytes.length)
  const pkt = new Uint8Array(1 + rem.length + vh.length + mBytes.length)
  pkt[0] = headerByte
  pkt.set(rem, 1)
  pkt.set(vh, 1 + rem.length)
  pkt.set(mBytes, 1 + rem.length + vh.length)
  return pkt
}

function publishToSingleBroker(
  brokerUrl: string,
  topic: string,
  jsonPayload: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      try {
        ws.close()
      } catch {
        // Ignore
      }
      resolve(ok)
    }

    let ws: WebSocket
    try {
      ws = new WebSocket(brokerUrl, 'mqtt')
      ws.binaryType = 'arraybuffer'
    } catch {
      resolve(false)
      return
    }

    const timer = setTimeout(() => finish(false), 4500)

    ws.onopen = () => {
      const cid = 'pp_pub_' + Math.random().toString(36).slice(2, 10)
      ws.send(buildConnectPacket(cid))
    }

    ws.onmessage = (ev) => {
      const b = new Uint8Array(ev.data as ArrayBuffer)
      const pktType = b[0] >> 4
      if (pktType === 2) {
        // CONNACK -> send QoS 1 retained PUBLISH
        ws.send(buildPublishPacket(topic, jsonPayload, true))
      } else if (pktType === 4) {
        // PUBACK -> broker confirmed receipt!
        clearTimeout(timer)
        finish(true)
      }
    }

    ws.onerror = () => {
      clearTimeout(timer)
      finish(false)
    }
    ws.onclose = () => {
      clearTimeout(timer)
      finish(false)
    }
  })
}

/**
 * Publishes the generated pixel character from the phone to the desktop game
 * across multiple simultaneous channels (MQTT over WebSockets on 2 enterprise brokers,
 * local Vite WiFi API, and BroadcastChannel).
 */
export async function publishAvatarToDesktop(params: {
  sessionId: string
  playerNumber: number
  avatarDataUrl: string
}): Promise<boolean> {
  const { sessionId, playerNumber, avatarDataUrl } = params
  const payloadObj = {
    type: 'AVATAR_READY',
    sessionId,
    player: playerNumber,
    avatarDataUrl,
    ts: Date.now(),
  }
  const jsonStr = JSON.stringify(payloadObj)
  const topic = `parvepauk/v2/${sessionId}/${playerNumber}`

  // 1. BroadcastChannel (instant if on same device)
  try {
    const bc = new BroadcastChannel('parvepauk_sync')
    bc.postMessage(payloadObj)
    bc.close()
  } catch {
    // Ignore
  }

  // 2. Run local Vite API + dual WebSocket MQTT brokers in parallel
  const localPromise = fetch('/api/session/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonStr,
  })
    .then((r) => r.ok)
    .catch(() => false)

  const mqttPromises = MQTT_BROKERS.map((url) =>
    publishToSingleBroker(url, topic, jsonStr)
  )

  const results = await Promise.all([localPromise, ...mqttPromises])
  return results.some(Boolean)
}

/**
 * Subscribes the desktop game to incoming player avatars from any phone
 * via dual WebSocket MQTT brokers + local Vite poll + BroadcastChannel.
 */
export function subscribeToSessionAvatars(
  sessionId: string,
  onAvatar: (playerNumber: number, avatarDataUrl: string) => void
): () => void {
  let disposed = false
  const sockets: WebSocket[] = []
  const timers: ReturnType<typeof setInterval>[] = []

  const handleJsonString = (raw: string) => {
    try {
      const data = JSON.parse(raw)
      const pNum = Number(data?.player ?? data?.p)
      const img = String(data?.avatarDataUrl ?? data?.img ?? '')
      if (pNum >= 1 && pNum <= 6 && img.startsWith('data:image/')) {
        onAvatar(pNum, img)
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  // 1. BroadcastChannel
  let bc: BroadcastChannel | null = null
  try {
    bc = new BroadcastChannel('parvepauk_sync')
    bc.onmessage = (ev) => {
      const d = ev.data
      if (d?.type === 'AVATAR_READY' && d.sessionId === sessionId) {
        onAvatar(Number(d.player), String(d.avatarDataUrl))
      }
    }
  } catch {
    // Ignore
  }

  // 2. Connect to both MQTT over WebSocket brokers with auto-reconnect
  const connectBroker = (brokerUrl: string) => {
    if (disposed) return
    let ws: WebSocket
    try {
      ws = new WebSocket(brokerUrl, 'mqtt')
      ws.binaryType = 'arraybuffer'
      sockets.push(ws)
    } catch {
      return
    }

    ws.onopen = () => {
      if (disposed) {
        ws.close()
        return
      }
      const cid = 'pp_sub_' + Math.random().toString(36).slice(2, 10)
      ws.send(buildConnectPacket(cid))
    }

    ws.onmessage = (ev) => {
      if (disposed) return
      const b = new Uint8Array(ev.data as ArrayBuffer)
      let offset = 0
      while (offset < b.length) {
        const pktType = b[offset] >> 4
        const { value: remLen, bytesUsed } = decodeRemainingLength(b, offset + 1)
        if (remLen < 0 || bytesUsed === 0) break
        const pktEnd = offset + 1 + bytesUsed + remLen
        if (pktEnd > b.length) break

        if (pktType === 2) {
          // CONNACK -> Subscribe to wildcard topic parvepauk/v2/{sessionId}/+
          ws.send(buildSubscribePacket(`parvepauk/v2/${sessionId}/+`))
        } else if (pktType === 3) {
          // PUBLISH packet received!
          const qos = (b[offset] >> 1) & 0x03
          let pos = offset + 1 + bytesUsed
          const topicLen = (b[pos] << 8) | b[pos + 1]
          pos += 2 + topicLen
          if (qos > 0) {
            pos += 2 // Skip Packet Identifier
          }
          if (pos < pktEnd) {
            const msgStr = new TextDecoder().decode(b.subarray(pos, pktEnd))
            handleJsonString(msgStr)
          }
        }
        offset = pktEnd
      }
    }

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new Uint8Array([0xc0, 0x00])) // MQTT PINGREQ
      }
    }, 22000)
    timers.push(pingInterval)

    ws.onclose = () => {
      clearInterval(pingInterval)
      if (!disposed) {
        setTimeout(() => connectBroker(brokerUrl), 2000)
      }
    }
  }

  MQTT_BROKERS.forEach(connectBroker)

  // 3. Local Vite server poll (only when running on localhost / local LAN)
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.')

  if (isLocal) {
    const localPoll = setInterval(() => {
      fetch(`/api/session/poll?session=${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.avatars) {
            Object.entries(data.avatars).forEach(([pKey, url]) => {
              if (typeof url === 'string') {
                onAvatar(Number(pKey), url)
              }
            })
          }
        })
        .catch(() => {})
    }, 1800)
    timers.push(localPoll)
  }

  return () => {
    disposed = true
    if (bc) bc.close()
    timers.forEach(clearInterval)
    sockets.forEach((s) => {
      try {
        s.close()
      } catch {
        // Ignore
      }
    })
  }
}
