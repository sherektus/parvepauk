import type { BrainrotId } from '../data/gameContent'

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

const SKIN_PALETTES: SkinPalette[] = [
  // 0: Fair porcelain / peach
  {
    base: '#ffe0c8',
    highlight: '#fff0e4',
    shadow: '#f0b896',
    deepShadow: '#d48c6a',
    blush: '#f69999',
    lip: '#d96b70',
  },
  // 1: Warm light peach (classic Stardew)
  {
    base: '#fcc89b',
    highlight: '#ffe0c2',
    shadow: '#e29e6d',
    deepShadow: '#bd764a',
    blush: '#ee8282',
    lip: '#cf5c60',
  },
  // 2: Sun-kissed golden tan
  {
    base: '#eeb17d',
    highlight: '#f9cba0',
    shadow: '#cf8752',
    deepShadow: '#a66232',
    blush: '#df7070',
    lip: '#be4f54',
  },
  // 3: Warm olive / medium bronze
  {
    base: '#d8925e',
    highlight: '#ebae7d',
    shadow: '#b46c3b',
    deepShadow: '#8c4b22',
    blush: '#c95b5b',
    lip: '#a84048',
  },
  // 4: Rich caramel brown (like Maru)
  {
    base: '#b56c43',
    highlight: '#cc855b',
    shadow: '#8f4c28',
    deepShadow: '#693216',
    blush: '#b04848',
    lip: '#8f323b',
  },
  // 5: Deep warm espresso brown
  {
    base: '#874a2c',
    highlight: '#a36140',
    shadow: '#663219',
    deepShadow: '#471f0d',
    blush: '#8c353a',
    lip: '#70242c',
  },
]

const HAIR_PALETTES: HairPalette[] = [
  // 0: Golden Blonde (Haley / Sam)
  {
    outline: '#6b3e08',
    shadow: '#d98a14',
    base: '#facc15',
    highlight: '#fef08a',
  },
  // 1: Ginger / Copper Orange (Leah / Penny / Elliott)
  {
    outline: '#4a180a',
    shadow: '#b43e12',
    base: '#ea580c',
    highlight: '#fb923c',
  },
  // 2: Chestnut Brown (Harvey / Alex)
  {
    outline: '#2b130b',
    shadow: '#5c2c18',
    base: '#854224',
    highlight: '#b0603b',
  },
  // 3: Dark Espresso Brown
  {
    outline: '#1a0d0a',
    shadow: '#3b1f18',
    base: '#573026',
    highlight: '#7a483b',
  },
  // 4: Jet Raven Black (Sebastian)
  {
    outline: '#0f0e1c',
    shadow: '#1e1b36',
    base: '#2e294e',
    highlight: '#4c4675',
  },
  // 5: Auburn / Berry Red (Maru)
  {
    outline: '#330c18',
    shadow: '#6e1d35',
    base: '#992b4b',
    highlight: '#c4496c',
  },
  // 6: Amethyst Purple (Abigail)
  {
    outline: '#260e40',
    shadow: '#58228a',
    base: '#7e3af2',
    highlight: '#a774ff',
  },
  // 7: Cobalt Blue (Emily)
  {
    outline: '#0d1b4c',
    shadow: '#1d409e',
    base: '#2563eb',
    highlight: '#60a5fa',
  },
  // 8: Silver / Ash Blonde
  {
    outline: '#334155',
    shadow: '#64748b',
    base: '#cbd5e1',
    highlight: '#f8fafc',
  },
]

const OUTFIT_PALETTES: OutfitPalette[] = [
  // Crimson jacket (Elliott / Emily)
  {
    outline: '#380a14',
    shadow: '#991b1b',
    base: '#dc2626',
    highlight: '#f87171',
    inner: '#fef3c7',
    accent: '#16a34a',
  },
  // Forest green jacket (Harvey / Alex / Leah)
  {
    outline: '#082e18',
    shadow: '#166534',
    base: '#16a34a',
    highlight: '#4ade80',
    inner: '#f8fafc',
    accent: '#eab308',
  },
  // Royal blue jacket (Sam / Haley)
  {
    outline: '#0d1f47',
    shadow: '#1e40af',
    base: '#2563eb',
    highlight: '#60a5fa',
    inner: '#fde047',
    accent: '#f59e0b',
  },
  // Dark purple/indigo hoodie (Sebastian / Abigail)
  {
    outline: '#130d26',
    shadow: '#2e1f54',
    base: '#433075',
    highlight: '#644ca3',
    inner: '#1e293b',
    accent: '#94a3b8',
  },
  // Sunny amber shirt (Penny)
  {
    outline: '#422006',
    shadow: '#b45309',
    base: '#f59e0b',
    highlight: '#fde047',
    inner: '#ffffff',
    accent: '#ef4444',
  },
  // Violet overalls (Maru)
  {
    outline: '#2e1065',
    shadow: '#5b21b6',
    base: '#7c3aed',
    highlight: '#a78bfa',
    inner: '#cbd5e1',
    accent: '#94a3b8',
  },
]

const EYE_COLORS = [
  { dark: '#1e3a8a', light: '#3b82f6' }, // Blue
  { dark: '#14532d', light: '#22c55e' }, // Green
  { dark: '#451a03', light: '#92400e' }, // Warm Brown
  { dark: '#1e1b4b', light: '#4338ca' }, // Deep Indigo
  { dark: '#3f2e21', light: '#78553a' }, // Hazel
]

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

function sampleRegionAvg(
  data: Uint8ClampedArray,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let y = Math.max(0, y0); y < Math.min(w, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const idx = (y * w + x) * 4
      r += data[idx]
      g += data[idx + 1]
      b += data[idx + 2]
      count++
    }
  }
  if (count === 0) return [128, 128, 128]
  return [r / count, g / count, b / count]
}

/**
 * Analyzes the person's photo (skin tone, hair color, hair length/style,
 * glasses, beard/mustache, shirt color) and generates a Stardew Valley-style
 * RPG pixel-art character portrait!
 */
export function convertImageToPixelAvatar(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  crop: { offsetX: number; offsetY: number; zoom: number },
  _pixelGridSize: number = 40,
  _outputSize: number = 40
): string {
  // 1. Sample the source photo onto a 32x32 analysis canvas
  const AW = 32
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

  // Extract facial & clothing regions
  const [skinR, skinG, skinB] = sampleRegionAvg(aData, AW, 11, 12, 21, 20)
  const [hairTopR, hairTopG, hairTopB] = sampleRegionAvg(aData, AW, 9, 2, 23, 8)
  const [hairLeftR, hairLeftG, hairLeftB] = sampleRegionAvg(aData, AW, 4, 14, 9, 25)
  const [hairRightR, hairRightG, hairRightB] = sampleRegionAvg(aData, AW, 23, 14, 28, 25)
  const [bgCornerR, bgCornerG, bgCornerB] = sampleRegionAvg(aData, AW, 0, 0, 5, 6)
  const [chinR, chinG, chinB] = sampleRegionAvg(aData, AW, 12, 21, 20, 25)
  const [lipUpperR, lipUpperG, lipUpperB] = sampleRegionAvg(aData, AW, 12, 19, 20, 22)
  const [shirtR, shirtG, shirtB] = sampleRegionAvg(aData, AW, 8, 26, 24, 32)
  const [eyeRegionR, eyeRegionG, eyeRegionB] = sampleRegionAvg(aData, AW, 10, 11, 22, 15)

  // Match Skin Tone (with auto-exposure compensation so dark indoor lighting still looks natural)
  const skinLum = skinR * 0.299 + skinG * 0.587 + skinB * 0.114
  const skinIdx =
    skinLum > 195
      ? 0
      : skinLum > 165
      ? 1
      : skinLum > 138
      ? 2
      : skinLum > 110
      ? 3
      : skinLum > 82
      ? 4
      : 5
  const skin = SKIN_PALETTES[skinIdx]

  // Match Hair Palette from top hair HSL
  const [hHue, hSat, hLight] = rgbToHsl(hairTopR, hairTopG, hairTopB)
  let hairPaletteIdx = 2 // Default chestnut
  if (hLight < 0.19) {
    hairPaletteIdx = 4 // Jet black
  } else if (hLight < 0.28) {
    hairPaletteIdx = 3 // Dark espresso brown
  } else if (hSat > 0.28 && hHue >= 250 && hHue <= 315) {
    hairPaletteIdx = 6 // Purple
  } else if (hSat > 0.25 && hHue >= 185 && hHue < 250) {
    hairPaletteIdx = 7 // Cobalt blue
  } else if (hSat > 0.25 && (hHue >= 315 || hHue <= 14)) {
    hairPaletteIdx = 5 // Auburn / berry red
  } else if (hSat > 0.32 && hHue > 14 && hHue <= 36 && hLight < 0.62) {
    hairPaletteIdx = 1 // Ginger / copper orange
  } else if (hLight > 0.54 && hHue >= 32 && hHue <= 68) {
    hairPaletteIdx = 0 // Golden blonde
  } else if (hLight > 0.65 && hSat < 0.22) {
    hairPaletteIdx = 8 // Silver / ash blonde
  } else if (hHue >= 28 && hHue <= 55 && hLight > 0.42) {
    hairPaletteIdx = 0 // Blonde
  } else {
    hairPaletteIdx = 2 // Chestnut brown
  }
  const hair = HAIR_PALETTES[hairPaletteIdx]

  // Detect Hair Length & Style (0: long wavy, 1: medium bob, 2: spiky, 3: side-swept, 4: parted)
  const distSideToTop =
    Math.hypot(hairLeftR - hairTopR, hairLeftG - hairTopG, hairLeftB - hairTopB) +
    Math.hypot(hairRightR - hairTopR, hairRightG - hairTopG, hairRightB - hairTopB)
  const distSideToBg =
    Math.hypot(hairLeftR - bgCornerR, hairLeftG - bgCornerG, hairLeftB - bgCornerB) +
    Math.hypot(hairRightR - bgCornerR, hairRightG - bgCornerG, hairRightB - bgCornerB)

  const sideHairPresent = distSideToTop < 140 && distSideToBg > 75
  const hairAsymmetry = Math.round(Math.abs(hairLeftR - hairRightR + (hairLeftG - hairRightG)))
  const styleSeed = Math.round(skinR + hairTopR * 2 + shirtG + crop.zoom * 17)

  let hairStyle: 0 | 1 | 2 | 3 | 4 = 4
  if (sideHairPresent) {
    hairStyle = hairAsymmetry > 22 ? 0 : 1
  } else {
    const pick = styleSeed % 3
    hairStyle = pick === 0 ? 2 : pick === 1 ? 3 : 4
  }

  // Detect Glasses (check sharp luminance contrast at nose bridge & eye rims)
  let eyeContrast = 0
  for (let x = 9; x <= 22; x++) {
    const idx1 = (13 * AW + x) * 4
    const idx2 = (13 * AW + x + 1) * 4
    eyeContrast += Math.abs(aData[idx1] - aData[idx2])
  }
  const eyeLum = eyeRegionR * 0.299 + eyeRegionG * 0.587 + eyeRegionB * 0.114
  const hasGlasses = eyeContrast > 240 && eyeLum < skinLum * 0.92

  // Detect Mustache / Beard (if chin/upper lip is noticeably darker than cheeks & not long hair)
  const chinLum = chinR * 0.299 + chinG * 0.587 + chinB * 0.114
  const lipLum = lipUpperR * 0.299 + lipUpperG * 0.587 + lipUpperB * 0.114
  const hasBeard = !sideHairPresent && chinLum < skinLum * 0.74
  const hasMustache = !sideHairPresent && lipLum < skinLum * 0.78

  // Match Outfit Color from bottom of photo
  const [sHue, sSat, sLight] = rgbToHsl(shirtR, shirtG, shirtB)
  let outfitIdx = 1
  if (sLight < 0.25) {
    outfitIdx = 3 // Dark hoodie
  } else if (sSat > 0.22) {
    if (sHue < 22 || sHue >= 335) outfitIdx = 0 // Crimson
    else if (sHue >= 22 && sHue < 70) outfitIdx = 4 // Sunny amber
    else if (sHue >= 70 && sHue < 165) outfitIdx = 1 // Forest green
    else if (sHue >= 165 && sHue < 255) outfitIdx = 2 // Royal blue
    else outfitIdx = 5 // Violet
  } else {
    outfitIdx = styleSeed % OUTFIT_PALETTES.length
  }
  const outfit = OUTFIT_PALETTES[outfitIdx]
  const eyeColor = EYE_COLORS[styleSeed % EYE_COLORS.length]

  // 2. Draw 40x40 Stardew Valley-style Pixel Character Portrait!
  const G = 40
  const canvas = document.createElement('canvas')
  canvas.width = G
  canvas.height = G
  const ctx = canvas.getContext('2d')!

  const px = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  // --- A. Stardew Valley Sky, Fluffy Clouds & Green Hills Backdrop ---
  px(0, 0, '#1d4ed8', G, 9)
  px(0, 9, '#2563eb', G, 9)
  px(0, 18, '#38bdf8', G, 9)
  px(0, 27, '#7dd3fc', G, 7)
  // Lush green hills at bottom like the reference image
  px(0, 34, '#16a34a', G, 6)
  px(0, 34, '#22c55e', 12, 2)
  px(28, 34, '#22c55e', 12, 2)

  // Fluffy pixel clouds
  px(2, 5, '#dbeafe', 7, 3)
  px(3, 4, '#ffffff', 5, 3)
  px(30, 7, '#dbeafe', 8, 3)
  px(31, 6, '#ffffff', 6, 3)

  // --- B. Back Hair Layer (for Long & Medium hairstyles) ---
  if (hairStyle === 0) {
    // Long flowing hair draping down over shoulders
    px(10, 11, hair.outline, 20, 21)
    px(11, 12, hair.shadow, 18, 19)
    px(11, 14, hair.base, 4, 15)
    px(25, 14, hair.base, 4, 15)
  } else if (hairStyle === 1) {
    // Shoulder-length bob with curled ends
    px(10, 12, hair.outline, 20, 16)
    px(11, 13, hair.shadow, 18, 14)
    px(9, 22, hair.outline, 22, 5)
    px(10, 22, hair.base, 20, 4)
  }

  // --- C. Neck & Shoulders / Stardew Outfit Bust ---
  // Neck with outline
  px(16, 25, '#271c2b', 8, 6)
  px(17, 25, skin.shadow, 6, 3)
  px(17, 27, skin.base, 6, 3)

  // Shoulders & Torso base
  px(8, 29, outfit.outline, 24, 11)
  px(7, 31, outfit.outline, 26, 9)
  px(9, 30, outfit.base, 22, 10)
  px(8, 32, outfit.base, 24, 8)

  // Shoulder highlights & side shadows
  px(9, 30, outfit.highlight, 6, 2)
  px(25, 30, outfit.highlight, 6, 2)
  px(8, 35, outfit.shadow, 3, 5)
  px(29, 35, outfit.shadow, 3, 5)

  // Inner shirt V-neck & jacket collar lapels (Stardew portrait detail!)
  px(16, 29, outfit.outline, 8, 8)
  px(17, 29, outfit.inner, 6, 7)
  // Jacket lapels / collar wings
  px(14, 28, outfit.outline, 3, 6)
  px(23, 28, outfit.outline, 3, 6)
  px(15, 29, outfit.highlight, 2, 4)
  px(23, 29, outfit.highlight, 2, 4)
  // Tie / Necklace / Hoodie accent in center
  px(19, 32, outfit.accent, 2, 6)
  // Seam lines
  px(12, 34, outfit.outline, 1, 6)
  px(27, 34, outfit.outline, 1, 6)

  // --- D. Sculpted Head, Ears & Face ---
  // Ears
  px(10, 16, '#271c2b', 3, 5)
  px(27, 16, '#271c2b', 3, 5)
  px(11, 17, skin.shadow, 2, 3)
  px(27, 17, skin.shadow, 2, 3)

  // Head Dark Outline
  px(13, 9, '#271c2b', 14, 14)
  px(12, 11, '#271c2b', 16, 11)
  px(14, 23, '#271c2b', 12, 2)
  px(16, 25, '#271c2b', 8, 2)

  // Face Fill (Stardew warm shaded oval/jaw)
  px(14, 10, skin.base, 12, 13)
  px(13, 12, skin.base, 14, 9)
  px(15, 23, skin.base, 10, 2)
  px(17, 25, skin.base, 6, 1)

  // Forehead & cheek bridge highlights
  px(16, 11, skin.highlight, 8, 3)
  px(15, 18, skin.highlight, 3, 2)
  px(22, 18, skin.highlight, 3, 2)

  // Soft jaw & temple shading
  px(13, 19, skin.shadow, 1, 2)
  px(26, 19, skin.shadow, 1, 2)
  px(14, 21, skin.shadow, 1, 2)
  px(25, 21, skin.shadow, 1, 2)
  px(15, 23, skin.shadow, 2, 2)
  px(23, 23, skin.shadow, 2, 2)
  px(17, 25, skin.shadow, 6, 1)

  // Cute Stardew cheek blush
  px(14, 19, skin.blush, 2, 1)
  px(24, 19, skin.blush, 2, 1)

  // --- E. Expressive Eyes, Eyebrows, Nose & Mouth ---
  // Eyebrows
  px(14, 14, hair.outline, 4, 1)
  px(22, 14, hair.outline, 4, 1)

  // Eyes (2x3 expressive pixel eyes with sclera, colored iris & white sparkle)
  // Upper lash line
  px(14, 16, '#1e1b2e', 4, 1)
  px(22, 16, '#1e1b2e', 4, 1)
  // Sclera (whites)
  px(14, 17, '#ffffff', 4, 2)
  px(22, 17, '#ffffff', 4, 2)
  // Colored Iris & Pupil
  px(15, 17, eyeColor.dark, 2, 1)
  px(15, 18, eyeColor.light, 2, 1)
  px(23, 17, eyeColor.dark, 2, 1)
  px(23, 18, eyeColor.light, 2, 1)
  // Eye Sparkle
  px(15, 17, '#ffffff', 1, 1)
  px(23, 17, '#ffffff', 1, 1)

  // Cute Pixel Nose
  px(19, 17, skin.highlight, 1, 3)
  px(19, 19, skin.deepShadow, 2, 1)

  // Optional Facial Hair (Mustache / Beard like Harvey)
  if (hasBeard) {
    px(14, 21, hair.shadow, 2, 3)
    px(24, 21, hair.shadow, 2, 3)
    px(15, 23, hair.base, 10, 2)
    px(16, 24, hair.outline, 8, 2)
  }
  if (hasMustache || hasBeard) {
    px(16, 20, hair.outline, 8, 1)
    px(17, 21, hair.base, 6, 1)
  }

  // Mouth / Smile
  px(17, 21, skin.lip, 1, 1)
  px(22, 21, skin.lip, 1, 1)
  px(18, 22, '#271c2b', 4, 1)
  px(18, 23, skin.lip, 4, 1)

  // Optional Glasses (like Harvey & Maru in the screenshot!)
  if (hasGlasses) {
    const frameColor = '#1e1b2e'
    // Left frame
    px(13, 15, frameColor, 6, 1)
    px(13, 19, frameColor, 6, 1)
    px(13, 15, frameColor, 1, 5)
    px(18, 15, frameColor, 1, 5)
    // Right frame
    px(21, 15, frameColor, 6, 1)
    px(21, 19, frameColor, 6, 1)
    px(21, 15, frameColor, 1, 5)
    px(26, 15, frameColor, 1, 5)
    // Bridge
    px(19, 16, frameColor, 2, 1)
    // Lens glint
    px(14, 16, '#e0f2fe', 1, 1)
    px(22, 16, '#e0f2fe', 1, 1)
  }

  // --- F. Front Hair, Crown & Bangs Layer (5 Distinct Stardew Styles) ---
  if (hairStyle === 0) {
    // Style 0: Long Wavy Hair with sweeping side bangs (Haley / Abigail / Elliott)
    px(11, 5, hair.outline, 18, 6)
    px(10, 7, hair.outline, 20, 6)
    px(12, 6, hair.base, 16, 6)
    px(11, 8, hair.base, 18, 4)
    // Side-parted bang sweeping across forehead
    px(11, 11, hair.shadow, 10, 3)
    px(12, 10, hair.base, 8, 3)
    px(21, 10, hair.base, 7, 4)
    // Side locks framing face down to shoulders
    px(10, 11, hair.outline, 3, 19)
    px(11, 11, hair.base, 3, 18)
    px(27, 11, hair.outline, 3, 19)
    px(26, 11, hair.base, 3, 18)
    // Specular hair highlights
    px(14, 7, hair.highlight, 5, 2)
    px(22, 8, hair.highlight, 4, 2)
    px(12, 15, hair.highlight, 1, 6)
    px(27, 15, hair.highlight, 1, 6)
  } else if (hairStyle === 1) {
    // Style 1: Medium Bob / Framed Locks (Leah / Penny / Maru)
    px(11, 6, hair.outline, 18, 6)
    px(10, 8, hair.outline, 20, 5)
    px(12, 7, hair.base, 16, 5)
    // Parted soft bangs
    px(12, 10, hair.base, 6, 4)
    px(21, 10, hair.base, 7, 4)
    px(18, 10, hair.shadow, 3, 2)
    // Cheek-framing locks
    px(11, 12, hair.base, 2, 13)
    px(27, 12, hair.base, 2, 13)
    // Highlights
    px(13, 8, hair.highlight, 4, 2)
    px(22, 8, hair.highlight, 4, 2)
  } else if (hairStyle === 2) {
    // Style 2: Spiky / Energetic Short Hair (Sam / Alex)
    // Upward spikes with outline
    px(14, 3, hair.outline, 4, 4)
    px(19, 2, hair.outline, 5, 5)
    px(24, 4, hair.outline, 4, 4)
    px(11, 6, hair.outline, 18, 6)
    // Spike fills
    px(15, 4, hair.base, 3, 5)
    px(20, 3, hair.base, 4, 6)
    px(24, 5, hair.base, 3, 5)
    px(12, 7, hair.base, 16, 5)
    // Jagged forehead tufts
    px(13, 11, hair.shadow, 3, 2)
    px(18, 11, hair.base, 3, 3)
    px(23, 11, hair.shadow, 3, 2)
    // Sideburns
    px(12, 11, hair.base, 2, 5)
    px(26, 11, hair.base, 2, 5)
    // Bright spike highlights
    px(16, 5, hair.highlight, 2, 2)
    px(20, 4, hair.highlight, 3, 3)
    px(25, 6, hair.highlight, 2, 2)
  } else if (hairStyle === 3) {
    // Style 3: Cool Side-Swept Fringe (Sebastian / Emily)
    px(11, 5, hair.outline, 18, 7)
    px(10, 7, hair.outline, 19, 6)
    px(12, 6, hair.base, 16, 6)
    // Dramatic diagonal fringe sweeping over left forehead
    px(11, 10, hair.base, 12, 3)
    px(12, 12, hair.base, 7, 3)
    px(13, 14, hair.shadow, 4, 2)
    // Side locks
    px(11, 11, hair.base, 2, 8)
    px(26, 11, hair.base, 2, 6)
    // Highlights
    px(14, 7, hair.highlight, 6, 2)
    px(22, 8, hair.highlight, 3, 2)
  } else {
    // Style 4: Classic Parted / Tousled Hair (Harvey / Shane)
    px(12, 5, hair.outline, 16, 6)
    px(11, 7, hair.outline, 18, 6)
    px(13, 6, hair.base, 14, 6)
    px(12, 8, hair.base, 16, 4)
    // Tousled forehead wave
    px(13, 11, hair.base, 8, 2)
    px(15, 12, hair.shadow, 4, 2)
    px(22, 11, hair.shadow, 4, 2)
    // Neat sideburns
    px(12, 11, hair.shadow, 2, 5)
    px(26, 11, hair.shadow, 2, 5)
    // Highlights
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
