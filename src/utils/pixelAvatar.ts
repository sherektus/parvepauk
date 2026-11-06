import type { BrainrotId } from '../data/gameContent'

const PIXEL_PALETTE: [number, number, number][] = [
  [15, 23, 42],
  [30, 41, 59],
  [51, 65, 85],
  [100, 116, 139],
  [148, 163, 184],
  [226, 232, 240],
  [255, 255, 255],
  [74, 44, 42],
  [112, 66, 50],
  [149, 91, 66],
  [184, 119, 86],
  [214, 154, 118],
  [238, 186, 149],
  [251, 215, 186],
  [254, 235, 216],
  [127, 29, 29],
  [185, 28, 28],
  [239, 68, 68],
  [248, 113, 113],
  [194, 65, 12],
  [249, 115, 22],
  [161, 98, 7],
  [234, 179, 8],
  [253, 224, 71],
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
    const dr = (r - pr) * 0.3
    const dg = (g - pg) * 0.59
    const db = (b - pb) * 0.11
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      best = PIXEL_PALETTE[i]
    }
  }
  return best
}

export function convertImageToPixelAvatar(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  crop: { offsetX: number; offsetY: number; zoom: number },
  pixelGridSize: number = 48,
  outputSize: number = 240
): string {
  const smallCanvas = document.createElement('canvas')
  smallCanvas.width = pixelGridSize
  smallCanvas.height = pixelGridSize
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

  sCtx.imageSmoothingEnabled = false
  sCtx.drawImage(source, sx, sy, cropSide, cropSide, 0, 0, pixelGridSize, pixelGridSize)

  const imgData = sCtx.getImageData(0, 0, pixelGridSize, pixelGridSize)
  const data = imgData.data

  const bayer2x2 = [
    [-6, 4],
    [6, -4],
  ]

  for (let y = 0; y < pixelGridSize; y++) {
    for (let x = 0; x < pixelGridSize; x++) {
      const idx = (y * pixelGridSize + x) * 4
      const dither = bayer2x2[y % 2][x % 2]
      const boost = (v: number) => Math.max(0, Math.min(255, (v - 128) * 1.12 + 128 + dither))
      const r = boost(data[idx])
      const g = boost(data[idx + 1])
      const b = boost(data[idx + 2])

      // Blend palette color with 16-level RGB quantization for sharper facial detail
      const [pr, pg, pb] = nearestPaletteColor(r, g, b)
      const qr = Math.round(r / 20) * 20
      const qg = Math.round(g / 20) * 20
      const qb = Math.round(b / 20) * 20

      data[idx] = Math.round(pr * 0.45 + qr * 0.55)
      data[idx + 1] = Math.round(pg * 0.45 + qg * 0.55)
      data[idx + 2] = Math.round(pb * 0.45 + qb * 0.55)
      data[idx + 3] = 255
    }
  }

  sCtx.putImageData(imgData, 0, 0)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outputSize
  outCanvas.height = outputSize
  const oCtx = outCanvas.getContext('2d')!
  oCtx.imageSmoothingEnabled = false
  oCtx.drawImage(smallCanvas, 0, 0, pixelGridSize, pixelGridSize, 0, 0, outputSize, outputSize)

  return outCanvas.toDataURL('image/png')
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
