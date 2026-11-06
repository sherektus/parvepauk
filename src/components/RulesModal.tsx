import React from 'react'
import { X } from 'lucide-react'
import { GAME_RULES, WHEEL_OUTCOMES } from '../data/gameContent'
import { sound } from '../utils/sound'

interface RulesModalProps {
  onClose: () => void
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-pixel text-lg text-amber-300">PARVEPAUK – MÄNGUREEGLID</h2>
          <button
            onClick={() => {
              sound.playClick()
              onClose()
            }}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white pixel-btn"
            aria-label="Sulge reeglid"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {GAME_RULES.map((rule) => (
            <div key={rule.title} className="bg-slate-950/90 border-2 border-slate-700 p-3.5">
              <h3 className="font-bold text-amber-300 text-base mb-1">{rule.title}</h3>
              <p className="text-slate-200 text-sm leading-relaxed">{rule.text}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-950/90 border-2 border-sky-700 p-3.5 mb-5">
          <h3 className="font-bold text-sky-300 text-base mb-2">Riskiratta 6 tulemust:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {WHEEL_OUTCOMES.map((w) => (
              <div key={w.id} className="p-2 bg-slate-900 border-l-4" style={{ borderColor: w.color }}>
                <div className="font-bold text-white">{w.title}</div>
                <div className="text-slate-300 mt-0.5">{w.shortDesc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => {
              sound.playClick()
              onClose()
            }}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-xs pixel-btn"
          >
            SELGE, MÄNGIMA!
          </button>
        </div>
      </div>
    </div>
  )
}
