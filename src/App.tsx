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
  Users,
} from 'lucide-react'
import { BRAINROT_CHARACTERS, PLAYER_COLORS } from './data/gameContent'
import { createBrainrotAvatar } from './utils/pixelAvatar'
import { SetupModal, type PlayerSetupConfig } from './components/SetupModal'
import { RulesModal } from './components/RulesModal'
import { BattleScreen, type PlayerBattleState } from './components/BattleScreen'
import { sound } from './utils/sound'

function createInitialPlayers(): PlayerSetupConfig[] {
  return BRAINROT_CHARACTERS.map((br, idx) => ({
    id: idx,
    team: (idx % 2) as 0 | 1,
    name: br.name,
    colorId: PLAYER_COLORS[idx % PLAYER_COLORS.length].id,
    captainAvatar: createBrainrotAvatar(br.id),
    selectedBrainrotId: br.id,
    hasCustomPhoto: false,
  }))
}

export function App() {
  const [drinkSelected, setDrinkSelected] = useState<'none' | 'prompt_jobu' | 'done'>('none')
  const [noTurnedToSuperJa, setNoTurnedToSuperJa] = useState(false)

  const [screen, setScreen] = useState<'home' | 'setup' | 'battle' | 'gameover'>('home')
  const [showRules, setShowRules] = useState(false)
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [volume, setVolume] = useState(() => sound.getVolume())

  const [playerCount, setPlayerCount] = useState<number>(2)
  const [players, setPlayers] = useState<PlayerSetupConfig[]>(() => createInitialPlayers())

  const [gameOverData, setGameOverData] = useState<{
    winningTeam: 0 | 1
    finalPlayers: PlayerBattleState[]
    reason: string
  } | null>(null)

  const handleUpdatePlayer = useCallback((index: number, patch: Partial<PlayerSetupConfig>) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }, [])

  const handleEndGame = (
    winningTeam: 0 | 1,
    finalPlayers: PlayerBattleState[],
    reason: string
  ) => {
    setGameOverData({ winningTeam, finalPlayers, reason })
    setScreen('gameover')
  }

  const handleStartNewGame = () => {
    setGameOverData(null)
    setScreen('battle')
  }

  const activeSetupPlayers = players.slice(0, playerCount)

  // Initial Drink Selection Gate & "Kas te olete jobid?" Prompt
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

            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 pixel-box">
              <button
                onClick={() => setMuted(sound.toggleMute())}
                className="text-sky-200 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5"
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
                className="w-24 accent-amber-400 cursor-pointer"
                title="Muusika ja helide tugevus"
              />
              <span className="text-[11px] font-bold text-sky-200 w-8 text-right">
                {muted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>

          <div className="max-w-2xl w-full mx-auto my-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <img
                src={players[0].captainAvatar}
                alt={players[0].name}
                className="w-20 h-20 border-4 border-rose-500 bg-slate-900 pixelated pixel-box"
              />
              <div className="bg-amber-400 text-slate-950 font-pixel text-xs px-3 py-2 pixel-box">
                {playerCount === 2 ? '1 vs 1' : `${playerCount} PAATI`}
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
                Parveduell 2 kuni 6 mängijale: Italian Brainrot & „Su ema“ eri!
              </p>
            </div>

            {/* Quick Player Count Selector on Home Screen */}
            <div className="bg-slate-900/90 border-2 border-amber-400 p-4 max-w-lg mx-auto pixel-box space-y-2.5">
              <div className="text-xs font-pixel text-amber-300 flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                VALI MÄNGUREŽIIM (2–6 MÄNGIJAT):
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      sound.playClick()
                      setPlayerCount(cnt)
                    }}
                    className={`py-2 font-bold text-sm pixel-btn ${
                      playerCount === cnt
                        ? 'bg-amber-400 text-slate-950 scale-105'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {cnt === 2 ? '2 (1v1)' : cnt === 6 ? '6 (3v3)' : `${cnt} mäng.`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-sky-200">
                {playerCount === 2
                  ? 'Kahekesi: klassikaline parveduell 1 vs 1!'
                  : `${playerCount} mängijat: igal mängijal on oma paat ja enne lasku valid pealtvaates, keda rünnata!`}
              </p>
            </div>

            <div className="flex flex-col gap-3.5 max-w-sm mx-auto pt-1">
              <button
                onClick={() => {
                  sound.playClick()
                  setScreen('battle')
                }}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
              >
                <Play className="w-5 h-5 fill-current" />
                Alusta mängu ({playerCount} mängijat)
              </button>

              <button
                onClick={() => {
                  sound.playClick()
                  setScreen('setup')
                }}
                className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
              >
                <UserPlus className="w-5 h-5" />
                Tegelase ja paatide valik
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
            2–6 mängijat • Pealtvaates sihtmärgi valik • Italian Brainrot kaptenid & veebikaamera
          </div>
        </div>
      )}

      {screen === 'setup' && (
        <SetupModal
          playerCount={playerCount}
          onChangePlayerCount={setPlayerCount}
          players={players}
          onUpdatePlayer={handleUpdatePlayer}
          onBack={() => setScreen('home')}
          onStartGame={() => setScreen('battle')}
        />
      )}

      {screen === 'battle' && (
        <BattleScreen
          setupPlayers={activeSetupPlayers}
          onOpenRules={() => setShowRules(true)}
          onEndGame={handleEndGame}
          onRestartToHome={() => setScreen('home')}
        />
      )}

      {screen === 'gameover' && gameOverData && (
        <div className="min-h-screen w-full bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-slate-900 border-4 border-amber-400 p-6 pixel-box text-center space-y-5">
            <Trophy className="w-14 h-14 text-amber-300 mx-auto" />
            <div>
              <div className="font-pixel text-xs text-sky-300 mb-1">VÕITJA ON SELGUNUD!</div>
              <h1 className="font-pixel text-xl text-amber-300">
                {gameOverData.finalPlayers.length === 2
                  ? `${
                      gameOverData.finalPlayers.find(
                        (p) => p.team === gameOverData.winningTeam
                      )?.name
                    } VÕITIS!`
                  : `TIIM ${gameOverData.winningTeam + 1} VÕITIS MERELAHINGU!`}
              </h1>
              <p className="text-slate-200 font-semibold text-base mt-2">{gameOverData.reason}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-3 border-2 border-slate-800 text-sm">
              {gameOverData.finalPlayers.map((fp) => {
                const alive = fp.crew.filter((c) => !c.inWater).length
                return (
                  <div
                    key={fp.id}
                    className="p-2 bg-slate-900 border border-slate-800 space-y-1 flex flex-col items-center"
                  >
                    <img
                      src={fp.captainAvatar}
                      alt={fp.name}
                      className="w-12 h-12 pixelated border border-amber-400"
                    />
                    <div className="font-bold text-amber-300 truncate max-w-full">{fp.name}</div>
                    <div className="text-[11px] text-slate-300">
                      Elud: {fp.captainLives}/5 • Madrused: {alive}/6
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
