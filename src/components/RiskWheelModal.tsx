import React, { useState } from 'react'
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
  const [rotation, setRotation] = useState(0)
  const [selectedOutcome, setSelectedOutcome] = useState<WheelOutcome | null>(null)

  const handleSpin = () => {
    if (spinning || selectedOutcome) return
    setSpinning(true)
    sound.playClick()

    const index = Math.floor(Math.random() * WHEEL_OUTCOMES.length)
    const outcome = WHEEL_OUTCOMES[index]

    const targetSliceAngle = 360 - (index * 60 + 30)
    const totalDeg = 360 * 5 + targetSliceAngle
    setRotation(totalDeg)

    const tickTimes = [150, 320, 500, 700, 920, 1160, 1420, 1700, 2000, 2300]
    tickTimes.forEach((t) => {
      setTimeout(() => sound.playWheelTick(), t)
    })

    setTimeout(() => {
      setSpinning(false)
      setSelectedOutcome(outcome)
      sound.playHit()
    }, 2550)
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
    <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center">
        <h2 className="font-pixel text-base text-amber-300 mb-1">
          {isUltraAllIn ? '🔥 ULTRA ALL IN RISKIRATAS 🔥' : 'RISKIRATAS'}
        </h2>
        <p className="text-sm text-sky-200 font-semibold mb-4">
          {shieldBlocked
            ? `Kilp blokeeris tabamuse! (${shooterName} joob panustatud ${betSips} lonksu!)`
            : shotHit
            ? `Pihtas! ${opponentName} sai lasust +${betSips} lonksu!`
            : `Möödas! ${shooterName} sai möödalasust +${betSips} lonksu!`}
        </p>

        {/* Wheel SVG */}
        <div className="relative w-64 h-64 mx-auto mb-5">
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0"
            style={{
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: '20px solid #fbbf24',
            }}
          />

          <svg
            viewBox="0 0 200 200"
            className="w-full h-full rounded-full border-4 border-slate-950 shadow-xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 2.5s cubic-bezier(0.15, 0.85, 0.2, 1)' : 'none',
            }}
          >
            {WHEEL_OUTCOMES.map((item, i) => {
              const startAngle = (i * 60 - 90) * (Math.PI / 180)
              const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180)
              const x1 = 100 + 100 * Math.cos(startAngle)
              const y1 = 100 + 100 * Math.sin(startAngle)
              const x2 = 100 + 100 * Math.cos(endAngle)
              const y2 = 100 + 100 * Math.sin(endAngle)
              const midAngle = i * 60 + 30
              return (
                <g key={item.id}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                    fill={item.color}
                    stroke="#0f172a"
                    strokeWidth="2.5"
                  />
                  <text
                    x="100"
                    y="38"
                    transform={`rotate(${midAngle} 100 100)`}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    style={{ textShadow: '1px 1px 0 #0f172a' }}
                  >
                    {item.title.toUpperCase()}
                  </text>
                </g>
              )
            })}
            <circle cx="100" cy="100" r="18" fill="#0f172a" stroke="#fbbf24" strokeWidth="4" />
          </svg>
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
