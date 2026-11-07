import type { BrainrotId } from '../data/gameContent'

export interface CharacterTraitOverrides {
  hairStyleOffset?: number
  hairColorOffset?: number
  toggleGlasses?: boolean
  toggleFacialHair?: boolean
}

interface SkinPalette {
  base: string
  highlight: string
  shadow: string
  deepShadow: string
  blush: string
  lip: string
}

interface HairPalette {
  outline: string
  shadow: string
  base: string
  highlight: string
}

interface OutfitPalette {
  outline: string
  shadow: string
  base: string
  highlight: string
  inner: string
  accent: string
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h *= 60
  }
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (h < 60) [r1, g1, b1] = [c, x, 0]
  else if (h < 120) [r1, g1, b1] = [x, c, 0]
  else if (h < 180) [r1, g1, b1] = [0, c, x]
  else if (h < 240) [r1, g1, b1] = [0, x, c]
  else if (h < 300) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  return [
    clampByte((r1 + m) * 255),
    clampByte((g1 + m) * 255),
    clampByte((b1 + m) * 255),
  ]
}

function buildDynamicSkinPalette(r: number, g: number, b: number, highlightLum: number): SkinPalette {
  // Normalize skin brightness relative to the image's 90th percentile highlight so indoor dim lighting doesn't darken fair skin
  const rawLum = r * 0.299 + g * 0.587 + b * 0.114
  const relLum = rawLum / Math.max(110, highlightLum)

  // Map relative skin luminance to natural Stardew Valley warm skin lightness (0.52 to 0.84)
  const targetL = Math.max(0.46, Math.min(0.85, 0.44 + relLum * 0.44))
  const [h, s] = rgbToHsl(r, g, b)
  const warmH = h >= 8 && h <= 42 ? h : 24
  const warmS = Math.max(0.48, Math.min(0.78, s * 1.15 + 0.18))

  const [br, bg, bb] = hslToRgb(warmH, warmS, targetL)
  const [hr, hg, hb] = hslToRgb(warmH + 3, Math.max(0.35, warmS - 0.1), Math.min(0.93, targetL + 0.09))
  const [sr, sg, sb] = hslToRgb(warmH - 4, Math.min(0.82, warmS + 0.06), Math.max(0.28, targetL - 0.12))
  const [dr, dg, db] = hslToRgb(warmH - 7, Math.min(0.85, warmS + 0.08), Math.max(0.18, targetL - 0.23))
  const [blr, blg, blb] = hslToRgb(6, 0.68, Math.max(0.42, targetL - 0.08))
  const [lpr, lpg, lpb] = hslToRgb(355, 0.58, Math.max(0.34, targetL - 0.16))

  return {
    base: rgbToHex(br, bg, bb),
    highlight: rgbToHex(hr, hg, hb),
    shadow: rgbToHex(sr, sg, sb),
    deepShadow: rgbToHex(dr, dg, db),
    blush: rgbToHex(blr, blg, blb),
    lip: rgbToHex(lpr, lpg, lpb),
  }
}

function buildDynamicHairPalette(
  r: number,
  g: number,
  b: number,
  skinLum: number,
  colorOffset = 0
): HairPalette {
  const [rawH, rawS, rawL] = rgbToHsl(r, g, b)
  const hairLum = r * 0.299 + g * 0.587 + b * 0.114
  const ratioToSkin = hairLum / Math.max(60, skinLum)

  // If user clicked hair color cycle button, step through distinct natural/vibrant palettes
  if (colorOffset > 0) {
    const presets: [number, number, number][] = [
      [42, 0.85, 0.62], // Golden blonde
      [25, 0.65, 0.36], // Chestnut brown
      [18, 0.55, 0.2],  // Dark espresso
      [240, 0.25, 0.14], // Jet black
      [18, 0.82, 0.48], // Ginger copper
      [345, 0.62, 0.38], // Auburn red
      [272, 0.68, 0.52], // Amethyst purple
      [215, 0.78, 0.48], // Cobalt blue
      [210, 0.12, 0.78], // Silver blonde
    ]
    const [ph, ps, pl] = presets[colorOffset % presets.length]
    return makeHairShades(ph, ps, pl)
  }

  let h = rawH
  let s = rawS
  let l = rawL

  if (ratioToSkin < 0.36 || rawL < 0.16) {
    // Very dark / black hair
    h = 245
    s = 0.22
    l = 0.16
  } else if (ratioToSkin < 0.56 || rawL < 0.28) {
    // Dark brown hair
    h = 22
    s = Math.max(0.42, Math.min(0.65, rawS + 0.15))
    l = 0.24
  } else if (ratioToSkin < 0.82) {
    // Medium brown / chestnut / auburn
    if (rawH >= 330 || rawH <= 15) {
      h = 352
      s = Math.max(0.5, rawS + 0.15)
      l = 0.36
    } else {
      h = 25
      s = Math.max(0.48, Math.min(0.72, rawS + 0.18))
      l = 0.36
    }
  } else {
    // Light hair: Blonde, Dirty Blonde, Ginger, or Silver/Grey
    if (rawS < 0.16 && rawL > 0.55) {
      // Ash / Silver / Platinum blonde
      h = 38
      s = 0.28
      l = 0.72
    } else if (rawH >= 10 && rawH <= 28 && rawS > 0.38) {
      // Ginger / Strawberry blonde
      h = 22
      s = 0.78
      l = 0.52
    } else {
      // Golden / Honey Blonde
      h = 42
      s = 0.82
      l = Math.max(0.56, Math.min(0.72, rawL * 1.15))
    }
  }

  // Support vivid dyed hair (purple, blue, green, pink) if strongly saturated in photo
  if (rawS > 0.38 && (rawH > 65 && rawH < 330)) {
    h = rawH
    s = Math.min(0.82, rawS * 1.2)
    l = Math.max(0.38, Math.min(0.58, rawL * 1.1))
  }

  return makeHairShades(h, s, l)
}

function makeHairShades(h: number, s: number, l: number): HairPalette {
  const [or, og, ob] = hslToRgb(h - 6, Math.min(0.85, s + 0.1), Math.max(0.08, l * 0.38))
  const [sr, sg, sb] = hslToRgb(h - 3, Math.min(0.85, s + 0.05), Math.max(0.14, l * 0.72))
  const [br, bg, bb] = hslToRgb(h, s, l)
  const [hr, hg, hb] = hslToRgb(h + 5, Math.max(0.25, s - 0.06), Math.min(0.92, l + 0.16))
  return {
    outline: rgbToHex(or, og, ob),
    shadow: rgbToHex(sr, sg, sb),
    base: rgbToHex(br, bg, bb),
    highlight: rgbToHex(hr, hg, hb),
  }
}

function buildDynamicOutfitPalette(r: number, g: number, b: number): OutfitPalette {
  const [h, s, l] = rgbToHsl(r, g, b)

  // Preserve the person's actual shirt/hoodie color from the photo (including black, grey, white, navy, or bright colors!)
  const effS = s < 0.12 ? s : Math.max(0.35, Math.min(0.82, s * 1.2))
  const effL = Math.max(0.18, Math.min(0.78, l))

  const [or, og, ob] = hslToRgb(h, effS, Math.max(0.07, effL * 0.35))
  const [sr, sg, sb] = hslToRgb(h, effS, Math.max(0.12, effL * 0.72))
  const [br, bg, bb] = hslToRgb(h, effS, effL)
  const [hr, hg, hb] = hslToRgb(h, Math.max(0, effS - 0.05), Math.min(0.92, effL + 0.15))

  // Contrasting inner shirt
  const innerHex = effL < 0.45 ? '#f1f5f9' : '#1e293b'
  const accentHex = '#fbbf24'

  return {
    outline: rgbToHex(or, og, ob),
    shadow: rgbToHex(sr, sg, sb),
    base: rgbToHex(br, bg, bb),
    highlight: rgbToHex(hr, hg, hb),
    inner: innerHex,
    accent: accentHex,
  }
}

/**
 * Locates the person's face & hair in the photo, extracts their real skin tone,
 * hair color, hair length/style, glasses, facial hair, eye color, smile, and
 * actual shirt color, and draws a Stardew Valley-style pixel-art character portrait!
 */
export function convertImageToPixelAvatar(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  crop: { offsetX: number; offsetY: number; zoom: number } & CharacterTraitOverrides,
  _pixelGridSize: number = 40,
  _outputSize: number = 40
): string {
  const AW = 64
  const aCanvas = document.createElement('canvas')
  aCanvas.width = AW
  aCanvas.height = AW
  const aCtx = aCanvas.getContext('2d')!

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

  aCtx.drawImage(source, sx, sy, cropSide, cropSide, 0, 0, AW, AW)
  const aData = aCtx.getImageData(0, 0, AW, AW).data

  const getPx = (x: number, y: number): [number, number, number] => {
    const cx = Math.max(0, Math.min(AW - 1, Math.round(x)))
    const cy = Math.max(0, Math.min(AW - 1, Math.round(y)))
    const i = (cy * AW + cx) * 4
    return [aData[i], aData[i + 1], aData[i + 2]]
  }

  // 1. Sample outer border corners to learn the room background color
  const bgCorners: [number, number, number][] = []
  for (let y = 0; y < 12; y += 2) {
    bgCorners.push(getPx(1, y), getPx(AW - 2, y))
  }
  for (let x = 4; x < AW - 4; x += 4) {
    bgCorners.push(getPx(x, 1))
  }

  const isBgColor = (r: number, g: number, b: number, tol = 38): boolean => {
    for (const [br, bg, bb] of bgCorners) {
      if (Math.hypot(r - br, g - bg, b - bb) < tol) return true
    }
    return false
  }

  // 2. Locate the skin/face cluster centroid (faceX, faceY) and size (faceR)
  let skinXSum = 0
  let skinYSum = 0
  let skinWeightSum = 0
  const lums: number[] = []

  for (let y = 12; y < 52; y++) {
    for (let x = 14; x < 50; x++) {
      const [r, g, b] = getPx(x, y)
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      lums.push(lum)

      // YCbCr skin chrominance + warm R >= G >= B check
      const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b
      const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b
      const isSkinLike =
        cr >= 132 &&
        cr <= 178 &&
        cb >= 78 &&
        cb <= 135 &&
        r > b + 10 &&
        lum > 45 &&
        lum < 245 &&
        !isBgColor(r, g, b, 26)

      if (isSkinLike) {
        // Weight slightly toward center so neck/hands don't pull face center away
        const centerBias = 1.2 - Math.hypot(x - 32, y - 30) / 45
        const w = Math.max(0.2, centerBias)
        skinXSum += x * w
        skinYSum += y * w
        skinWeightSum += w
      }
    }
  }

  lums.sort((a, b) => a - b)
  const highlightLum = lums[Math.floor(lums.length * 0.9)] || 185

  const faceX = skinWeightSum > 8 ? skinXSum / skinWeightSum : 32
  const faceY = skinWeightSum > 8 ? skinYSum / skinWeightSum : 30
  const faceR = 13 // Standard radius around detected face center in 64x64 space

  // 3. Sample Cheek & Forehead Skin Color around (faceX, faceY)
  let sR = 0
  let sG = 0
  let sB = 0
  let sCnt = 0
  for (let dy = -4; dy <= 5; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      // Sample cheeks & nose bridge, skipping eye sockets
      if (dy < -1 && Math.abs(dx) > 3) continue
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      if (lum > 45) {
        sR += r
        sG += g
        sB += b
        sCnt++
      }
    }
  }
  const avgSkinR = sCnt > 0 ? sR / sCnt : 225
  const avgSkinG = sCnt > 0 ? sG / sCnt : 180
  const avgSkinB = sCnt > 0 ? sB / sCnt : 150
  const avgSkinLum = avgSkinR * 0.299 + avgSkinG * 0.587 + avgSkinB * 0.114

  const skin = buildDynamicSkinPalette(avgSkinR, avgSkinG, avgSkinB, highlightLum)

  const isSkinTone = (r: number, g: number, b: number): boolean => {
    return Math.hypot(r - avgSkinR, g - avgSkinG, b - avgSkinB) < 42
  }

  // 4. Sample Hair Pixels directly above the forehead & temples (ignoring room background & skin!)
  const hairPixels: [number, number, number][] = []
  for (let dy = -Math.round(faceR * 1.45); dy <= -Math.round(faceR * 0.45); dy++) {
    for (let dx = -Math.round(faceR * 0.85); dx <= Math.round(faceR * 0.85); dx++) {
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      if (!isBgColor(r, g, b, 34) && !isSkinTone(r, g, b)) {
        hairPixels.push([r, g, b])
      }
    }
  }
  // Fallback if background wall was very similar to hair: sample just above forehead
  if (hairPixels.length < 6) {
    for (let dy = -14; dy <= -8; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        hairPixels.push(getPx(faceX + dx, faceY + dy))
      }
    }
  }

  let hR = 0
  let hG = 0
  let hB = 0
  for (const [r, g, b] of hairPixels) {
    hR += r
    hG += g
    hB += b
  }
  hR /= Math.max(1, hairPixels.length)
  hG /= Math.max(1, hairPixels.length)
  hB /= Math.max(1, hairPixels.length)

  const hair = buildDynamicHairPalette(
    hR,
    hG,
    hB,
    avgSkinLum,
    crop.hairColorOffset || 0
  )

  // 5. Detect Hair Length & Hairstyle by checking if hair color continues down along the sides of the face & jaw!
  const matchesHair = (r: number, g: number, b: number): boolean => {
    return (
      Math.hypot(r - hR, g - hG, b - hB) < 58 &&
      !isBgColor(r, g, b, 32) &&
      !isSkinTone(r, g, b)
    )
  }

  let lowerSideHairHits = 0
  let lowerSideTotal = 0
  for (let dy = 2; dy <= 16; dy += 2) {
    for (const side of [-1, 1]) {
      for (let d = 9; d <= 16; d += 2) {
        const [r, g, b] = getPx(faceX + side * d, faceY + dy)
        lowerSideTotal++
        if (matchesHair(r, g, b)) {
          lowerSideHairHits++
        }
      }
    }
  }

  let midSideHairHits = 0
  for (let dy = -4; dy <= 6; dy += 2) {
    for (const side of [-1, 1]) {
      for (let d = 9; d <= 15; d += 2) {
        const [r, g, b] = getPx(faceX + side * d, faceY + dy)
        if (matchesHair(r, g, b)) {
          midSideHairHits++
        }
      }
    }
  }

  // Check if bangs cover the forehead
  let foreheadHairHits = 0
  for (let dy = -9; dy <= -5; dy++) {
    for (let dx = -5; dx <= 5; dx += 2) {
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      if (matchesHair(r, g, b)) foreheadHairHits++
    }
  }

  const lowerSideRatio = lowerSideHairHits / Math.max(1, lowerSideTotal)
  let detectedStyle: 0 | 1 | 2 | 3 | 4 = 4
  if (lowerSideRatio > 0.32) {
    detectedStyle = 0 // Long flowing hair past shoulders
  } else if (lowerSideRatio > 0.18 || midSideHairHits > 12) {
    detectedStyle = 1 // Medium / shoulder-length bob
  } else if (foreheadHairHits >= 8) {
    detectedStyle = 3 // Side-swept bangs / fringe
  } else if (foreheadHairHits <= 3) {
    detectedStyle = 2 // Short spiky / high forehead
  } else {
    detectedStyle = 4 // Classic parted short hair
  }

  const hairStyle = (((detectedStyle + (crop.hairStyleOffset || 0)) % 5) + 5) % 5 as
    | 0
    | 1
    | 2
    | 3
    | 4

  // 6. Detect Glasses (check bridge between eyes & outer eye frames relative to forehead skin)
  let bridgeDarkPixels = 0
  for (let dy = -5; dy <= -1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      if (lum < avgSkinLum * 0.72) bridgeDarkPixels++
    }
  }
  let outerFrameEdges = 0
  for (const side of [-1, 1]) {
    const [r1, g1, b1] = getPx(faceX + side * 8, faceY - 3)
    const lum1 = r1 * 0.299 + g1 * 0.587 + b1 * 0.114
    if (lum1 < avgSkinLum * 0.72) outerFrameEdges++
  }
  let hasGlasses = bridgeDarkPixels >= 4 && outerFrameEdges >= 1
  if (crop.toggleGlasses) hasGlasses = !hasGlasses

  // 7. Detect Beard / Mustache (strict check: must be much darker & less warm-skin than cheeks, and not long hair)
  let chinDarkHits = 0
  let chinSamples = 0
  for (let dy = 8; dy <= 13; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      chinSamples++
      if (lum < avgSkinLum * 0.58 && !isSkinTone(r, g, b)) {
        chinDarkHits++
      }
    }
  }
  let hasBeard =
    detectedStyle !== 0 &&
    detectedStyle !== 1 &&
    chinDarkHits / Math.max(1, chinSamples) > 0.55
  if (crop.toggleFacialHair) hasBeard = !hasBeard

  // 8. Detect Open Tooth Smile vs Warm Closed Smile
  let brightTeethPixels = 0
  for (let dy = 5; dy <= 8; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const [r, g, b] = getPx(faceX + dx, faceY + dy)
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      const [, sat] = rgbToHsl(r, g, b)
      if (lum > avgSkinLum * 1.04 && sat < 0.28) {
        brightTeethPixels++
      }
    }
  }
  const hasBigGrin = brightTeethPixels >= 3

  // 9. Sample Eye Color from eye sockets
  const [eR, eG, eB] = getPx(faceX - 4, faceY - 3)
  const [eHue, eSat, eLight] = rgbToHsl(eR, eG, eB)
  let eyeColor = { dark: '#1e3a8a', light: '#3b82f6' } // Default blue (very common in Estonia!)
  if (eLight < 0.22) {
    eyeColor = { dark: '#3b1f18', light: '#784421' } // Dark brown
  } else if (eSat > 0.2 && eHue >= 75 && eHue < 165) {
    eyeColor = { dark: '#14532d', light: '#22c55e' } // Green
  } else if (eSat > 0.22 && eHue >= 18 && eHue < 75) {
    eyeColor = { dark: '#451a03', light: '#a16207' } // Hazel / Amber brown
  }

  // 10. Sample Actual Shirt / Hoodie Color below the neck
  let shR = 0
  let shG = 0
  let shB = 0
  let shCnt = 0
  for (let y = Math.min(AW - 6, Math.round(faceY + 17)); y < AW; y++) {
    for (let x = Math.max(8, Math.round(faceX - 12)); x < Math.min(AW - 8, Math.round(faceX + 12)); x++) {
      const [r, g, b] = getPx(x, y)
      if (!isSkinTone(r, g, b)) {
        shR += r
        shG += g
        shB += b
        shCnt++
      }
    }
  }
  if (shCnt > 0) {
    shR /= shCnt
    shG /= shCnt
    shB /= shCnt
  } else {
    ;[shR, shG, shB] = [37, 99, 235]
  }
  const outfit = buildDynamicOutfitPalette(shR, shG, shB)

  // --- DRAW 40x40 STARDEW VALLEY-STYLE PIXEL PORTRAIT ---
  const G = 40
  const canvas = document.createElement('canvas')
  canvas.width = G
  canvas.height = G
  const ctx = canvas.getContext('2d')!

  const px = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  // A. Sky, Fluffy Clouds & Green Hills Backdrop
  px(0, 0, '#1d4ed8', G, 9)
  px(0, 9, '#2563eb', G, 9)
  px(0, 18, '#38bdf8', G, 9)
  px(0, 27, '#7dd3fc', G, 7)
  px(0, 34, '#16a34a', G, 6)
  px(0, 34, '#22c55e', 12, 2)
  px(28, 34, '#22c55e', 12, 2)

  px(2, 5, '#dbeafe', 7, 3)
  px(3, 4, '#ffffff', 5, 3)
  px(30, 7, '#dbeafe', 8, 3)
  px(31, 6, '#ffffff', 6, 3)

  // B. Back Hair Layer (for Long & Medium hairstyles)
  if (hairStyle === 0) {
    px(10, 11, hair.outline, 20, 22)
    px(11, 12, hair.shadow, 18, 20)
    px(11, 14, hair.base, 4, 16)
    px(25, 14, hair.base, 4, 16)
  } else if (hairStyle === 1) {
    px(10, 12, hair.outline, 20, 16)
    px(11, 13, hair.shadow, 18, 14)
    px(9, 22, hair.outline, 22, 5)
    px(10, 22, hair.base, 20, 4)
  }

  // C. Neck & Shoulders / Stardew Outfit Bust
  px(16, 25, '#271c2b', 8, 6)
  px(17, 25, skin.shadow, 6, 3)
  px(17, 27, skin.base, 6, 3)

  px(8, 29, outfit.outline, 24, 11)
  px(7, 31, outfit.outline, 26, 9)
  px(9, 30, outfit.base, 22, 10)
  px(8, 32, outfit.base, 24, 8)

  px(9, 30, outfit.highlight, 6, 2)
  px(25, 30, outfit.highlight, 6, 2)
  px(8, 35, outfit.shadow, 3, 5)
  px(29, 35, outfit.shadow, 3, 5)

  px(16, 29, outfit.outline, 8, 8)
  px(17, 29, outfit.inner, 6, 7)
  px(14, 28, outfit.outline, 3, 6)
  px(23, 28, outfit.outline, 3, 6)
  px(15, 29, outfit.highlight, 2, 4)
  px(23, 29, outfit.highlight, 2, 4)
  px(19, 32, outfit.accent, 2, 6)
  px(12, 34, outfit.outline, 1, 6)
  px(27, 34, outfit.outline, 1, 6)

  // D. Sculpted Head, Ears & Face
  px(10, 16, '#271c2b', 3, 5)
  px(27, 16, '#271c2b', 3, 5)
  px(11, 17, skin.shadow, 2, 3)
  px(27, 17, skin.shadow, 2, 3)

  px(13, 9, '#271c2b', 14, 14)
  px(12, 11, '#271c2b', 16, 11)
  px(14, 23, '#271c2b', 12, 2)
  px(16, 25, '#271c2b', 8, 2)

  px(14, 10, skin.base, 12, 13)
  px(13, 12, skin.base, 14, 9)
  px(15, 23, skin.base, 10, 2)
  px(17, 25, skin.base, 6, 1)

  px(16, 11, skin.highlight, 8, 3)
  px(15, 18, skin.highlight, 3, 2)
  px(22, 18, skin.highlight, 3, 2)

  px(13, 19, skin.shadow, 1, 2)
  px(26, 19, skin.shadow, 1, 2)
  px(14, 21, skin.shadow, 1, 2)
  px(25, 21, skin.shadow, 1, 2)
  px(15, 23, skin.shadow, 2, 2)
  px(23, 23, skin.shadow, 2, 2)
  px(17, 25, skin.shadow, 6, 1)

  px(14, 19, skin.blush, 2, 1)
  px(24, 19, skin.blush, 2, 1)

  // E. Expressive Eyes, Eyebrows, Nose & Mouth
  px(14, 14, hair.outline, 4, 1)
  px(22, 14, hair.outline, 4, 1)

  px(14, 16, '#1e1b2e', 4, 1)
  px(22, 16, '#1e1b2e', 4, 1)
  px(14, 17, '#ffffff', 4, 2)
  px(22, 17, '#ffffff', 4, 2)
  px(15, 17, eyeColor.dark, 2, 1)
  px(15, 18, eyeColor.light, 2, 1)
  px(23, 17, eyeColor.dark, 2, 1)
  px(23, 18, eyeColor.light, 2, 1)
  px(15, 17, '#ffffff', 1, 1)
  px(23, 17, '#ffffff', 1, 1)

  px(19, 17, skin.highlight, 1, 3)
  px(19, 19, skin.deepShadow, 2, 1)

  if (hasBeard) {
    px(14, 21, hair.shadow, 2, 3)
    px(24, 21, hair.shadow, 2, 3)
    px(15, 23, hair.base, 10, 2)
    px(16, 24, hair.outline, 8, 2)
    px(16, 20, hair.outline, 8, 1)
    px(17, 21, hair.base, 6, 1)
  }

  if (hasBigGrin) {
    px(17, 21, '#271c2b', 6, 2)
    px(18, 21, '#ffffff', 4, 1)
    px(18, 22, skin.lip, 4, 1)
  } else {
    px(17, 21, skin.lip, 1, 1)
    px(22, 21, skin.lip, 1, 1)
    px(18, 22, '#271c2b', 4, 1)
    px(18, 23, skin.lip, 4, 1)
  }

  if (hasGlasses) {
    const frameColor = '#1e1b2e'
    px(13, 15, frameColor, 6, 1)
    px(13, 19, frameColor, 6, 1)
    px(13, 15, frameColor, 1, 5)
    px(18, 15, frameColor, 1, 5)
    px(21, 15, frameColor, 6, 1)
    px(21, 19, frameColor, 6, 1)
    px(21, 15, frameColor, 1, 5)
    px(26, 15, frameColor, 1, 5)
    px(19, 16, frameColor, 2, 1)
    px(14, 16, '#e0f2fe', 1, 1)
    px(22, 16, '#e0f2fe', 1, 1)
  }

  // F. Front Hair, Crown & Bangs Layer
  if (hairStyle === 0) {
    px(11, 5, hair.outline, 18, 6)
    px(10, 7, hair.outline, 20, 6)
    px(12, 6, hair.base, 16, 6)
    px(11, 8, hair.base, 18, 4)
    px(11, 11, hair.shadow, 10, 3)
    px(12, 10, hair.base, 8, 3)
    px(21, 10, hair.base, 7, 4)
    px(10, 11, hair.outline, 3, 20)
    px(11, 11, hair.base, 3, 19)
    px(27, 11, hair.outline, 3, 20)
    px(26, 11, hair.base, 3, 19)
    px(14, 7, hair.highlight, 5, 2)
    px(22, 8, hair.highlight, 4, 2)
    px(12, 15, hair.highlight, 1, 6)
    px(27, 15, hair.highlight, 1, 6)
  } else if (hairStyle === 1) {
    px(11, 6, hair.outline, 18, 6)
    px(10, 8, hair.outline, 20, 5)
    px(12, 7, hair.base, 16, 5)
    px(12, 10, hair.base, 6, 4)
    px(21, 10, hair.base, 7, 4)
    px(18, 10, hair.shadow, 3, 2)
    px(11, 12, hair.base, 2, 13)
    px(27, 12, hair.base, 2, 13)
    px(13, 8, hair.highlight, 4, 2)
    px(22, 8, hair.highlight, 4, 2)
  } else if (hairStyle === 2) {
    px(14, 3, hair.outline, 4, 4)
    px(19, 2, hair.outline, 5, 5)
    px(24, 4, hair.outline, 4, 4)
    px(11, 6, hair.outline, 18, 6)
    px(15, 4, hair.base, 3, 5)
    px(20, 3, hair.base, 4, 6)
    px(24, 5, hair.base, 3, 5)
    px(12, 7, hair.base, 16, 5)
    px(13, 11, hair.shadow, 3, 2)
    px(18, 11, hair.base, 3, 3)
    px(23, 11, hair.shadow, 3, 2)
    px(12, 11, hair.base, 2, 5)
    px(26, 11, hair.base, 2, 5)
    px(16, 5, hair.highlight, 2, 2)
    px(20, 4, hair.highlight, 3, 3)
    px(25, 6, hair.highlight, 2, 2)
  } else if (hairStyle === 3) {
    px(11, 5, hair.outline, 18, 7)
    px(10, 7, hair.outline, 19, 6)
    px(12, 6, hair.base, 16, 6)
    px(11, 10, hair.base, 12, 3)
    px(12, 12, hair.base, 7, 3)
    px(13, 14, hair.shadow, 4, 2)
    px(11, 11, hair.base, 2, 8)
    px(26, 11, hair.base, 2, 6)
    px(14, 7, hair.highlight, 6, 2)
    px(22, 8, hair.highlight, 3, 2)
  } else {
    px(12, 5, hair.outline, 16, 6)
    px(11, 7, hair.outline, 18, 6)
    px(13, 6, hair.base, 14, 6)
    px(12, 8, hair.base, 16, 4)
    px(13, 11, hair.base, 8, 2)
    px(15, 12, hair.shadow, 4, 2)
    px(22, 11, hair.shadow, 4, 2)
    px(12, 11, hair.shadow, 2, 5)
    px(26, 11, hair.shadow, 2, 5)
    px(15, 7, hair.highlight, 5, 2)
    px(22, 8, hair.highlight, 3, 2)
  }

  return canvas.toDataURL('image/png')
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
    ctx.fillStyle = '#1e3a8a'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(7, 2, 3, 3)
    ctx.fillRect(3, 5, 12, 6)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(4, 9, 10, 3)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(5, 8, 6, 1)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(5, 6, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(5, 6, 1, 1)
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(4, 12, 2, 3)
    ctx.fillRect(8, 12, 2, 3)
    ctx.fillRect(12, 12, 2, 3)
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(3, 14, 4, 2)
    ctx.fillRect(7, 14, 4, 2)
    ctx.fillRect(11, 14, 4, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(3, 16, 4, 1)
    ctx.fillRect(7, 16, 4, 1)
    ctx.fillRect(11, 16, 4, 1)
  } else if (id === 'bombardiro') {
    ctx.fillStyle = '#172554'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(1, 7, 16, 3)
    ctx.fillStyle = '#facc15'
    ctx.fillRect(2, 5, 2, 2)
    ctx.fillRect(14, 5, 2, 2)
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(5, 4, 8, 8)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(3, 8, 10, 4)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(4, 11, 8, 1)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(6, 5, 2, 2)
    ctx.fillRect(10, 5, 2, 2)
    ctx.fillStyle = '#334155'
    ctx.fillRect(7, 13, 4, 3)
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(6, 14, 1, 2)
  } else if (id === 'tungtung') {
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#b45309'
    ctx.fillRect(5, 2, 7, 14)
    ctx.fillStyle = '#d97706'
    ctx.fillRect(6, 3, 5, 12)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(6, 5, 2, 3)
    ctx.fillRect(9, 5, 2, 3)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(7, 6, 1, 2)
    ctx.fillRect(9, 6, 1, 2)
    ctx.fillStyle = '#451a03'
    ctx.fillRect(7, 10, 3, 2)
    ctx.fillStyle = '#fde047'
    ctx.fillRect(13, 3, 3, 9)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(14, 12, 1, 3)
  } else if (id === 'lirili') {
    ctx.fillStyle = '#451a03'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#15803d'
    ctx.fillRect(2, 4, 3, 6)
    ctx.fillRect(13, 4, 3, 6)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(5, 3, 8, 10)
    ctx.fillRect(8, 9, 3, 5)
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(6, 4, 1, 1)
    ctx.fillRect(11, 4, 1, 1)
    ctx.fillRect(5, 10, 1, 1)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(6, 6, 2, 2)
    ctx.fillRect(10, 6, 2, 2)
    ctx.fillStyle = '#f97316'
    ctx.fillRect(4, 14, 4, 2)
    ctx.fillRect(10, 14, 4, 2)
  } else if (id === 'patapim') {
    ctx.fillStyle = '#064e3b'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(4, 2, 10, 4)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(5, 5, 8, 7)
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(7, 7, 4, 4)
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(6, 6, 2, 1)
    ctx.fillRect(10, 6, 2, 1)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(2, 13, 6, 3)
    ctx.fillRect(10, 13, 6, 3)
  } else {
    ctx.fillStyle = '#31102f'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(2, 2, 2, 14)
    ctx.fillRect(14, 2, 2, 14)
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(5, 3, 8, 3)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(5, 6, 8, 9)
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
