import React, { useEffect, useRef, useState } from 'react'
import { WHEEL_OUTCOMES, type WheelOutcome } from '../data/gameContent'
import { sound } from '../utils/sound'

interface RiskWheelModalProps {
  shooterName: string
  opponentName: string
  shotHit: boolean
  shieldBlocked: boolean
  betSips: number
  isUltraAllIn?: boolean
  onCompleteTurn: (outcome: WheelOutcome) => void
}

const SLICE_BADGES: Record<WheelOutcome['id'], string> = {
  double_shot: '+1 LASK',
  shield: 'KAITSE',
  wind_reverse: 'TAGURPIDI',
  counter_sip: '+1 LONKS',
  bad_luck: 'VAHELE',
  escape: 'PUHAS',
}

export const RiskWheelModal: React.FC<RiskWheelModalProps> = ({
  shooterName,
  opponentName,
  shotHit,
  shieldBlocked,
  betSips,
  isUltraAllIn,
  onCompleteTurn,
}) => {
  const [spinning, setSpinning] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<WheelOutcome | null>(null)

  const wheelRotorRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<HTMLDivElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const currentAngleRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  const handleSpin = () => {
    if (spinning || selectedOutcome) return
    setSpinning(true)
    sound.playClick()

    const index = Math.floor(Math.random() * WHEEL_OUTCOMES.length)
    const outcome = WHEEL_OUTCOMES[index]

    // Center of target slice at 12 o'clock pointer + slight natural random offset
    const jitter = (Math.random() - 0.5) * 22
    const targetSliceAngle = (360 - (index * 60 + 30) + jitter + 360) % 360
    const startAngle = currentAngleRef.current % 360
    const extraSpins = 360 * 6
    const totalDelta = extraSpins + ((targetSliceAngle - startAngle + 360) % 360)
    const finalAngle = startAngle + totalDelta

    const duration = 3200
    const startTime = performance.now()
    let lastTickSlot = Math.floor((startAngle + 30) / 60)
    let pointerTimeout: ReturnType<typeof setTimeout> | null = null

    const animateWheel = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Smooth quartic ease-out
      const eased = 1 - Math.pow(1 - progress, 4)
      const angle = startAngle + totalDelta * eased
      currentAngleRef.current = angle

      if (wheelRotorRef.current) {
        wheelRotorRef.current.style.transform = `rotate(${angle.toFixed(2)}deg) translateZ(0)`
      }

      // Trigger synchronized peg tick sound & pointer flick every 60 degrees
      const currentTickSlot = Math.floor((angle + 30) / 60)
      if (currentTickSlot > lastTickSlot) {
        lastTickSlot = currentTickSlot
        sound.playWheelTick()
        if (pointerRef.current) {
          pointerRef.current.style.transform = 'translateX(-50%) rotate(-22deg)'
          if (pointerTimeout) clearTimeout(pointerTimeout)
          pointerTimeout = setTimeout(() => {
            if (pointerRef.current) {
              pointerRef.current.style.transform = 'translateX(-50%) rotate(0deg)'
            }
          }, 75)
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateWheel)
      } else {
        currentAngleRef.current = finalAngle
        if (wheelRotorRef.current) {
          wheelRotorRef.current.style.transform = `rotate(${finalAngle.toFixed(2)}deg) translateZ(0)`
        }
        if (pointerRef.current) {
          pointerRef.current.style.transform = 'translateX(-50%) rotate(0deg)'
        }
        setSpinning(false)
        setSelectedOutcome(outcome)
        sound.playHit()
      }
    }

    animFrameRef.current = requestAnimationFrame(animateWheel)
  }

  const computeTurnSips = (outcome: WheelOutcome | null) => {
    let shooterSips = !shotHit ? betSips : 0
    let opponentSips = shotHit ? betSips : 0

    if (outcome?.id === 'counter_sip') {
      // Vastulöök: ründaja (laskja) võtab ise lonksu!
      shooterSips += 1
    }
    if (outcome?.id === 'bad_luck') {
      shooterSips += 1
    }

    return {
      shooterSips,
      opponentSips,
    }
  }

  const { shooterSips, opponentSips } = computeTurnSips(selectedOutcome)

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center">
        <h2 className="font-pixel text-base sm:text-lg text-amber-300 mb-1">
          {isUltraAllIn ? 'ULTRA ALL IN RISKIRATAS' : 'RISKIRATAS'}
        </h2>
        <p className="text-sm sm:text-base text-sky-200 font-bold mb-4">
          {shieldBlocked
            ? `Kilp blokeeris tabamuse! (${shooterName} joob panustatud ${betSips} lonksu!)`
            : shotHit
            ? `Pihtas! ${opponentName} sai lasust +${betSips} lonksu!`
            : `Möödas! ${shooterName} sai möödalasust +${betSips} lonksu!`}
        </p>

        {/* Wheel Container */}
        <div className="relative w-80 h-80 sm:w-[350px] sm:h-[350px] mx-auto mb-5 select-none">
          {/* Top Pointer with physical kick animation */}
          <div
            ref={pointerRef}
            className="absolute -top-4 left-1/2 z-20 origin-top transition-transform duration-75"
            style={{ transform: 'translateX(-50%) rotate(0deg)' }}
          >
            <div
              className="w-0 h-0 drop-shadow-[0_3px_0_#0f172a]"
              style={{
                borderLeft: '16px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '28px solid #fbbf24',
              }}
            />
          </div>

          {/* GPU-accelerated Rotating Wheel */}
          <div
            ref={wheelRotorRef}
            className="w-full h-full rounded-full will-change-transform"
            style={{ transform: 'rotate(0deg) translateZ(0)' }}
          >
            <svg
              viewBox="0 0 260 260"
              className="w-full h-full rounded-full border-4 border-slate-950 shadow-2xl"
            >
              {WHEEL_OUTCOMES.map((item, i) => {
                const startAngle = (i * 60 - 90) * (Math.PI / 180)
                const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180)
                const x1 = 130 + 126 * Math.cos(startAngle)
                const y1 = 130 + 126 * Math.sin(startAngle)
                const x2 = 130 + 126 * Math.cos(endAngle)
                const y2 = 130 + 126 * Math.sin(endAngle)
                const midAngle = i * 60 + 30
                return (
                  <g key={item.id}>
                    <path
                      d={`M 130 130 L ${x1} ${y1} A 126 126 0 0 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      stroke="#0f172a"
                      strokeWidth="3.5"
                    />
                    <g transform={`rotate(${midAngle} 130 130)`}>
                      <text
                        x="130"
                        y="38"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11.5"
                        fontWeight="900"
                        letterSpacing="0.4"
                        stroke="#0f172a"
                        strokeWidth="4.2"
                        strokeLinejoin="round"
                        paintOrder="stroke fill"
                      >
                        {item.title.toUpperCase()}
                      </text>
                      <text
                        x="130"
                        y="56"
                        textAnchor="middle"
                        fill="#fef08a"
                        fontSize="9.5"
                        fontWeight="800"
                        stroke="#0f172a"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        paintOrder="stroke fill"
                      >
                        {SLICE_BADGES[item.id]}
                      </text>
                    </g>
                    {/* Rim peg dot at slice boundary */}
                    <circle
                      cx={130 + 118 * Math.cos(startAngle)}
                      cy={130 + 118 * Math.sin(startAngle)}
                      r="4"
                      fill="#fbbf24"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                )
              })}
              {/* Outer ring & Center hub */}
              <circle
                cx="130"
                cy="130"
                r="124"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4"
              />
              <circle cx="130" cy="130" r="22" fill="#0f172a" stroke="#fbbf24" strokeWidth="5" />
              <circle cx="130" cy="130" r="7" fill="#fbbf24" />
            </svg>
          </div>
        </div>

        {!selectedOutcome ? (
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-pixel text-sm pixel-btn"
          >
            {spinning ? 'KEERLEB...' : 'KEERUTA RISKIRATAST!'}
          </button>
        ) : (
          <div className="space-y-3">
            <div
              className="p-3 bg-slate-950 border-2"
              style={{ borderColor: selectedOutcome.color }}
            >
              <div className="font-pixel text-sm text-amber-300 mb-1">
                {selectedOutcome.title.toUpperCase()}
              </div>
              <p className="text-sm text-white font-semibold">{selectedOutcome.shortDesc}</p>
            </div>

            <div className="bg-slate-800/90 p-2.5 text-sm font-bold text-sky-200 flex items-center justify-around">
              <span>
                {shooterName}: <strong className="text-amber-300">{shooterSips} lonksu</strong>
              </span>
              <span>|</span>
              <span>
                {opponentName}: <strong className="text-amber-300">{opponentSips} lonksu</strong>
              </span>
            </div>

            <button
              onClick={() => {
                sound.playClick()
                onCompleteTurn(selectedOutcome)
              }}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs pixel-btn"
            >
              {selectedOutcome.id === 'double_shot' ? 'TEE LISALASK!' : 'JÄRGMINE KÄIK'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
