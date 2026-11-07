import React, { useEffect, useRef, useState } from 'react'
import {
  Heart,
  Shield,
  Wind,
  Pause,
  BookOpen,
  RotateCcw,
  Volume2,
  VolumeX,
  Play,
  MessageSquareWarning,
  Flame,
  Crosshair,
  Skull,
  Compass,
} from 'lucide-react'
import {
  BRAINROT_CHARACTERS,
  CAPTAIN_HIT_REACTIONS,
  CREW_NAMES,
  PLAYER_COLORS,
  YO_MAMA_JOKES,
  type BrainrotCharacter,
  type BrainrotId,
  type WheelOutcome,
} from '../data/gameContent'
import { createBrainrotAvatar } from '../utils/pixelAvatar'
import type { PlayerSetupConfig } from './SetupModal'
import { RiskWheelModal } from './RiskWheelModal'
import { sound } from '../utils/sound'

export interface CrewUnit {
  id: number
  name: string
  relX: number
  relY: number
  vx: number
  vy: number
  airborne: boolean
  inWater: boolean
  hatColor: string
  shirtColor: string
}

export interface PlayerBattleState {
  id: number
  team: 0 | 1
  name: string
  colorId: string
  captainAvatar: string
  captainLives: number
  hasShield: boolean
  skipNextTurn: boolean
  crew: CrewUnit[]
  totalSipsTaken: number
}

interface BetOption {
  id: 'normal' | 'high' | 'ultra'
  sips: number
  captainDamage: number
  label: string
  subLabel: string
  raftLeftX: number
  raftRightX: number
}

interface Projectile {
  x: number
  y: number
  vx: number
  vy: number
  shooterSide: 0 | 1
  sabotageChecked: boolean
  isUltra: boolean
  trail: { x: number; y: number }[]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

interface FloatingBanner {
  x: number
  y: number
  text: string
  color: string
  life: number
}

interface ExplosionRing {
  x: number
  y: number
  radius: number
  maxRadius: number
  life: number
  maxLife: number
  label: string
}

interface WaterSplashPlume {
  x: number
  y: number
  life: number
  maxLife: number
}

interface MidFlightSabotage {
  charName: string
  charId: BrainrotId
  targetSide: 0 | 1
  pushTargetOffset: number
  timer: number
}

interface BattleScreenProps {
  setupPlayers: PlayerSetupConfig[]
  onOpenRules: () => void
  onEndGame: (
    winningTeam: 0 | 1,
    finalPlayers: PlayerBattleState[],
    reason: string
  ) => void
  onRestartToHome: () => void
}

const CANVAS_W = 1280
const CANVAS_H = 660
const WATER_Y = 530
const GRAVITY = 0.26
const RAFT_HALF_WIDTH = 152

function createInitialCrew(primaryColor: string, secondaryColor: string): CrewUnit[] {
  const offsets = [-122, -82, -44, 44, 82, 122]
  const hats = [primaryColor, '#fbbf24', '#38bdf8', '#a78bfa', '#34d399', '#fb7185']
  return offsets.map((relX, i) => ({
    id: i,
    name: CREW_NAMES[i] || `Madrus ${i + 1}`,
    relX,
    relY: 0,
    vx: 0,
    vy: 0,
    airborne: false,
    inWater: false,
    hatColor: hats[i % hats.length],
    shirtColor: i % 2 === 0 ? primaryColor : secondaryColor,
  }))
}

export function isBoatEliminated(p: PlayerBattleState): boolean {
  if (p.captainLives <= 0) return true
  const aliveCrew = p.crew.filter((c) => !c.inWater).length
  return aliveCrew === 0
}

function getRandomYoMamaJoke(exclude?: string): string {
  const pool = YO_MAMA_JOKES.filter((j) => j !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] || YO_MAMA_JOKES[0]
}

function randomWind(): number {
  return Number(((Math.random() - 0.5) * 0.22).toFixed(3))
}

function rollTurnBetOptions(): [BetOption, BetOption, BetOption] {
  const lowSips = Math.random() < 0.65 ? 1 : 2
  const midSips = lowSips === 1 ? (Math.random() < 0.5 ? 2 : 3) : Math.random() < 0.5 ? 3 : 4
  const ultraPool = [6, 7, 8, 10]
  const ultraSips = ultraPool[Math.floor(Math.random() * ultraPool.length)]

  const jitter1 = Math.floor((Math.random() - 0.5) * 36)
  const jitter2 = Math.floor((Math.random() - 0.5) * 30)

  return [
    {
      id: 'normal',
      sips: lowSips,
      captainDamage: 1,
      label: `${lowSips} ${lowSips === 1 ? 'lonks' : 'lonksu'}`,
      subLabel: 'Kaptenile pihta: -1 elu',
      raftLeftX: 305 + jitter1,
      raftRightX: 975 - jitter1,
    },
    {
      id: 'high',
      sips: midSips,
      captainDamage: 1,
      label: `${midSips} lonksu`,
      subLabel: 'Kaugem + Kaptenile: -1 elu',
      raftLeftX: 225 + jitter2,
      raftRightX: 1055 - jitter2,
    },
    {
      id: 'ultra',
      sips: ultraSips,
      captainDamage: 3,
      label: `🔥 ULTRA ALL IN (${ultraSips} LONKSU) 🔥`,
      subLabel: '💥 KAPTENILE PIHTA: -3 ELU! 💥',
      raftLeftX: 170,
      raftRightX: 1110,
    },
  ]
}

export const BattleScreen: React.FC<BattleScreenProps> = ({
  setupPlayers,
  onOpenRules,
  onEndGame,
  onRestartToHome,
}) => {
  const isMultiBoatMode = setupPlayers.length > 2

  const [players, setPlayers] = useState<PlayerBattleState[]>(() =>
    setupPlayers.map((sp, i) => {
      const col =
        PLAYER_COLORS.find((c) => c.id === sp.colorId) ||
        PLAYER_COLORS[i % PLAYER_COLORS.length]
      return {
        id: sp.id,
        team: sp.team,
        name: sp.name.trim() || `Kapten ${i + 1}`,
        colorId: sp.colorId,
        captainAvatar: sp.captainAvatar,
        captainLives: 5,
        hasShield: false,
        skipNextTurn: false,
        crew: createInitialCrew(col.primary, col.secondary),
        totalSipsTaken: 0,
      }
    })
  )

  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [targetIdx, setTargetIdx] = useState<number>(() => {
    const firstEnemy = setupPlayers.findIndex((p) => p.team !== setupPlayers[0].team)
    return firstEnemy >= 0 ? firstEnemy : 1
  })

  const [phase, setPhase] = useState<
    'select_target' | 'betting' | 'aiming' | 'firing' | 'wheel' | 'brainrot_event' | 'bonus_summary'
  >(() => (isMultiBoatMode ? 'select_target' : 'betting'))

  const [betOptions, setBetOptions] = useState<[BetOption, BetOption, BetOption]>(() =>
    rollTurnBetOptions()
  )
  const [selectedBetIdx, setSelectedBetIdx] = useState<0 | 1 | 2>(0)
  const [isBonusShot, setIsBonusShot] = useState(false)
  const [isAimInverted, setIsAimInverted] = useState(false)
  const [wind, setWind] = useState<number>(() => randomWind())
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [volume, setVolume] = useState(() => sound.getVolume())
  const [currentJoke, setCurrentJoke] = useState<string>(() => getRandomYoMamaJoke())
  const [activeBrainrot, setActiveBrainrot] = useState<{
    char: BrainrotCharacter
    avatarUrl: string
    pendingNextWind: number
  } | null>(null)

  const [lastShotResult, setLastShotResult] = useState<{
    hit: boolean
    shieldBlocked: boolean
    summaryText: string
  }>({ hit: false, shieldBlocked: false, summaryText: '' })

  const currentBetOption = betOptions[selectedBetIdx]
  const selectedBetSips = currentBetOption.sips
  const isUltraAllIn = currentBetOption.id === 'ultra'

  const activePlayer = players[activeIdx] || players[0]
  const opponentPlayer = players[targetIdx] || players[1] || players[0]

  // In the side-view duel, Team 0 is always positioned on the left (side 0) and Team 1 on the right (side 1)
  const leftPlayerIdx = activePlayer.team === 0 ? activeIdx : targetIdx
  const rightPlayerIdx = activePlayer.team === 1 ? activeIdx : targetIdx
  const shooterSide: 0 | 1 = activePlayer.team

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const playersRef = useRef(players)
  playersRef.current = players

  const phaseRef = useRef(phase)
  phaseRef.current = phase

  const activeIdxRef = useRef(activeIdx)
  activeIdxRef.current = activeIdx

  const targetIdxRef = useRef(targetIdx)
  targetIdxRef.current = targetIdx

  const leftPlayerIdxRef = useRef(leftPlayerIdx)
  leftPlayerIdxRef.current = leftPlayerIdx

  const rightPlayerIdxRef = useRef(rightPlayerIdx)
  rightPlayerIdxRef.current = rightPlayerIdx

  const shooterSideRef = useRef<0 | 1>(shooterSide)
  shooterSideRef.current = shooterSide

  const windRef = useRef(wind)
  windRef.current = wind

  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const currentBetRef = useRef<BetOption>(currentBetOption)
  currentBetRef.current = currentBetOption

  const animatedRaftBaseXRef = useRef<[number, number]>([
    currentBetOption.raftLeftX,
    currentBetOption.raftRightX,
  ])

  const mouseAimRef = useRef<{ angle: number; power: number }>({ angle: -0.65, power: 14.0 })
  const effectiveAimRef = useRef<{ angle: number; power: number }>({ angle: -0.65, power: 14.0 })

  const projectileRef = useRef<Projectile | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const explosionsRef = useRef<ExplosionRing[]>([])
  const splashesRef = useRef<WaterSplashPlume[]>([])
  const screenShakeRef = useRef<number>(0)
  const impactFlashRef = useRef<number>(0)
  const bannersRef = useRef<FloatingBanner[]>([])
  const captainShakeRef = useRef<[number, number]>([0, 0])
  const captainImagesMapRef = useRef<Record<number, HTMLImageElement>>({})
  const brainrotSpritesRef = useRef<Record<string, HTMLImageElement>>({})

  const raftBlowOffsetRef = useRef<[number, number]>([0, 0])
  const raftWaveSwayRef = useRef<[number, number]>([0, 0])
  const midFlightSabotageRef = useRef<MidFlightSabotage | null>(null)
  const lastShooterByTeamRef = useRef<[number, number]>([0, -1])

  useEffect(() => {
    players.forEach((p, idx) => {
      const img = new Image()
      img.src = p.captainAvatar
      img.onload = () => {
        captainImagesMapRef.current[idx] = img
      }
    })
  }, [players])

  useEffect(() => {
    BRAINROT_CHARACTERS.forEach((b) => {
      const img = new Image()
      img.src = createBrainrotAvatar(b.id)
      img.onload = () => {
        brainrotSpritesRef.current[b.id] = img
      }
    })
  }, [])

  const getCurrentRaftX = (side: 0 | 1) => {
    return (
      animatedRaftBaseXRef.current[side] +
      raftWaveSwayRef.current[side] +
      raftBlowOffsetRef.current[side]
    )
  }

  const spawnSplash = (x: number, y: number, color = '#e0f2fe', count = 18, isBigMiss = false) => {
    const splashColors = ['#ffffff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', color]
    if (isBigMiss) {
      splashesRef.current.push({
        x,
        y,
        life: 0,
        maxLife: 40,
      })
    }
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8
      const speed = (isBigMiss ? 3.5 : 2) + Math.random() * (isBigMiss ? 8.5 : 5.5)
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * (isBigMiss ? 24 : 8),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBigMiss ? 2.2 : 0),
        color: splashColors[Math.floor(Math.random() * splashColors.length)],
        size: (isBigMiss ? 6 : 5) + Math.floor(Math.random() * (isBigMiss ? 6 : 4)),
        life: 0,
        maxLife: (isBigMiss ? 32 : 24) + Math.floor(Math.random() * 18),
      })
    }
  }

  const spawnExplosion = (x: number, y: number, count = 36, isBigHit = false) => {
    const colors = ['#fbbf24', '#f97316', '#ef4444', '#ffffff', '#92400e', '#475569']
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2.0 + Math.random() * (isBigHit ? 10.5 : 7.5)
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isBigHit ? 1.8 : 0.8),
        color: colors[i % colors.length],
        size: (isBigHit ? 8 : 6) + Math.floor(Math.random() * 6),
        life: 0,
        maxLife: 26 + Math.floor(Math.random() * 18),
      })
    }

    if (isBigHit) {
      screenShakeRef.current = 22
      impactFlashRef.current = 6
      explosionsRef.current.push({
        x,
        y,
        radius: 14,
        maxRadius: 115,
        life: 0,
        maxLife: 28,
        label: '💥 PAUK! 💥',
      })
    }
  }

  const addBanner = (x: number, y: number, text: string, color = '#fde047') => {
    bannersRef.current.push({ x, y, text, color, life: 85 })
  }

  const getCannonOrigin = (side: 0 | 1) => {
    const cx = getCurrentRaftX(side)
    const dir = side === 0 ? 1 : -1
    return {
      x: cx + dir * 28,
      y: WATER_Y - 46,
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'aiming' || paused) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const origin = getCannonOrigin(shooterSide)
    const dx = mx - origin.x
    const dy = my - origin.y

    let angle = Math.atan2(dy, dx)
    if (shooterSide === 0) {
      angle = Math.max(-1.42, Math.min(-0.12, angle))
      if (isAimInverted) {
        // Invert angle between -1.42 and -0.12
        angle = -1.42 + (-0.12 - angle)
      }
    } else {
      if (angle > 0) angle = -Math.PI + 0.12
      angle = Math.max(-Math.PI + 0.12, Math.min(-1.72, angle))
      if (isAimInverted) {
        // Invert angle between (-Math.PI + 0.12) and -1.72
        const minA = -Math.PI + 0.12
        const maxA = -1.72
        angle = minA + (maxA - angle)
      }
    }

    const dist = Math.hypot(dx, dy)
    let power = Math.max(8.0, Math.min(20.5, dist / 23))
    if (isAimInverted) {
      // Invert power between 8.0 and 20.5
      power = 8.0 + (20.5 - power)
    }
    mouseAimRef.current = { angle, power }
  }

  const handleFireShot = () => {
    if (phase !== 'aiming' || paused) return
    const origin = getCannonOrigin(shooterSide)
    const { angle, power } = effectiveAimRef.current

    sound.playCannonFire()
    spawnExplosion(origin.x + Math.cos(angle) * 28, origin.y + Math.sin(angle) * 28)

    projectileRef.current = {
      x: origin.x + Math.cos(angle) * 28,
      y: origin.y + Math.sin(angle) * 28,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      shooterSide,
      sabotageChecked: false,
      isUltra: currentBetRef.current.id === 'ultra',
      trail: [],
    }
    setPhase('firing')
  }

  const checkWinConditions = (currentPlayers: PlayerBattleState[]): boolean => {
    const team0Alive = currentPlayers.some((p) => p.team === 0 && !isBoatEliminated(p))
    const team1Alive = currentPlayers.some((p) => p.team === 1 && !isBoatEliminated(p))

    if (!team0Alive) {
      sound.playWinFanfare()
      onEndGame(
        1,
        currentPlayers,
        isMultiBoatMode
          ? 'Kõik 1. tiimi paadid on põhja lastud!'
          : `${currentPlayers[0].name} kaotas oma paadi!`
      )
      return true
    }
    if (!team1Alive) {
      sound.playWinFanfare()
      onEndGame(
        0,
        currentPlayers,
        isMultiBoatMode
          ? 'Kõik 2. tiimi paadid on põhja lastud!'
          : `${currentPlayers[1].name} kaotas oma paadi!`
      )
      return true
    }
    return false
  }

  // Main animation & physics loop
  useEffect(() => {
    let animId = 0
    let tick = 0

    const resolveShotEnd = (hit: boolean, shieldBlocked: boolean, summaryText: string) => {
      // Ensure any still-airborne hit crew members are finalized as inWater so the HUD count always matches!
      let finalizedAny = false
      const finalizedPlayers = playersRef.current.map((p) => ({
        ...p,
        crew: p.crew.map((c) => {
          if (c.airborne && !c.inWater) {
            finalizedAny = true
            return { ...c, airborne: false, inWater: true }
          }
          return c
        }),
      }))
      if (finalizedAny) {
        playersRef.current = finalizedPlayers
        setPlayers(finalizedPlayers)
      }

      if (checkWinConditions(playersRef.current)) return

      setLastShotResult({ hit, shieldBlocked, summaryText })
      if (isBonusShot) {
        setPhase('bonus_summary')
      } else if (Math.random() < 0.33) {
        setPhase('wheel')
      } else {
        setPhase('bonus_summary')
      }
    }

    const stepPhysics = () => {
      tick++
      if (pausedRef.current || phaseRef.current === 'select_target') return

      const betOpt = currentBetRef.current

      animatedRaftBaseXRef.current = [
        animatedRaftBaseXRef.current[0] +
          (betOpt.raftLeftX - animatedRaftBaseXRef.current[0]) * 0.12,
        animatedRaftBaseXRef.current[1] +
          (betOpt.raftRightX - animatedRaftBaseXRef.current[1]) * 0.12,
      ]

      const difficultyMult = betOpt.id === 'ultra' ? 1.85 : betOpt.sips >= 2 ? 1.45 : 1.0
      raftWaveSwayRef.current = [
        Math.sin(tick * 0.036 * difficultyMult) * (30 * difficultyMult),
        Math.cos(tick * 0.04 * difficultyMult + 1.2) * (30 * difficultyMult),
      ]

      if (betOpt.sips >= 2) {
        const angleWobbleAmp = betOpt.id === 'ultra' ? 0.14 : 0.075
        const powerWobbleAmp = betOpt.id === 'ultra' ? 1.8 : 0.95
        const wobbleAngle = Math.sin(tick * 0.095) * angleWobbleAmp
        const wobblePower = Math.cos(tick * 0.08) * powerWobbleAmp
        effectiveAimRef.current = {
          angle: mouseAimRef.current.angle + wobbleAngle,
          power: Math.max(7.5, Math.min(21, mouseAimRef.current.power + wobblePower)),
        }
      } else {
        effectiveAimRef.current = { ...mouseAimRef.current }
      }

      if (midFlightSabotageRef.current) {
        const sab = midFlightSabotageRef.current
        sab.timer--
        const currentOff = raftBlowOffsetRef.current[sab.targetSide]
        raftBlowOffsetRef.current[sab.targetSide] =
          currentOff + (sab.pushTargetOffset - currentOff) * 0.16

        if (tick % 2 === 0 && sab.timer > 15) {
          const raftX = getCurrentRaftX(sab.targetSide)
          particlesRef.current.push({
            x: raftX + (sab.pushTargetOffset > 0 ? -130 : 130),
            y: WATER_Y - 60 - Math.random() * 50,
            vx: sab.pushTargetOffset > 0 ? 7.5 : -7.5,
            vy: (Math.random() - 0.5) * 1.5,
            color: '#bae6fd',
            size: 6,
            life: 0,
            maxLife: 18,
          })
        }

        if (sab.timer <= 0) {
          midFlightSabotageRef.current = null
        }
      } else {
        if (!projectileRef.current) {
          raftBlowOffsetRef.current = [
            raftBlowOffsetRef.current[0] * 0.92,
            raftBlowOffsetRef.current[1] * 0.92,
          ]
        }
      }

      captainShakeRef.current = [
        Math.max(0, captainShakeRef.current[0] - 1),
        Math.max(0, captainShakeRef.current[1] - 1),
      ]
      screenShakeRef.current = Math.max(0, screenShakeRef.current - 1)
      impactFlashRef.current = Math.max(0, impactFlashRef.current - 1)

      explosionsRef.current = explosionsRef.current.filter((ex) => {
        ex.life++
        ex.radius = 14 + (ex.maxRadius - 14) * (ex.life / ex.maxLife)
        return ex.life < ex.maxLife
      })

      splashesRef.current = splashesRef.current.filter((sp) => {
        sp.life++
        return sp.life < sp.maxLife
      })

      const proj = projectileRef.current
      if (proj) {
        proj.trail.push({ x: proj.x, y: proj.y })
        if (proj.trail.length > 22) proj.trail.shift()

        const targetSide: 0 | 1 = proj.shooterSide === 0 ? 1 : 0
        const targetPlayerIdx = targetIdxRef.current
        const targetCenter = getCurrentRaftX(targetSide)
        const targetPlayer = playersRef.current[targetPlayerIdx]
        const bobY = Math.round(Math.sin(tick * 0.05 + targetSide * 1.8) * 5)
        const baseDeckY = WATER_Y - 26 + bobY

        // Step projectile in 4 sub-steps per frame for pixel-accurate hitboxes (no tunneling!)
        const SUB_STEPS = 4
        for (let s = 0; s < SUB_STEPS; s++) {
          proj.x += proj.vx / SUB_STEPS
          proj.y += proj.vy / SUB_STEPS
          proj.vx += (windRef.current * 0.085) / SUB_STEPS
          proj.vy += GRAVITY / SUB_STEPS

          // Mid-flight Brainrot boat-blow sabotage
          if (
            !proj.sabotageChecked &&
            ((proj.shooterSide === 0 && proj.x > CANVAS_W * 0.46) ||
              (proj.shooterSide === 1 && proj.x < CANVAS_W * 0.54))
          ) {
            proj.sabotageChecked = true
            const distToTargetX = Math.abs(targetCenter - proj.x)
            const blowChance = betOpt.sips >= 2 ? 0.28 : 0.2
            if (distToTargetX < 620 && Math.random() < blowChance) {
              const randChar =
                BRAINROT_CHARACTERS[Math.floor(Math.random() * BRAINROT_CHARACTERS.length)]
              sound.playBrainrotSound()
              const pushDir =
                targetCenter > CANVAS_W - 220
                  ? -1
                  : targetCenter < 220
                  ? 1
                  : Math.random() > 0.5
                  ? 1
                  : -1
              const pushAmount = pushDir * (135 + Math.random() * 40)
              midFlightSabotageRef.current = {
                charName: randChar.name,
                charId: randChar.id,
                targetSide,
                pushTargetOffset: pushAmount,
                timer: 85,
              }
              addBanner(
                targetCenter,
                WATER_Y - 195,
                `${randChar.name.toUpperCase()} PUHUS PAADI EEMALE!`,
                '#38bdf8'
              )
            }
          }

          // 1. Check Shield Hitbox (matches drawn dome arc radius 160 around baseDeckY - 40)
          if (
            targetPlayer.hasShield &&
            proj.y <= baseDeckY + 10 &&
            Math.hypot(proj.x - targetCenter, proj.y - (baseDeckY - 40)) <= 166
          ) {
            sound.playShieldBlock()
            spawnSplash(proj.x, proj.y, '#60a5fa', 24)
            addBanner(targetCenter, WATER_Y - 150, 'KILP BLOKEERIS!', '#60a5fa')
            projectileRef.current = null

            const updated = playersRef.current.map((p, i) =>
              i === targetPlayerIdx ? { ...p, hasShield: false } : p
            )
            playersRef.current = updated
            setPlayers(updated)

            setTimeout(() => {
              resolveShotEnd(false, true, 'Vastase kilp blokeeris lasu!')
            }, 650)
            return
          }

          // 2. Check Captain Hitbox (matches full drawn Captain crown + 56x56 portrait + coat: X ±36, Y from baseDeckY - 138 to baseDeckY - 40)
          const capX = targetCenter
          const capTopY = baseDeckY - 138
          const capBottomY = baseDeckY - 40
          if (
            Math.abs(proj.x - capX) <= 36 &&
            proj.y >= capTopY &&
            proj.y <= capBottomY
          ) {
            sound.playHit()
            spawnExplosion(proj.x, proj.y, proj.isUltra ? 58 : 42, true)
            captainShakeRef.current[targetSide] = 32

            const reaction =
              CAPTAIN_HIT_REACTIONS[Math.floor(Math.random() * CAPTAIN_HIT_REACTIONS.length)]
            const dmg = proj.isUltra ? 3 : 1
            addBanner(
              capX,
              capTopY - 16,
              `KAPTEN PIHTAS (-${dmg} ELU)! "${reaction}"`,
              '#f87171'
            )

            const updated = playersRef.current.map((p, i) =>
              i === targetPlayerIdx
                ? { ...p, captainLives: Math.max(0, p.captainLives - dmg) }
                : p
            )
            playersRef.current = updated
            setPlayers(updated)
            projectileRef.current = null

            setTimeout(() => {
              resolveShotEnd(
                true,
                false,
                `Tabasid vastase kaptenit (-${dmg} elu)! (${reaction})`
              )
            }, 950)
            return
          }

          // 3. Check Direct Crew Hitbox OR Raft Deck Hitbox
          const directCrewHit = targetPlayer.crew.some(
            (c) =>
              !c.inWater &&
              !c.airborne &&
              Math.abs(proj.x - (targetCenter + c.relX)) <= 20 &&
              proj.y >= baseDeckY - 48 &&
              proj.y <= baseDeckY + 8
          )

          const hitRaftDeck =
            Math.abs(proj.x - targetCenter) <= RAFT_HALF_WIDTH + 10 &&
            proj.y >= baseDeckY - 8 &&
            proj.y <= WATER_Y + 8

          if (directCrewHit || hitRaftDeck) {
            const updated = playersRef.current.map((p) => ({
              ...p,
              crew: p.crew.map((c) => ({ ...c })),
            }))

            let hitCount = 0
            const impactRelX = proj.x - targetCenter
            const blastRadius = proj.isUltra ? 68 : 46

            updated[targetPlayerIdx].crew.forEach((c) => {
              if (c.inWater) return
              const dist = Math.abs(c.relX - impactRelX)
              if (dist <= blastRadius) {
                hitCount++
                c.airborne = true
                const pushDir = c.relX >= 0 ? 1 : -1
                const strength = dist < 24 ? 7.4 : 5.5
                c.vx = pushDir * (strength + Math.random() * 1.8) + proj.vx * 0.22
                c.vy = -6.2 - Math.random() * 2.5
              }
            })

            if (hitCount > 0) {
              sound.playHit()
              spawnExplosion(proj.x, proj.y, proj.isUltra ? 52 : 38, true)
              addBanner(
                proj.x,
                proj.y - 38,
                hitCount > 1 ? `SUPERPAUK! (${hitCount} madrust lendas!)` : 'PIHTAS!',
                '#fde047'
              )
              playersRef.current = updated
              setPlayers(updated)
              projectileRef.current = null

              setTimeout(() => {
                resolveShotEnd(
                  true,
                  false,
                  hitCount > 1
                    ? `Võimas tabamus! Lükkasid ${hitCount} meeskonnaliiget korraga!`
                    : 'Tabasid vastase meeskonnaliiget!'
                )
              }, 1150)
              return
            } else if (hitRaftDeck) {
              sound.playHit()
              spawnExplosion(proj.x, proj.y)
              addBanner(proj.x, proj.y - 30, 'PARVE LAUDADESSE (MADRUSED PÄÄSESID)!', '#cbd5e1')
              projectileRef.current = null
              setTimeout(() => {
                resolveShotEnd(
                  false,
                  false,
                  'Kuul tabas ainult parve tühja tekki – ükski tegelane ei saanud pihta!'
                )
              }, 850)
              return
            }
          }

          // 4. Missed into water or off-screen
          if (proj.y >= WATER_Y || proj.x < -80 || proj.x > CANVAS_W + 80) {
            const splashX = Math.max(40, Math.min(CANVAS_W - 40, proj.x))
            sound.playSplash()
            spawnSplash(splashX, WATER_Y, '#bae6fd', 48, true)
            addBanner(splashX, WATER_Y - 58, '💦 PLÄRTS! MÖÖDA! 💦', '#7dd3fc')
            projectileRef.current = null
            setTimeout(() => {
              resolveShotEnd(
                false,
                false,
                midFlightSabotageRef.current
                  ? `${midFlightSabotageRef.current.charName} puhus paadi eest ära ja lask läks vette!`
                  : 'Kahurikuul maandus suure plärtsuga otse merre!'
              )
            }, 900)
            return
          }
        }
      }

      // Update airborne crew members on both visible duel boats
      let crewChanged = false
      const nextPlayers = playersRef.current.map((p) => ({
        ...p,
        crew: p.crew.map((c) => ({ ...c })),
      }))

      const duelIndices: [number, number] = [leftPlayerIdxRef.current, rightPlayerIdxRef.current]
      ;([0, 1] as const).forEach((side) => {
        const pIndex = duelIndices[side]
        const raftX = getCurrentRaftX(side)
        nextPlayers[pIndex]?.crew.forEach((c) => {
          if (!c.airborne || c.inWater) return
          crewChanged = true
          c.relX += c.vx
          c.relY += c.vy
          c.vy += GRAVITY * 1.15

          if (c.relY >= 0) {
            // Every hit crew member splashes into the water when landing!
            c.inWater = true
            c.airborne = false
            sound.playSplash()
            const worldX = raftX + c.relX
            spawnSplash(worldX, WATER_Y, '#e0f2fe', 20)
            addBanner(worldX, WATER_Y - 32, `${c.name} VETTE!`, '#38bdf8')
          }
        })
      })

      if (crewChanged) {
        playersRef.current = nextPlayers
        setPlayers(nextPlayers)
      }

      particlesRef.current = particlesRef.current.filter((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.vy += 0.18
        pt.life++
        return pt.life < pt.maxLife
      })

      bannersRef.current = bannersRef.current.filter((b) => {
        b.y -= 0.45
        b.life--
        return b.life > 0
      })
    }

    const drawScene = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.imageSmoothingEnabled = false
      ctx.save()

      if (screenShakeRef.current > 0) {
        const mag = screenShakeRef.current * 0.75
        ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2)
      }

      const skyBands = ['#0c4a6e', '#075985', '#0369a1', '#0284c7', '#38bdf8']
      const bandH = Math.ceil(WATER_Y / skyBands.length)
      skyBands.forEach((col, i) => {
        ctx.fillStyle = col
        ctx.fillRect(0, i * bandH, CANVAS_W, bandH + 2)
      })

      // Pixel Sun
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(604, 52, 72, 72)
      ctx.fillStyle = '#fde047'
      ctx.fillRect(594, 62, 92, 52)

      // Pixel Clouds
      const cloudShift = (tick * (windRef.current * 10 + 0.25)) % CANVAS_W
      ;[140, 480, 860, 1120].forEach((baseX, idx) => {
        const cx = ((baseX + cloudShift + CANVAS_W) % (CANVAS_W + 180)) - 90
        const cy = 74 + (idx % 2) * 42
        ctx.fillStyle = '#e0f2fe'
        ctx.fillRect(cx, cy, 96, 24)
        ctx.fillRect(cx + 18, cy - 14, 60, 16)
      })

      // Draw Mid-Flight Brainrot Saboteur if active
      if (midFlightSabotageRef.current) {
        const sab = midFlightSabotageRef.current
        const spr = brainrotSpritesRef.current[sab.charId]
        const raftX = getCurrentRaftX(sab.targetSide)
        const sabX = sab.targetSide === 1 ? raftX - 210 : raftX + 130
        const sabY = WATER_Y - 135 + Math.sin(tick * 0.25) * 8

        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(sabX - 4, sabY - 4, 88, 88)
        if (spr) {
          ctx.drawImage(spr, sabX, sabY, 80, 80)
        }
        ctx.fillStyle = '#e0f2fe'
        const puffDir = sab.targetSide === 1 ? 1 : -1
        for (let p = 0; p < 3; p++) {
          ctx.fillRect(sabX + (puffDir > 0 ? 86 : -42), sabY + 20 + p * 18, 36, 5)
        }
      }

      // Draw the two dueling boats (Left = Team 0 boat, Right = Team 1 boat)
      const duelIndices: [number, number] = [leftPlayerIdxRef.current, rightPlayerIdxRef.current]
      ;([0, 1] as const).forEach((side) => {
        const pIndex = duelIndices[side]
        const p = playersRef.current[pIndex]
        if (!p) return
        const colorObj =
          PLAYER_COLORS.find((c) => c.id === p.colorId) ||
          PLAYER_COLORS[pIndex % PLAYER_COLORS.length]
        const cx = Math.round(getCurrentRaftX(side))
        const bobY = Math.round(Math.sin(tick * 0.05 + side * 1.8) * 5)
        const baseDeckY = WATER_Y - 26 + bobY

        if (shooterSideRef.current === side && phaseRef.current !== 'firing') {
          const arrowBob = Math.round(Math.sin(tick * 0.12) * 6)
          ctx.fillStyle = '#fbbf24'
          ctx.fillRect(cx - 10, baseDeckY - 180 + arrowBob, 20, 16)
          ctx.beginPath()
          ctx.moveTo(cx - 20, baseDeckY - 164 + arrowBob)
          ctx.lineTo(cx + 20, baseDeckY - 164 + arrowBob)
          ctx.lineTo(cx, baseDeckY - 144 + arrowBob)
          ctx.fill()
        }

        if (p.hasShield) {
          ctx.save()
          ctx.strokeStyle = '#60a5fa'
          ctx.lineWidth = 5
          ctx.setLineDash([10, 6])
          ctx.beginPath()
          ctx.arc(cx, baseDeckY - 40, 160, Math.PI, 0)
          ctx.stroke()
          ctx.fillStyle = 'rgba(59, 130, 246, 0.16)'
          ctx.fill()
          ctx.restore()
        }

        ctx.fillStyle = '#78350f'
        ctx.fillRect(cx - RAFT_HALF_WIDTH, baseDeckY, RAFT_HALF_WIDTH * 2, 26)
        ctx.fillStyle = '#92400e'
        for (let lx = -RAFT_HALF_WIDTH + 8; lx < RAFT_HALF_WIDTH - 12; lx += 32) {
          ctx.fillRect(cx + lx, baseDeckY + 4, 24, 18)
        }
        ctx.fillStyle = colorObj.primary
        ctx.fillRect(cx - RAFT_HALF_WIDTH, baseDeckY - 5, RAFT_HALF_WIDTH * 2, 6)

        ctx.fillStyle = '#451a03'
        ctx.fillRect(cx - 38, baseDeckY - 44, 76, 44)
        ctx.fillStyle = colorObj.secondary
        ctx.fillRect(cx - 42, baseDeckY - 48, 84, 7)

        const poleX = side === 0 ? cx - 34 : cx + 30
        ctx.fillStyle = '#d6d3d1'
        ctx.fillRect(poleX, baseDeckY - 134, 4, 88)
        ctx.fillStyle = colorObj.primary
        const flagDir = windRef.current >= 0 ? 1 : -1
        ctx.fillRect(poleX + (flagDir > 0 ? 4 : -34), baseDeckY - 132, 34, 20)

        const shakeX =
          captainShakeRef.current[side] > 0 ? (tick % 2 === 0 ? 1 : -1) * 5 : 0
        const capX = cx + shakeX
        const capY = baseDeckY - 76

        ctx.fillStyle = colorObj.primary
        ctx.fillRect(capX - 18, capY + 10, 36, 24)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(capX - 5, capY + 12, 10, 20)

        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(capX - 28, capY - 42, 56, 56)
        const capImg = captainImagesMapRef.current[pIndex]
        if (capImg) {
          ctx.drawImage(capImg, capX - 25, capY - 39, 50, 50)
        }
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(capX - 18, capY - 51, 36, 9)
        ctx.fillRect(capX - 18, capY - 57, 8, 6)
        ctx.fillRect(capX - 4, capY - 60, 8, 9)
        ctx.fillRect(capX + 10, capY - 57, 8, 6)

        p.crew.forEach((c) => {
          if (c.inWater) return
          const ux = Math.round(cx + c.relX)
          const uy = Math.round(baseDeckY + c.relY)

          ctx.fillStyle = '#1e293b'
          ctx.fillRect(ux - 8, uy - 10, 6, 10)
          ctx.fillRect(ux + 2, uy - 10, 6, 10)

          ctx.fillStyle = c.shirtColor
          ctx.fillRect(ux - 10, uy - 26, 20, 16)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(ux - 10, uy - 22, 20, 4)
          ctx.fillRect(ux - 10, uy - 14, 20, 3)

          ctx.fillStyle = '#fdba74'
          ctx.fillRect(ux - 9, uy - 40, 18, 14)

          ctx.fillStyle = '#0f172a'
          const lookOffset = side === 0 ? 2 : -2
          ctx.fillRect(ux - 4 + lookOffset, uy - 35, 3, 4)
          ctx.fillRect(ux + 2 + lookOffset, uy - 35, 3, 4)

          ctx.fillStyle = c.hatColor
          ctx.fillRect(ux - 10, uy - 45, 20, 6)
        })

        const cannonOrig = getCannonOrigin(side)
        const cannonY = cannonOrig.y + bobY
        ctx.save()
        ctx.translate(cannonOrig.x, cannonY)
        const barrelAngle =
          shooterSideRef.current === side
            ? effectiveAimRef.current.angle
            : side === 0
            ? -0.55
            : -Math.PI + 0.55
        ctx.rotate(barrelAngle)
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(0, -9, 36, 18)
        ctx.fillStyle = '#475569'
        ctx.fillRect(28, -10, 8, 20)
        ctx.restore()

        ctx.fillStyle = '#78350f'
        ctx.fillRect(cannonOrig.x - 10, cannonY - 2, 20, 14)
        ctx.fillStyle = '#fbbf24'
        ctx.fillRect(cannonOrig.x - 4, cannonY + 2, 8, 8)
      })

      if (phaseRef.current === 'aiming') {
        const origin = getCannonOrigin(shooterSideRef.current)
        const { angle, power } = effectiveAimRef.current
        const betOpt = currentBetRef.current
        const maxSteps = betOpt.id === 'ultra' ? 6 : betOpt.sips >= 2 ? 8 : 13

        let simX = origin.x + Math.cos(angle) * 28
        let simY = origin.y + Math.sin(angle) * 28
        const simVx = Math.cos(angle) * power
        let simVy = Math.sin(angle) * power

        for (let step = 0; step < maxSteps; step++) {
          simX += simVx
          simY += simVy
          simVy += GRAVITY
          if (simY > WATER_Y) break
          if (step % 2 === 0) {
            ctx.fillStyle = betOpt.id === 'ultra' ? '#f43f5e' : '#fde047'
            ctx.fillRect(Math.round(simX) - 4, Math.round(simY) - 4, 8, 8)
          }
        }
      }

      const proj = projectileRef.current
      if (proj) {
        proj.trail.forEach((pt, idx) => {
          ctx.fillStyle = proj.isUltra
            ? idx % 2 === 0
              ? '#f97316'
              : '#fde047'
            : idx % 2 === 0
            ? '#cbd5e1'
            : '#94a3b8'
          const s = Math.max(3, Math.floor((idx / proj.trail.length) * 11))
          ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s)
        })
        ctx.fillStyle = proj.isUltra ? '#dc2626' : '#0f172a'
        ctx.fillRect(proj.x - 11, proj.y - 11, 22, 22)
        ctx.fillStyle = proj.isUltra ? '#fde047' : '#475569'
        ctx.fillRect(proj.x - 6, proj.y - 6, 7, 7)
      }

      // Ocean waves
      ctx.fillStyle = '#0369a1'
      ctx.fillRect(0, WATER_Y, CANVAS_W, CANVAS_H - WATER_Y)
      ctx.fillStyle = '#075985'
      ctx.fillRect(0, WATER_Y + 36, CANVAS_W, CANVAS_H - WATER_Y - 36)
      ctx.fillStyle = '#0c4a6e'
      ctx.fillRect(0, WATER_Y + 76, CANVAS_W, CANVAS_H - WATER_Y - 76)

      for (let wx = 0; wx < CANVAS_W; wx += 32) {
        const waveY = WATER_Y + Math.round(Math.sin(tick * 0.06 + wx * 0.05) * 4)
        ctx.fillStyle = '#7dd3fc'
        ctx.fillRect(wx, waveY - 3, 22, 5)
      }

      particlesRef.current.forEach((pt) => {
        ctx.fillStyle = pt.color
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size)
      })

      // Draw water geyser plumes & expanding water rings on missed shots
      splashesRef.current.forEach((sp) => {
        const progress = sp.life / sp.maxLife
        const arc = Math.sin(progress * Math.PI)
        const colHeight = Math.round(arc * 95)
        const colWidth = Math.round(38 * (1 - progress * 0.45))

        ctx.save()

        // Expanding water surface ripple rings
        const rippleW = 24 + progress * 96
        const rippleH = 7 + progress * 16
        ctx.strokeStyle = progress < 0.5 ? '#ffffff' : '#7dd3fc'
        ctx.lineWidth = Math.max(2, Math.round(5 * (1 - progress)))
        ctx.beginPath()
        ctx.ellipse(sp.x, sp.y + 4, rippleW, rippleH, 0, 0, Math.PI * 2)
        ctx.stroke()

        if (progress > 0.15) {
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(sp.x, sp.y + 4, rippleW * 0.65, rippleH * 0.65, 0, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Pixelated rising water column geyser
        if (colHeight > 6) {
          ctx.fillStyle = '#38bdf8'
          ctx.fillRect(
            Math.round(sp.x - colWidth / 2),
            Math.round(sp.y - colHeight * 0.75),
            colWidth,
            Math.round(colHeight * 0.75)
          )
          ctx.fillStyle = '#bae6fd'
          ctx.fillRect(
            Math.round(sp.x - colWidth * 0.35),
            Math.round(sp.y - colHeight * 0.92),
            Math.round(colWidth * 0.7),
            Math.round(colHeight * 0.92)
          )
          // White foam crown at the top of the splash
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(
            Math.round(sp.x - colWidth * 0.55),
            Math.round(sp.y - colHeight - 8),
            Math.round(colWidth * 1.1),
            14
          )
          // Side foam wings
          ctx.fillRect(
            Math.round(sp.x - colWidth * 0.85),
            Math.round(sp.y - colHeight * 0.55),
            12,
            12
          )
          ctx.fillRect(
            Math.round(sp.x + colWidth * 0.85 - 12),
            Math.round(sp.y - colHeight * 0.55),
            12,
            12
          )
        }

        ctx.restore()
      })

      // Draw expanding explosion shockwaves, fireballs & "PAUK!" starbursts
      explosionsRef.current.forEach((ex) => {
        const progress = ex.life / ex.maxLife
        ctx.save()
        // Outer orange/red blast ring
        ctx.strokeStyle = progress < 0.5 ? '#ef4444' : '#f97316'
        ctx.lineWidth = Math.max(2, Math.round(12 * (1 - progress)))
        ctx.beginPath()
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2)
        ctx.stroke()

        // Inner bright yellow fireball core
        if (progress < 0.65) {
          ctx.fillStyle = progress < 0.25 ? '#ffffff' : '#fde047'
          ctx.beginPath()
          ctx.arc(ex.x, ex.y, ex.radius * (0.65 - progress * 0.7), 0, Math.PI * 2)
          ctx.fill()
        }

        // Comic "💥 PAUK! 💥" text at center of blast
        ctx.font = 'bold 28px "Press Start 2P", Fredoka, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#0f172a'
        ctx.fillText(ex.label, ex.x + 3, ex.y - ex.radius * 0.35 + 3)
        ctx.fillStyle = '#fde047'
        ctx.fillText(ex.label, ex.x, ex.y - ex.radius * 0.35)
        ctx.restore()
      })

      bannersRef.current.forEach((b) => {
        ctx.save()
        ctx.font = 'bold 20px Fredoka, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#0f172a'
        ctx.fillText(b.text, b.x + 2, b.y + 2)
        ctx.fillStyle = b.color
        ctx.fillText(b.text, b.x, b.y)
        ctx.restore()
      })

      if (impactFlashRef.current > 0) {
        ctx.fillStyle = `rgba(254, 240, 138, ${impactFlashRef.current * 0.06})`
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      }

      ctx.restore()
    }

    const loop = () => {
      stepPhysics()
      drawScene()
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [isBonusShot, onEndGame])

  useEffect(() => {
    mouseAimRef.current = {
      angle: shooterSide === 0 ? -0.62 : -Math.PI + 0.62,
      power: 14.0,
    }
    setCurrentJoke((prev) => getRandomYoMamaJoke(prev))
  }, [activeIdx, shooterSide])

  const advanceToNextPlayer = (
    updatedPlayers: PlayerBattleState[],
    nextWind: number,
    invertNextAim: boolean = false
  ) => {
    if (checkWinConditions(updatedPlayers)) return

    const currentTeam = updatedPlayers[activeIdx]?.team ?? 0
    lastShooterByTeamRef.current[currentTeam] = activeIdx

    const pickNextAliveFromTeam = (team: 0 | 1): number => {
      const startFrom = lastShooterByTeamRef.current[team]
      const n = updatedPlayers.length
      for (let offset = 1; offset <= n; offset++) {
        const candidate = ((startFrom >= 0 ? startFrom : -1) + offset + n) % n
        if (
          updatedPlayers[candidate].team === team &&
          !isBoatEliminated(updatedPlayers[candidate])
        ) {
          return candidate
        }
      }
      return -1
    }

    let nextTeam: 0 | 1 = currentTeam === 0 ? 1 : 0
    let nextIdx = pickNextAliveFromTeam(nextTeam)
    if (nextIdx === -1) {
      nextTeam = currentTeam
      nextIdx = pickNextAliveFromTeam(nextTeam)
    }
    if (nextIdx === -1) nextIdx = 0

    // Handle „Halb õnn“ skipNextTurn while preserving fair team rotation
    if (updatedPlayers[nextIdx].skipNextTurn) {
      const skippedName = updatedPlayers[nextIdx].name
      updatedPlayers[nextIdx] = { ...updatedPlayers[nextIdx], skipNextTurn: false }
      lastShooterByTeamRef.current[nextTeam] = nextIdx
      addBanner(CANVAS_W / 2, 180, `${skippedName} jätab „Halb õnn“ tõttu vahele!`, '#c084fc')

      const altTeam: 0 | 1 = nextTeam === 0 ? 1 : 0
      const altIdx = pickNextAliveFromTeam(altTeam)
      if (altIdx !== -1) {
        nextTeam = altTeam
        nextIdx = altIdx
      } else {
        const fallbackIdx = pickNextAliveFromTeam(nextTeam)
        if (fallbackIdx !== -1) nextIdx = fallbackIdx
      }
    }

    lastShooterByTeamRef.current[nextTeam] = nextIdx

    // Default target to first alive enemy boat
    const firstAliveEnemy = updatedPlayers.findIndex(
      (p) => p.team !== nextTeam && !isBoatEliminated(p)
    )

    playersRef.current = updatedPlayers
    setPlayers(updatedPlayers)
    setWind(nextWind)
    setActiveIdx(nextIdx)
    if (firstAliveEnemy >= 0) {
      setTargetIdx(firstAliveEnemy)
    }
    setIsBonusShot(false)
    setIsAimInverted(invertNextAim)
    setBetOptions(rollTurnBetOptions())
    setSelectedBetIdx(0)
    setCurrentJoke((prev) => getRandomYoMamaJoke(prev))
    setPhase(isMultiBoatMode ? 'select_target' : 'betting')
  }

  const triggerRandomBrainrotOrAdvance = (
    updatedPlayers: PlayerBattleState[],
    nextWind: number,
    invertNextAim: boolean = false
  ) => {
    if (Math.random() < 0.18) {
      const char = BRAINROT_CHARACTERS[Math.floor(Math.random() * BRAINROT_CHARACTERS.length)]
      sound.playBrainrotSound()
      setActiveBrainrot({
        char,
        avatarUrl: createBrainrotAvatar(char.id),
        pendingNextWind: nextWind,
      })
      setIsAimInverted(invertNextAim)
      playersRef.current = updatedPlayers
      setPlayers(updatedPlayers)
      setPhase('brainrot_event')
      return
    }
    advanceToNextPlayer(updatedPlayers, nextWind, invertNextAim)
  }

  const applyBrainrotChaosAndContinue = () => {
    if (!activeBrainrot) return
    const { char, pendingNextWind } = activeBrainrot
    const shooterIdx = activeIdx
    const oppIdx = targetIdx

    const updated = playersRef.current.map((p) => ({
      ...p,
      crew: p.crew.map((c) => ({ ...c })),
    }))

    if (char.target === 'shooter' || char.target === 'both') {
      updated[shooterIdx].totalSipsTaken += char.extraSips
    }
    if (char.target === 'opponent' || char.target === 'both') {
      updated[oppIdx].totalSipsTaken += char.extraSips
    }

    let nextWind = pendingNextWind

    if (char.chaosEffect === 'tsunami_wind') {
      nextWind = (Math.random() > 0.5 ? 1 : -1) * 0.18
      addBanner(CANVAS_W / 2, 160, 'TRALALERO TSUNAMI TUUL!', '#38bdf8')
    } else if (char.chaosEffect === 'bomb_crew') {
      const alive = updated[shooterIdx].crew.filter((c) => !c.inWater)
      if (alive.length > 1) {
        const victim = alive[Math.floor(Math.random() * alive.length)]
        victim.inWater = true
        sound.playSplash()
      }
    } else if (char.chaosEffect === 'steal_shield') {
      updated.forEach((p) => {
        p.hasShield = false
      })
    } else if (char.chaosEffect === 'ninja_slice') {
      const alive = updated[oppIdx].crew.filter((c) => !c.inWater)
      if (alive.length > 1) {
        const victim = alive[Math.floor(Math.random() * alive.length)]
        victim.inWater = true
        sound.playSplash()
      }
    }

    setActiveBrainrot(null)
    advanceToNextPlayer(updated, nextWind, isAimInverted)
  }

  const handleWheelComplete = (outcome: WheelOutcome) => {
    const shooterIdx = activeIdx
    const oppIdx = targetIdx

    let shooterTurnSips = !lastShotResult.hit ? selectedBetSips : 0
    let opponentTurnSips = lastShotResult.hit ? selectedBetSips : 0

    if (outcome.id === 'counter_sip') {
      // Vastulöök: ründaja (laskja) peab ise võtma 1 lisalonksu!
      shooterTurnSips += 1
    }
    if (outcome.id === 'bad_luck') {
      shooterTurnSips += 1
    }

    const updated = playersRef.current.map((p) => ({ ...p }))

    updated[shooterIdx].totalSipsTaken += shooterTurnSips
    updated[oppIdx].totalSipsTaken += opponentTurnSips

    if (outcome.id === 'shield') {
      updated[shooterIdx].hasShield = true
    }
    if (outcome.id === 'bad_luck') {
      updated[shooterIdx].skipNextTurn = true
    }

    let nextWind = randomWind()
    const nextInverted = outcome.id === 'wind_reverse'
    if (nextInverted) {
      nextWind = windRef.current === 0 ? 0.11 : Number((-windRef.current).toFixed(3))
      addBanner(CANVAS_W / 2, 160, 'TUULEPÖÖRE: JÄRGMINE SIHTIMINE ON TAGURPIDI!', '#06b6d4')
    }

    if (outcome.id === 'double_shot') {
      playersRef.current = updated
      setPlayers(updated)
      setIsBonusShot(true)
      setIsAimInverted(false)
      setBetOptions(rollTurnBetOptions())
      setSelectedBetIdx(0)
      setPhase(isMultiBoatMode ? 'select_target' : 'betting')
      return
    }

    triggerRandomBrainrotOrAdvance(updated, nextWind, nextInverted)
  }

  const handleBonusShotFinish = () => {
    const shooterIdx = activeIdx
    const oppIdx = targetIdx

    const shooterAdd = !lastShotResult.hit ? selectedBetSips : 0
    const opponentAdd = lastShotResult.hit ? selectedBetSips : 0

    const updated = playersRef.current.map((p) => ({ ...p }))
    updated[shooterIdx].totalSipsTaken += shooterAdd
    updated[oppIdx].totalSipsTaken += opponentAdd

    const nextWind = randomWind()
    triggerRandomBrainrotOrAdvance(updated, nextWind)
  }

  const leftPlayer = players[leftPlayerIdx] || players[0]
  const rightPlayer = players[rightPlayerIdx] || players[1] || players[0]
  const windSpeedLabel = Math.abs(Math.round(wind * 100))
  const currentDistanceMeters = Math.round(
    (currentBetOption.raftRightX - currentBetOption.raftLeftX) / 8
  )

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between select-none overflow-hidden">
      {/* Top HUD Bar */}
      <header className="w-full bg-slate-900 border-b-4 border-slate-950 px-5 py-3">
        <div className="max-w-[1440px] mx-auto grid grid-cols-3 items-center gap-4">
          <PlayerHudCard
            player={leftPlayer}
            isActive={activePlayer.id === leftPlayer.id}
            align="left"
          />

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 border-2 border-sky-500">
              <Wind className="w-5 h-5 text-sky-300" />
              <span className="text-sm font-bold text-sky-200">
                TUUL:{' '}
                {windSpeedLabel === 0
                  ? 'TUULEVAIKUS'
                  : `${wind > 0 ? '→' : '←'} ${windSpeedLabel} m/s`}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-sm font-bold text-amber-300">
                KAUGUS: {currentDistanceMeters} m
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isMultiBoatMode && phase !== 'firing' && (
                <button
                  onClick={() => {
                    sound.playClick()
                    setPhase('select_target')
                  }}
                  className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-xs sm:text-sm font-bold text-white pixel-btn flex items-center gap-1"
                >
                  <Compass className="w-4 h-4" />
                  Pealtvaade (Vali paat)
                </button>
              )}
              <button
                onClick={() => {
                  sound.playClick()
                  setPaused((p) => !p)
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-white pixel-btn flex items-center gap-1"
              >
                <Pause className="w-4 h-4" />
                Paus
              </button>
              <button
                onClick={() => {
                  sound.playClick()
                  onOpenRules()
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-amber-300 pixel-btn flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4" />
                Reeglid
              </button>
              <button
                onClick={() => {
                  sound.playClick()
                  onRestartToHome()
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-bold text-rose-300 pixel-btn flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Uus mäng
              </button>
              <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 pixel-btn">
                <button
                  onClick={() => setMuted(sound.toggleMute())}
                  className="text-sky-200 hover:text-amber-300"
                  title={muted ? 'Lülita heli sisse' : 'Vaigista heli'}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-amber-300" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setVolume(v)
                    sound.setVolume(v)
                    setMuted(sound.isMuted())
                  }}
                  className="w-16 accent-amber-400 cursor-pointer"
                  title="Helitugevus"
                />
              </div>
            </div>
          </div>

          <PlayerHudCard
            player={rightPlayer}
            isActive={activePlayer.id === rightPlayer.id}
            align="right"
          />
        </div>
      </header>

      {/* Main Battle Area */}
      <main className="relative flex-1 flex items-center justify-center bg-sky-950 px-2 py-1.5">
        <div className="relative w-full max-w-[1440px] aspect-[1280/660] max-h-[calc(100vh-96px)] border-4 border-slate-950 shadow-2xl overflow-hidden bg-sky-900">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleFireShot}
            className={`w-full h-full block pixelated ${
              phase === 'aiming' ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />

          {/* TOP-DOWN SEA MAP TARGET SELECTION OVERLAY (`pealtvaates vastaste paadid`) */}
          {phase === 'select_target' && !paused && (
            <div className="absolute inset-0 z-30 bg-sky-950/95 flex flex-col justify-between p-6 overflow-y-auto">
              {/* Top-down ocean grid decoration */}
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-4 py-1 font-pixel text-xs pixel-box">
                  <Compass className="w-4 h-4" />
                  MERELAHINGU PEALTVAADE – VALI SIHTMÄRK!
                </div>
                <h2 className="font-pixel text-lg sm:text-xl text-white pt-2">
                  Laskekord:{' '}
                  <span className="text-amber-300">{activePlayer.name}</span> (
                  {activePlayer.team === 0 ? 'Tiim 1' : 'Tiim 2'})
                </h2>
                <p className="text-sky-200 font-extrabold text-lg sm:text-xl">
                  Vali ohver ja tõmba talle vesi peale! 💥
                </p>
              </div>

              {/* Two Fleets Top-Down Sea Chart */}
              <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 my-auto py-4">
                {([0, 1] as const).map((teamNum) => {
                  const teamPlayers = players
                    .map((p, idx) => ({ p, idx }))
                    .filter((item) => item.p.team === teamNum)
                  const isEnemyTeam = activePlayer.team !== teamNum

                  return (
                    <div
                      key={teamNum}
                      className={`p-5 border-4 pixel-box ${
                        isEnemyTeam
                          ? 'bg-rose-950/40 border-rose-500'
                          : 'bg-sky-900/40 border-sky-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-pixel text-xs sm:text-sm text-amber-300">
                          {teamNum === 0 ? 'TIIM 1 LAEVASTIK (VASAK)' : 'TIIM 2 LAEVASTIK (PAREM)'}
                        </span>
                        <span
                          className={`px-2.5 py-1 text-xs font-bold ${
                            isEnemyTeam
                              ? 'bg-rose-600 text-white'
                              : 'bg-sky-700 text-sky-100'
                          }`}
                        >
                          {isEnemyTeam ? 'KLIKI PAADILE RÜNDAMISEKS!' : 'SINU TIIM'}
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {teamPlayers.map(({ p, idx }) => {
                          const eliminated = isBoatEliminated(p)
                          const aliveCrew = p.crew.filter((c) => !c.inWater).length
                          const isCurrentShooter = idx === activeIdx
                          const colorObj =
                            PLAYER_COLORS.find((c) => c.id === p.colorId) ||
                            PLAYER_COLORS[idx % PLAYER_COLORS.length]

                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!isEnemyTeam || eliminated}
                              onClick={() => {
                                if (!isEnemyTeam || eliminated) return
                                sound.playClick()
                                setTargetIdx(idx)
                                setPhase('betting')
                              }}
                              className={`w-full p-3.5 border-4 text-left flex items-center justify-between gap-4 transition-transform ${
                                eliminated
                                  ? 'bg-slate-900/60 border-slate-800 opacity-50 cursor-not-allowed'
                                  : isEnemyTeam
                                  ? 'bg-slate-900 hover:bg-slate-800 border-rose-400 hover:border-amber-300 hover:scale-[1.02] cursor-pointer pixel-btn'
                                  : isCurrentShooter
                                  ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-300'
                                  : 'bg-slate-900/80 border-slate-700'
                              }`}
                            >
                              {/* Top-Down Pixel Boat Graphic + Captain */}
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div
                                  className="relative w-20 h-14 bg-amber-900 border-4 flex items-center justify-center shrink-0 rounded-full"
                                  style={{ borderColor: colorObj.primary }}
                                >
                                  <img
                                    src={p.captainAvatar}
                                    alt={p.name}
                                    className="w-11 h-11 pixelated border border-amber-300 bg-slate-950"
                                  />
                                  {/* Top-down cannon barrel pointing toward enemy */}
                                  <div
                                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-2.5 bg-slate-800 border border-slate-950 ${
                                      teamNum === 0 ? '-right-3' : '-left-3'
                                    }`}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-base truncate">
                                      {p.name}
                                    </span>
                                    {isCurrentShooter && (
                                      <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 text-[10px] font-pixel">
                                        LASKJA
                                      </span>
                                    )}
                                  </div>

                                  {eliminated ? (
                                    <div className="text-xs text-rose-400 font-bold flex items-center gap-1 mt-1">
                                      <Skull className="w-4 h-4" /> PAAT PÕHJA LASTUD
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 mt-1 text-xs">
                                      <span className="flex items-center gap-0.5 text-rose-400 font-bold">
                                        {[0, 1, 2, 3, 4].map((h) => (
                                          <Heart
                                            key={h}
                                            className={`w-3.5 h-3.5 ${
                                              h < p.captainLives
                                                ? 'fill-rose-500 text-rose-500'
                                                : 'text-slate-700'
                                            }`}
                                          />
                                        ))}
                                      </span>
                                      <span className="text-sky-200 font-semibold">
                                        Madrused: {aliveCrew}/6
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Badge on Right */}
                              {isEnemyTeam && !eliminated && (
                                <div className="px-3 py-2 bg-rose-600 text-white font-pixel text-[10px] flex items-center gap-1.5 shrink-0">
                                  <Crosshair className="w-4 h-4" />
                                  RÜNDA!
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="text-center text-base sm:text-lg text-amber-300 font-extrabold">
                Seltsis segasem – keegi peab täna põhja minema! 🏴‍☠️🍻
              </div>
            </div>
          )}

          {/* South Park style Estonian „Su ema...“ roast bar */}
          {phase !== 'select_target' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-3xl px-3">
              <div className="bg-slate-950/90 border-2 border-amber-400 px-4 py-2.5 flex items-center justify-between gap-3 pixel-box">
                <div className="flex items-center gap-2 text-sm sm:text-base text-amber-200 font-bold">
                  <MessageSquareWarning className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-amber-400">{activePlayer.name} hõikab:</strong> „
                    {currentJoke}“
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    sound.playClick()
                    const nextJ = getRandomYoMamaJoke(currentJoke)
                    setCurrentJoke(nextJ)
                    addBanner(getCurrentRaftX(shooterSide), WATER_Y - 150, 'SU EMA NALI!', '#fbbf24')
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shrink-0 pixel-btn"
                >
                  Uus „Su ema“ nali
                </button>
              </div>
            </div>
          )}

          {/* Step 1 before shot: Dynamic Sip Betting Bar + ULTRA ALL IN */}
          {phase === 'betting' && !paused && (
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-3">
              <div className="bg-slate-900/95 border-4 border-amber-400 p-5 pixel-box text-center">
                <div className="font-pixel text-sm text-amber-300 mb-1.5">
                  {isBonusShot
                    ? `${activePlayer.name.toUpperCase()} – TOPELTLASU LISALASK!`
                    : `${activePlayer.name.toUpperCase()} RÜNDAB PAATI: ${opponentPlayer.name.toUpperCase()}`}
                </div>
                <p className="text-base text-white font-semibold mb-3.5">
                  Selle käigu panused! Praegu mängus:{' '}
                  <strong className="text-amber-300">
                    {selectedBetSips} {selectedBetSips === 1 ? 'lonks' : 'lonksu'} (Paatide kaugus:{' '}
                    {currentDistanceMeters} m)
                  </strong>
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {betOptions.map((opt, idx) => {
                    const isSelected = selectedBetIdx === idx
                    const isUltra = opt.id === 'ultra'
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (isUltra) {
                            sound.playBrainrotSound()
                          } else {
                            sound.playClick()
                          }
                          setSelectedBetIdx(idx as 0 | 1 | 2)
                        }}
                        className={`py-3 px-2.5 pixel-btn flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? isUltra
                              ? 'bg-rose-600 text-white ring-2 ring-amber-300 scale-[1.03]'
                              : 'bg-amber-400 text-slate-950 scale-[1.02]'
                            : isUltra
                            ? 'bg-rose-950/90 text-rose-200 hover:bg-rose-900 border border-rose-500'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <span className="font-bold text-sm sm:text-base">{opt.label}</span>
                        <span
                          className={`text-[11px] font-semibold ${
                            isSelected && !isUltra ? 'text-slate-900' : 'text-sky-200'
                          }`}
                        >
                          {opt.subLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {isUltraAllIn ? (
                  <div className="bg-rose-950 border-2 border-amber-400 px-3 py-2 mb-3.5 text-sm font-bold text-amber-300">
                    ⚡ ULTRA ALL IN ERIEFEKT: Kui saad vastase kaptenile pihta, kaotab ta korraga{' '}
                    <span className="text-white underline">3 ELU</span> (teiste valikutega 1 elu)!
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-sky-200 font-extrabold mb-3">
                    Kes ei riski, see šampust ei joo – või julged võtta ULTRA ALL IN?! 🔥
                  </p>
                )}

                <div className="flex gap-3">
                  {isMultiBoatMode && (
                    <button
                      onClick={() => {
                        sound.playClick()
                        setPhase('select_target')
                      }}
                      className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold text-xs sm:text-sm pixel-btn"
                    >
                      Vaheta sihtmärki
                    </button>
                  )}
                  <button
                    onClick={() => {
                      sound.playClick()
                      setPhase('aiming')
                    }}
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs sm:text-sm pixel-btn"
                  >
                    KINNITA PANUS ({selectedBetSips} LONKSU) JA SIHI KAHURIT
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Aiming Instruction Banner */}
          {phase === 'aiming' && !paused && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-slate-900/90 border-2 border-amber-400 px-6 py-2.5 text-center pixel-box">
                {isAimInverted && (
                  <div className="bg-cyan-500 text-slate-950 font-pixel text-xs px-3 py-1 mb-1.5 inline-block">
                    🌪️ TUULEPÖÖRE: SIHTIMINE ON TAGURPIDI (INVERTED)!
                  </div>
                )}
                <p className="text-base font-bold text-amber-300">
                  {activePlayer.name} → {opponentPlayer.name}:{' '}
                  {isAimInverted
                    ? 'NB! Hiire liigutamine töötab tagurpidi!'
                    : selectedBetSips >= 2
                    ? 'Kahur kõigub suure panuse tõttu – ajasta klõps täpselt!'
                    : 'Liiguta hiirt ja klõpsa tulistamiseks!'}
                </p>
                <p className="text-xs sm:text-sm text-sky-200">
                  Mängus on: <strong className="text-amber-300">{selectedBetSips} lonksu</strong> •
                  Kaptenile pihta:{' '}
                  <strong className="text-rose-400">
                    -{currentBetOption.captainDamage} elu
                  </strong>{' '}
                  • Paatide kaugus:{' '}
                  <strong className="text-amber-300">{currentDistanceMeters} m</strong>
                </p>
              </div>
            </div>
          )}

          {/* Italian Brainrot Chaos Event Popup */}
          {phase === 'brainrot_event' && activeBrainrot && !paused && (
            <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div
                className="max-w-md w-full bg-slate-900 border-4 p-6 pixel-box text-center space-y-4"
                style={{ borderColor: activeBrainrot.char.accentColor }}
              >
                <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1 font-pixel text-[10px]">
                  <Flame className="w-3.5 h-3.5" /> ITALIAN BRAINROT KAOS!
                </div>

                <img
                  src={activeBrainrot.avatarUrl}
                  alt={activeBrainrot.char.name}
                  className="w-28 h-28 mx-auto border-4 border-amber-400 pixelated bg-slate-950"
                />

                <div>
                  <h3 className="font-pixel text-base text-amber-300 mb-2">
                    {activeBrainrot.char.chaosTitle}
                  </h3>
                  <p className="text-white text-base font-semibold leading-relaxed">
                    {activeBrainrot.char.chaosText}
                  </p>
                </div>

                <div className="bg-slate-950 border-2 border-amber-400 p-3 text-sm sm:text-base font-bold text-amber-300">
                  {activeBrainrot.char.target === 'both' ? (
                    <>
                      JOOVAD MÕLEMAD:{' '}
                      <span className="text-white underline">{activePlayer.name}</span> (
                      {activeBrainrot.char.extraSips} lonksu) JA{' '}
                      <span className="text-white underline">{opponentPlayer.name}</span> (
                      {activeBrainrot.char.extraSips} lonksu)!
                    </>
                  ) : activeBrainrot.char.target === 'shooter' ? (
                    <>
                      JOOB LASKJA:{' '}
                      <span className="text-white underline">{activePlayer.name}</span> võtab{' '}
                      {activeBrainrot.char.extraSips} lonksu!
                    </>
                  ) : (
                    <>
                      JOOB SIHTMÄRK:{' '}
                      <span className="text-white underline">{opponentPlayer.name}</span> võtab{' '}
                      {activeBrainrot.char.extraSips} lonksu!
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    sound.playClick()
                    applyBrainrotChaosAndContinue()
                  }}
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-xs pixel-btn"
                >
                  VÕTA LONKSUD JA JÄTKA!
                </button>
              </div>
            </div>
          )}

          {/* Shot completion summary when Risk Wheel doesn't trigger (or after bonus shot) */}
          {phase === 'bonus_summary' && !paused && (
            <div className="absolute inset-0 z-30 bg-slate-950/70 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border-4 border-amber-400 p-5 pixel-box text-center space-y-3">
                <h3 className="font-pixel text-sm text-amber-300">
                  {isBonusShot ? 'LISALASK TEHTUD!' : 'LASU TULEMUS'}
                </h3>
                <p className="text-base text-white font-semibold">{lastShotResult.summaryText}</p>
                <div className="bg-slate-800/90 p-2.5 text-sm font-bold text-amber-300">
                  {lastShotResult.hit
                    ? `${opponentPlayer.name} joob ${selectedBetSips} lonksu!`
                    : `${activePlayer.name} joob möödalasu eest ${selectedBetSips} lonksu!`}
                </div>
                <button
                  onClick={() => {
                    sound.playClick()
                    handleBonusShotFinish()
                  }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs pixel-btn"
                >
                  JÄRGMINE MÄNGIJA
                </button>
              </div>
            </div>
          )}

          {/* Pause Overlay */}
          {paused && (
            <div className="absolute inset-0 z-30 bg-slate-950/80 flex items-center justify-center p-4">
              <div className="max-w-sm w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center space-y-4">
                <h2 className="font-pixel text-lg text-amber-300">MÄNG PAUSIL</h2>
                <button
                  onClick={() => {
                    sound.playClick()
                    setPaused(false)
                  }}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs pixel-btn flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  JÄTKA MÄNGU
                </button>
                <button
                  onClick={() => {
                    sound.playClick()
                    onRestartToHome()
                  }}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm pixel-btn"
                >
                  Välju avakuvale
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Risk Wheel Modal */}
      {phase === 'wheel' && !paused && (
        <RiskWheelModal
          shooterName={activePlayer.name}
          opponentName={opponentPlayer.name}
          shotHit={lastShotResult.hit}
          shieldBlocked={lastShotResult.shieldBlocked}
          betSips={selectedBetSips}
          isUltraAllIn={isUltraAllIn}
          onCompleteTurn={handleWheelComplete}
        />
      )}
    </div>
  )
}

interface PlayerHudCardProps {
  player: PlayerBattleState
  isActive: boolean
  align: 'left' | 'right'
}

const PlayerHudCard: React.FC<PlayerHudCardProps> = ({ player, isActive, align }) => {
  const colorObj = PLAYER_COLORS.find((c) => c.id === player.colorId) || PLAYER_COLORS[0]
  const aliveCrew = player.crew.filter((c) => !c.inWater).length

  return (
    <div
      className={`flex items-center gap-3.5 p-2.5 bg-slate-950 border-2 ${
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left'
      }`}
      style={{ borderColor: isActive ? '#fbbf24' : colorObj.primary }}
    >
      <img
        src={player.captainAvatar}
        alt={player.name}
        className="w-14 h-14 border-2 pixelated bg-slate-900 shrink-0"
        style={{ borderColor: colorObj.primary }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 justify-between">
          <span className="font-bold text-white text-base truncate">{player.name}</span>
          {isActive && (
            <span className="bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-pixel">
              SINU KORD
            </span>
          )}
        </div>
        <div
          className={`flex items-center gap-3.5 mt-1 text-xs sm:text-sm ${
            align === 'right' ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="flex items-center gap-1 text-rose-400 font-bold" title="Kapteni 5 elu">
            {[0, 1, 2, 3, 4].map((h) => (
              <Heart
                key={h}
                className={`w-4 h-4 ${
                  h < player.captainLives ? 'fill-rose-500 text-rose-500' : 'text-slate-700'
                }`}
              />
            ))}
          </span>
          <span className="text-sky-200 font-semibold">Meeskond: {aliveCrew}/6</span>
          {player.hasShield && (
            <span className="text-sky-400 font-bold flex items-center gap-0.5">
              <Shield className="w-4 h-4 fill-sky-400" /> Kilp
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
