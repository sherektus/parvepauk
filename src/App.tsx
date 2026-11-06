import { useCallback, useState } from 'react'
import {
  Play,
  BookOpen,
  UserPlus,
  Trophy,
  RotateCcw,
  Home,
  Volume2,
  VolumeX,
  Beer,
  CupSoda,
} from 'lucide-react'
import { PLAYER_COLORS } from './data/gameContent'
import { createBrainrotAvatar } from './utils/pixelAvatar'
import { SetupModal, type PlayerSetupConfig } from './components/SetupModal'
import { RulesModal } from './components/RulesModal'
import { BattleScreen, type PlayerBattleState } from './components/BattleScreen'
import { sound } from './utils/sound'

export function App() {
  const [drinkSelected, setDrinkSelected] = useState<'none' | 'prompt_jobu' | 'done'>('none')
  const [noTurnedToSuperJa, setNoTurnedToSuperJa] = useState(false)

  const [screen, setScreen] = useState<'home' | 'setup' | 'battle' | 'gameover'>('home')
  const [showRules, setShowRules] = useState(false)
  const [muted, setMuted] = useState(() => sound.isMuted())

  const [players, setPlayers] = useState<[PlayerSetupConfig, PlayerSetupConfig]>(() => [
    {
      name: 'Tralalero Tralala',
      colorId: PLAYER_COLORS[0].id,
      captainAvatar: createBrainrotAvatar('tralalero'),
      selectedBrainrotId: 'tralalero',
      hasCustomPhoto: false,
    },
    {
      name: 'Bombardiro Crocodilo',
      colorId: PLAYER_COLORS[1].id,
      captainAvatar: createBrainrotAvatar('bombardiro'),
      selectedBrainrotId: 'bombardiro',
      hasCustomPhoto: false,
    },
  ])

  const [gameOverData, setGameOverData] = useState<{
    winnerIdx: 0 | 1
    finalPlayers: [PlayerBattleState, PlayerBattleState]
    reason: string
  } | null>(null)

  const handleUpdatePlayer = useCallback((index: 0 | 1, patch: Partial<PlayerSetupConfig>) => {
    setPlayers((prev) => {
      const next: [PlayerSetupConfig, PlayerSetupConfig] = [{ ...prev[0] }, { ...prev[1] }]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }, [])

  const handleEndGame = (
    winnerIdx: 0 | 1,
    finalPlayers: [PlayerBattleState, PlayerBattleState],
    reason: string
  ) => {
    setGameOverData({ winnerIdx, finalPlayers, reason })
    setScreen('gameover')
  }

  const handleStartNewGame = () => {
    setGameOverData(null)
    setScreen('battle')
  }

  // Initial Drink Selection Gate & "Kas te olete jobud?" Prompt
  if (drinkSelected !== 'done') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-sky-800 via-sky-950 to-slate-950 text-white flex items-center justify-center p-6">
        {drinkSelected === 'none' ? (
          <div className="max-w-lg w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center space-y-6">
            <h1 className="font-pixel text-2xl sm:text-3xl text-amber-300">PARVEPAUK</h1>
            <p className="text-lg font-bold text-sky-200">
              Enne kui kahurid laetakse: mida te täna joote?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => {
                  sound.playClick()
                  setDrinkSelected('done')
                }}
                className="py-5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-xs pixel-btn flex flex-col items-center gap-3"
              >
                <Beer className="w-10 h-10" />
                <span>ALKOHOOLNE JOOK</span>
              </button>

              <button
                onClick={() => {
                  sound.playBrainrotSound()
                  setNoTurnedToSuperJa(false)
                  setDrinkSelected('prompt_jobu')
                }}
                className="py-5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-pixel text-xs pixel-btn flex flex-col items-center gap-3"
              >
                <CupSoda className="w-10 h-10" />
                <span>ALKOHOLIVABA JOOK</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full bg-slate-900 border-4 border-rose-500 p-6 pixel-box text-center space-y-5">
            <h2 className="font-pixel text-lg text-rose-400 leading-relaxed">
              OOT-OOT... KAS TE OLETE JOBID VÕI?!
            </h2>

            {noTurnedToSuperJa && (
              <p className="text-amber-300 font-bold text-base">
                Haha, „Ei“ ei päästa sind! Vajuta nüüd ausalt ära:
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => {
                  sound.playClick()
                  setDrinkSelected('done')
                }}
                className="py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-sm pixel-btn"
              >
                JA
              </button>

              <button
                onClick={() => {
                  if (!noTurnedToSuperJa) {
                    sound.playBrainrotSound()
                    setNoTurnedToSuperJa(true)
                  } else {
                    sound.playClick()
                    setDrinkSelected('done')
                  }
                }}
                className={`py-4 font-pixel text-sm pixel-btn ${
                  noTurnedToSuperJa
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 scale-105'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {noTurnedToSuperJa ? 'SUPER JA!' : 'EI'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-sky-950 text-white">
      {screen === 'home' && (
        <div className="min-h-screen w-full bg-gradient-to-b from-sky-800 via-sky-950 to-slate-950 flex flex-col justify-between p-6 relative overflow-hidden">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                sound.playClick()
                setDrinkSelected('none')
              }}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs pixel-btn"
            >
              Vaheta joogivalikut
            </button>

            <button
              onClick={() => setMuted(sound.toggleMute())}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-sky-200 font-bold text-xs pixel-btn flex items-center gap-2"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {muted ? 'Meremehe muusika maas' : 'Meremehe muusika sees'}
            </button>
          </div>

          <div className="max-w-xl w-full mx-auto my-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-6">
              <img
                src={players[0].captainAvatar}
                alt={players[0].name}
                className="w-20 h-20 border-4 border-rose-500 bg-slate-900 pixelated pixel-box"
              />
              <div className="bg-amber-400 text-slate-950 font-pixel text-xs px-3 py-2 pixel-box">
                VS
              </div>
              <img
                src={players[1].captainAvatar}
                alt={players[1].name}
                className="w-20 h-20 border-4 border-sky-400 bg-slate-900 pixelated pixel-box"
              />
            </div>

            <div>
              <h1 className="font-pixel text-3xl sm:text-4xl text-amber-300 drop-shadow-[0_4px_0_#0f172a]">
                PARVEPAUK
              </h1>
              <p className="text-sky-200 text-lg font-semibold mt-3">
                Kahe mängijaga parveduell: Italian Brainrot & „Su ema“ eri!
              </p>
            </div>

            <div className="flex flex-col gap-3.5 max-w-sm mx-auto pt-2">
              <button
                onClick={() => {
                  sound.playClick()
                  setScreen('battle')
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
              >
                <Play className="w-5 h-5 fill-current" />
                Alusta mängu
              </button>

              <button
                onClick={() => {
                  sound.playClick()
                  setScreen('setup')
                }}
                className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                Tegelase lisamine
              </button>

              <button
                onClick={() => {
                  sound.playClick()
                  setShowRules(true)
                }}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
              >
                <BookOpen className="w-5 h-5" />
                Reeglid
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-sky-300/80 font-semibold">
            Vali Italian Brainrot kapten või tee pilt arvuti kaameraga • „Su ema“ naljad • Meremehe taustamuusika
          </div>
        </div>
      )}

      {screen === 'setup' && (
        <SetupModal
          players={players}
          onUpdatePlayer={handleUpdatePlayer}
          onBack={() => setScreen('home')}
          onStartGame={() => setScreen('battle')}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          setupPlayers={players}
          onOpenRules={() => setShowRules(true)}
          onEndGame={handleEndGame}
          onRestartToHome={() => setScreen('home')}
        />
      )}

      {screen === 'gameover' && gameOverData && (
        <div className="min-h-screen w-full bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center space-y-5">
            <Trophy className="w-14 h-14 text-amber-300 mx-auto" />
            <div>
              <div className="font-pixel text-xs text-sky-300 mb-1">VÕITJA ON SELGUNUD!</div>
              <h1 className="font-pixel text-xl text-amber-300">
                {gameOverData.finalPlayers[gameOverData.winnerIdx].name} VÕITIS!
              </h1>
              <p className="text-slate-200 font-semibold text-base mt-2">{gameOverData.reason}</p>
            </div>

            <div className="flex justify-center">
              <img
                src={gameOverData.finalPlayers[gameOverData.winnerIdx].captainAvatar}
                alt="Võitja kapten"
                className="w-28 h-28 border-4 border-amber-400 pixelated bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 border-2 border-slate-800 text-sm">
              {([0, 1] as const).map((i) => {
                const fp = gameOverData.finalPlayers[i]
                const alive = fp.crew.filter((c) => !c.inWater).length
                return (
                  <div key={i} className="space-y-1">
                    <div className="font-bold text-amber-300">{fp.name}</div>
                    <div className="text-xs text-slate-300">
                      Kapteni elud: {fp.captainLives}/5 • Madrused: {alive}/6
                    </div>
                    <div className="text-xs text-sky-300 font-semibold">
                      Kokku lonkse: {fp.totalSipsTaken}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  sound.playClick()
                  handleStartNewGame()
                }}
                className="py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs pixel-btn flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Mängi uuesti
              </button>
              <button
                onClick={() => {
                  sound.playClick()
                  setScreen('home')
                }}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm pixel-btn flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Avakuvale
              </button>
            </div>
          </div>
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  )
}

export default App
