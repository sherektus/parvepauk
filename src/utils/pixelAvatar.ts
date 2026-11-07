import type { BrainrotId } from '../data/gameContent'

const PIXEL_PALETTE: [number, number, number][] = [
  // Deep outlines & darks
  [15, 23, 42],
  [24, 24, 37],
  [30, 41, 59],
  [51, 65, 85],
  [71, 85, 105],
  [100, 116, 139],
  [148, 163, 184],
  [203, 213, 225],
  [241, 245, 249],
  [255, 255, 255],
  // Rich hair & natural browns/blondes/reds
  [38, 22, 16],
  [58, 34, 24],
  [74, 44, 42],
  [92, 54, 36],
  [112, 66, 50],
  [133, 77, 14],
  [161, 98, 7],
  [202, 138, 4],
  [234, 179, 8],
  [250, 204, 21],
  [254, 240, 138],
  // Warm & natural skin tones (deep to fair + rosy cheeks/lips)
  [120, 68, 48],
  [149, 91, 66],
  [172, 108, 78],
  [192, 128, 94],
  [214, 154, 118],
  [228, 170, 134],
  [238, 186, 149],
  [246, 201, 168],
  [251, 215, 186],
  [254, 230, 208],
  [255, 241, 226],
  [225, 112, 112],
  [190, 75, 85],
  // Vibrant game colors
  [127, 29, 29],
  [185, 28, 28],
  [239, 68, 68],
  [248, 113, 113],
  [194, 65, 12],
  [249, 115, 22],
  [6, 95, 70],
  [16, 185, 129],
  [110, 231, 183],
  [30, 58, 138],
  [37, 99, 235],
  [96, 165, 250],
  [6, 182, 212],
  [103, 232, 249],
  [88, 28, 135],
  [139, 92, 246],
  [217, 70, 239],
]

function nearestPaletteColor(r: number, g: number, b: number): [number, number, number] {
  let bestDist = Infinity
  let best = PIXEL_PALETTE[0]
  for (let i = 0; i < PIXEL_PALETTE.length; i++) {
    const [pr, pg, pb] = PIXEL_PALETTE[i]
    const dr = (r - pr) * 0.32
    const dg = (g - pg) * 0.54
    const db = (b - pb) * 0.14
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = PIXEL_PALETTE[i]
    }
  }
  return best
}

function colorDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return dr * dr * 0.3 + dg * dg * 0.55 + db * db * 0.15
}

/**
 * Automatically transforms a camera/uploaded photo into a Parvepauk pixel-art
 * game character that preserves the person's real face, hairstyle, glasses/beard,
 * and expression, while cutting out the room background, adding a 16-bit dark sprite
 * outline, sea-battle backdrop, and golden captain shoulder epaulets.
 *
 * Returns a compact 48x48 PNG data URL (< 2.5 KB) so it transfers instantaneously
 * over QR / ntfy.sh and renders sharply with nearest-neighbor scaling.
 */
export function convertImageToPixelAvatar(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  crop: { offsetX: number; offsetY: number; zoom: number },
  pixelGridSize: number = 48,
  _outputSize: number = 48
): string {
  const G = pixelGridSize
  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = G
  smallCanvas.height = G
  const sCtx = smallCanvas.getContext('2d')!

  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth || 480 : source.width || 480
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight || 480 : source.height || 480

  const minSide = Math.min(srcW, srcH)
  const cropSide = minSide / Math.max(1, crop.zoom)

  const centerX = srcW / 2 - crop.offsetX * (minSide * 0.35)
  const centerY = srcH / 2 - crop.offsetY * (minSide * 0.35)

  const sx = Math.max(0, Math.min(srcW - cropSide, centerX - cropSide / 2))
  const sy = Math.max(0, Math.min(srcH - cropSide, centerY - cropSide / 2))

  sCtx.imageSmoothingEnabled = true
  sCtx.drawImage(source, sx, sy, cropSide, cropSide, 0, 0, G, G)

  const imgData = sCtx.getImageData(0, 0, G, G)
  const raw = imgData.data

  // 1. Measure face core brightness for auto-exposure normalization
  let faceLumSum = 0
  let faceCount = 0
  const fStart = Math.floor(G * 0.28)
  const fEnd = Math.floor(G * 0.72)
  for (let y = fStart; y < fEnd; y++) {
    for (let x = fStart; x < fEnd; x++) {
      const idx = (y * G + x) * 4
      faceLumSum += raw[idx] * 0.299 + raw[idx + 1] * 0.587 + raw[idx + 2] * 0.114
      faceCount++
    }
  }
  const avgFaceLum = faceCount > 0 ? faceLumSum / faceCount : 128
  // Target pleasant bright face luminance around 148
  const exposureGain = Math.max(0.82, Math.min(1.45, 148 / Math.max(45, avgFaceLum)))

  const normR = new Float32Array(G * G)
  const normG = new Float32Array(G * G)
  const normB = new Float32Array(G * G)

  for (let i = 0; i < G * G; i++) {
    const idx = i * 4
    const boost = (v: number) => {
      const gained = v * exposureGain
      return Math.max(0, Math.min(255, (gained - 128) * 1.18 + 128))
    }
    normR[i] = boost(raw[idx])
    normG[i] = boost(raw[idx + 1])
    normB[i] = boost(raw[idx + 2])
  }

  // 2. Sample outer border pixels (top & upper corners) to detect room background color
  const bgSamples: [number, number, number][] = []
  for (let y = 0; y < Math.floor(G * 0.65); y += 2) {
    for (const x of [0, 1, G - 2, G - 1]) {
      const p = y * G + x
      bgSamples.push([normR[p], normG[p], normB[p]])
    }
  }
  for (let x = 2; x < G - 2; x += 2) {
    const p = x
    bgSamples.push([normR[p], normG[p], normB[p]])
  }

  // 3. Flood-fill background segmentation from edges, respecting a portrait safe core
  // Safe core protects the person's face, hair core, and shoulders even if wall color is similar
  const isCorePerson = (x: number, y: number): boolean => {
    const nx = (x - G / 2) / (G / 2)
    const ny = (y - G * 0.44) / (G / 2)
    // Head & face core ellipse
    if ((nx * nx) / (0.52 * 0.52) + (ny * ny) / (0.58 * 0.58) <= 1.0) {
      return true
    }
    // Neck & shoulders core
    if (y >= G * 0.68 && Math.abs(nx) <= 0.66) {
      return true
    }
    return false
  }

  // Outer silhouette boundary (clips distant room corners so it always forms a character bust)
  const isOutsideMaxBust = (x: number, y: number): boolean => {
    const nx = (x - G / 2) / (G / 2)
    const ny = (y - G * 0.45) / (G / 2)
    if (y < G * 0.72) {
      return (nx * nx) / (0.86 * 0.86) + (ny * ny) / (0.86 * 0.86) > 1.0
    }
    return Math.abs(nx) > 0.9
  }

  const isBg = new Uint8Array(G * G)
  const visited = new Uint8Array(G * G)
  const queue: number[] = []

  const matchesBgSample = (p: number, thresholdSq: number): boolean => {
    const r = normR[p]
    const g = normG[p]
    const b = normB[p]
    for (let i = 0; i < bgSamples.length; i++) {
      const [br, bg, bb] = bgSamples[i]
      if (colorDistSq(r, g, b, br, bg, bb) <= thresholdSq) {
        return true
      }
    }
    return false
  }

  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const onEdge = x === 0 || x === G - 1 || y === 0
      if (onEdge || isOutsideMaxBust(x, y)) {
        if (!isCorePerson(x, y)) {
          const p = y * G + x
          isBg[p] = 1
          visited[p] = 1
          queue.push(p)
        }
      }
    }
  }

  let head = 0
  while (head < queue.length) {
    const curr = queue[head++]
    const cx = curr % G
    const cy = Math.floor(curr / G)
    const r0 = normR[curr]
    const g0 = normG[curr]
    const b0 = normB[curr]

    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ]
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= G || ny < 0 || ny >= G) continue
      const np = ny * G + nx
      if (visited[np] || isCorePerson(nx, ny)) continue

      const stepDist = colorDistSq(r0, g0, b0, normR[np], normG[np], normB[np])
      if (stepDist < 360 || (stepDist < 780 && matchesBgSample(np, 950))) {
        visited[np] = 1
        isBg[np] = 1
        queue.push(np)
      }
    }
  }

  // 4. Edge-preserving bilateral smoothing + feature edge detection for cel-shaded pixel-art look
  const smoothR = new Float32Array(G * G)
  const smoothG = new Float32Array(G * G)
  const smoothB = new Float32Array(G * G)
  const edgeStrength = new Float32Array(G * G)

  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const p = y * G + x
      const r0 = normR[p]
      const g0 = normG[p]
      const b0 = normB[p]
      const lum0 = r0 * 0.299 + g0 * 0.587 + b0 * 0.114

      let wSum = 0
      let rSum = 0
      let gSum = 0
      let bSum = 0
      let maxLumDiff = 0

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= G) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= G) continue
          const np = ny * G + nx
          const nr = normR[np]
          const ng = normG[np]
          const nb = normB[np]
          const nLum = nr * 0.299 + ng * 0.587 + nb * 0.114
          const cDist = colorDistSq(r0, g0, b0, nr, ng, nb)

          if (Math.abs(dx) + Math.abs(dy) === 1) {
            maxLumDiff = Math.max(maxLumDiff, lum0 - nLum)
          }

          // Bilateral weight: only smooth similar colors so eyes/glasses/mouth stay razor-sharp
          const weight = cDist < 420 ? 1.0 : cDist < 900 ? 0.25 : 0.02
          wSum += weight
          rSum += nr * weight
          gSum += ng * weight
          bSum += nb * weight
        }
      }

      smoothR[p] = rSum / wSum
      smoothG[p] = gSum / wSum
      smoothB[p] = bSum / wSum
      edgeStrength[p] = maxLumDiff
    }
  }

  // 5. Render game sea/sky backdrop + cel-shaded character + 1px dark sprite outline
  const outData = sCtx.createImageData(G, G)
  const dst = outData.data

  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const p = y * G + x
      const idx = p * 4

      if (isBg[p]) {
        // Check if adjacent to foreground person -> draw 1px dark pixel-art sprite outline!
        let touchesPerson = false
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [1, -1],
        ]) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < G && ny >= 0 && ny < G && !isBg[ny * G + nx]) {
            touchesPerson = true
            break
          }
        }

        if (touchesPerson) {
          dst[idx] = 15
          dst[idx + 1] = 23
          dst[idx + 2] = 42
          dst[idx + 3] = 255
        } else {
          // Retro Parvepauk sea & sky backdrop
          const horizonY = Math.floor(G * 0.75)
          if (y < horizonY) {
            // Night/twilight sky gradient with pixel stars
            const isUpper = y < Math.floor(G * 0.35)
            const isStar =
              (x * 17 + y * 31) % 53 === 0 && y < Math.floor(G * 0.55) && x > 2 && x < G - 3
            if (isStar) {
              dst[idx] = 254
              dst[idx + 1] = 240
              dst[idx + 2] = 138
            } else if (isUpper) {
              dst[idx] = 15
              dst[idx + 1] = 23
              dst[idx + 2] = 42
            } else {
              dst[idx] = 30
              dst[idx + 1] = 58
              dst[idx + 2] = 138
            }
          } else {
            // Pixel ocean waves
            const isWaveCrest = y === horizonY || ((x + y) % 7 === 0 && y === horizonY + 2)
            if (isWaveCrest) {
              dst[idx] = 125
              dst[idx + 1] = 211
              dst[idx + 2] = 252
            } else {
              dst[idx] = 2
              dst[idx + 1] = 132
              dst[idx + 2] = 199
            }
          }
          dst[idx + 3] = 255
        }
      } else {
        // Foreground person pixel: cel-shade & ink facial feature lines
        let r = smoothR[p]
        let g = smoothG[p]
        let b = smoothB[p]

        // Darken crisp facial creases (eyes, glasses, eyebrows, smile) for comic pixel clarity
        if (edgeStrength[p] > 26) {
          const inkFactor = edgeStrength[p] > 45 ? 0.62 : 0.78
          r *= inkFactor
          g *= inkFactor
          b *= inkFactor
        }

        const [pr, pg, pb] = nearestPaletteColor(r, g, b)
        // Quantize to clean cel-shaded steps (no noisy checkerboard dithering!)
        const qr = Math.round(r / 24) * 24
        const qg = Math.round(g / 24) * 24
        const qb = Math.round(b / 24) * 24

        dst[idx] = Math.round(pr * 0.65 + qr * 0.35)
        dst[idx + 1] = Math.round(pg * 0.65 + qg * 0.35)
        dst[idx + 2] = Math.round(pb * 0.65 + qb * 0.35)
        dst[idx + 3] = 255
      }
    }
  }

  sCtx.putImageData(outData, 0, 0)

  // 6. Add Parvepauk Pirate/Raft Captain shoulder epaulets & collar badge at bottom
  // (keeps 100% of the person's face & hair visible while giving them a game-character uniform!)
  const epY = G - 7
  // Left & Right golden shoulder epaulets
  sCtx.fillStyle = '#0f172a'
  sCtx.fillRect(5, epY - 1, 10, 6)
  sCtx.fillRect(G - 15, epY - 1, 10, 6)

  sCtx.fillStyle = '#fbbf24'
  sCtx.fillRect(6, epY, 8, 3)
  sCtx.fillRect(G - 14, epY, 8, 3)

  // Gold fringe tassels on epaulets
  sCtx.fillStyle = '#d97706'
  for (let tx = 6; tx < 14; tx += 2) {
    sCtx.fillRect(tx, epY + 3, 1, 2)
  }
  for (let tx = G - 14; tx < G - 6; tx += 2) {
    sCtx.fillRect(tx, epY + 3, 1, 2)
  }

  // Center golden captain medallion clasp at the bottom collar
  const midX = Math.floor(G / 2)
  sCtx.fillStyle = '#0f172a'
  sCtx.fillRect(midX - 3, G - 6, 6, 5)
  sCtx.fillStyle = '#fbbf24'
  sCtx.fillRect(midX - 2, G - 5, 4, 3)
  sCtx.fillStyle = '#ef4444'
  sCtx.fillRect(midX - 1, G - 4, 2, 1)

  // Return compact 48x48 PNG data URL (< 2.5 KB) so QR upload is instant and reliable!
  return smallCanvas.toDataURL('image/png')
}

/**
 * Generates custom pixel-art avatars for the 6 Italian Brainrot characters!
 */
export function createBrainrotAvatar(id: BrainrotId): string {
  const size = 18
  const small = document.createElement('canvas')
  small.width = size
  small.height = size
  const ctx = small.getContext('2d')!

  // Dark retro background
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, size, size)

  if (id === 'tralalero') {
    // Tralalero Tralala: Blue shark with bright blue/white Nike sneakers!
    ctx.fillStyle = '#1e3a8a'
    ctx.fillRect(0, 0, size, size)
    // Dorsal fin & shark body
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(7, 2, 3, 3)
    ctx.fillRect(3, 5, 12, 6)
    // White shark belly & sharp teeth grin
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(4, 9, 10, 3)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(5, 8, 6, 1)
    // Eye
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(5, 6, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(5, 6, 1, 1)
    // 3 legs with blue & white sneakers!
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(4, 12, 2, 3)
    ctx.fillRect(8, 12, 2, 3)
    ctx.fillRect(12, 12, 2, 3)
    // Sneakers
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(3, 14, 4, 2)
    ctx.fillRect(7, 14, 4, 2)
    ctx.fillRect(11, 14, 4, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(3, 16, 4, 1)
    ctx.fillRect(7, 16, 4, 1)
    ctx.fillRect(11, 16, 4, 1)
  } else if (id === 'bombardiro') {
    // Bombardiro Crocodilo: Green crocodile + bomber wings + propellers + bomb!
    ctx.fillStyle = '#172554'
    ctx.fillRect(0, 0, size, size)
    // Metal wings & propellers
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(1, 7, 16, 3)
    ctx.fillStyle = '#facc15'
    ctx.fillRect(2, 5, 2, 2)
    ctx.fillRect(14, 5, 2, 2)
    // Crocodile head & snout
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(5, 4, 8, 8)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(3, 8, 10, 4)
    // Teeth
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(4, 11, 8, 1)
    // Pilot goggles / eyes
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(6, 5, 2, 2)
    ctx.fillRect(10, 5, 2, 2)
    // Hanging bomb underneath
    ctx.fillStyle = '#334155'
    ctx.fillRect(7, 13, 4, 3)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(6, 14, 1, 2)
  } else if (id === 'tungtung') {
    // Tung Tung Tung Sahur: Wooden log creature with big eyes & baseball bat!
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect(0, 0, size, size)
    // Tall wooden log body
    ctx.fillStyle = '#b45309'
    ctx.fillRect(5, 2, 7, 14)
    ctx.fillStyle = '#d97706'
    ctx.fillRect(6, 3, 5, 12)
    // Big spooky eyes
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(6, 5, 2, 3)
    ctx.fillRect(9, 5, 2, 3)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(7, 6, 1, 2)
    ctx.fillRect(9, 6, 1, 2)
    // Mouth
    ctx.fillStyle = '#451a03'
    ctx.fillRect(7, 10, 3, 2)
    // Baseball bat held on the right
    ctx.fillStyle = '#fde047'
    ctx.fillRect(13, 3, 3, 9)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(14, 12, 1, 3)
  } else if (id === 'lirili') {
    // Lirili Larila: Cactus-elephant wearing sandals!
    ctx.fillStyle = '#451a03'
    ctx.fillRect(0, 0, size, size)
    // Big elephant ears + trunk in cactus green
    ctx.fillStyle = '#15803d'
    ctx.fillRect(2, 4, 3, 6)
    ctx.fillRect(13, 4, 3, 6)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(5, 3, 8, 10)
    // Trunk
    ctx.fillRect(8, 9, 3, 5)
    // Cactus spikes
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(6, 4, 1, 1)
    ctx.fillRect(11, 4, 1, 1)
    ctx.fillRect(5, 10, 1, 1)
    // Eyes
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(6, 6, 2, 2)
    ctx.fillRect(10, 6, 2, 2)
    // Sandals at bottom
    ctx.fillStyle = '#f97316'
    ctx.fillRect(4, 14, 4, 2)
    ctx.fillRect(10, 14, 4, 2)
  } else if (id === 'patapim') {
    // Brr Brr Patapim: Forest proboscis monkey with leafy crown & giant feet!
    ctx.fillStyle = '#064e3b'
    ctx.fillRect(0, 0, size, size)
    // Leafy forest hair
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(4, 2, 10, 4)
    // Brown body
    ctx.fillStyle = '#92400e'
    ctx.fillRect(5, 5, 8, 7)
    // Big pink proboscis nose!
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(7, 7, 4, 4)
    // Eyes
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(6, 6, 2, 1)
    ctx.fillRect(10, 6, 2, 1)
    // Giant feet at the bottom
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(2, 13, 6, 3)
    ctx.fillRect(10, 13, 6, 3)
  } else {
    // Cappuccino Assassino: Coffee cup with ninja headband & twin katanas!
    ctx.fillStyle = '#31102f'
    ctx.fillRect(0, 0, size, size)
    // Crossed katanas behind
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(2, 2, 2, 14)
    ctx.fillRect(14, 2, 2, 14)
    // Frothy white cappuccino foam top
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(5, 3, 8, 3)
    // Coffee cup body
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(5, 6, 8, 9)
    // Red ninja headband & angry eyes
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(4, 6, 10, 2)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(6, 9, 2, 2)
    ctx.fillRect(10, 9, 2, 2)
  }

  const out = document.createElement('canvas')
  out.width = 180
  out.height = 180
  const oCtx = out.getContext('2d')!
  oCtx.imageSmoothingEnabled = false
  oCtx.drawImage(small, 0, 0, size, size, 0, 0, 180, 180)

  return out.toDataURL('image/png')
}

export function createDefaultCaptainAvatar(playerIndex: 1 | 2, _accentHex?: string): string {
  return createBrainrotAvatar(playerIndex === 1 ? 'tralalero' : 'bombardiro')
}
