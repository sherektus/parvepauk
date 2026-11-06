import React, { useEffect, useRef, useState } from 'react'
import { Camera, Upload, ArrowLeft, Play, X } from 'lucide-react'
import { BRAINROT_CHARACTERS, PLAYER_COLORS, type BrainrotId } from '../data/gameContent'
import { convertImageToPixelAvatar, createBrainrotAvatar } from '../utils/pixelAvatar'
import { sound } from '../utils/sound'

export interface PlayerSetupConfig {
  name: string
  colorId: string
  captainAvatar: string
  selectedBrainrotId?: BrainrotId
  hasCustomPhoto: boolean
}

interface SetupModalProps {
  players: [PlayerSetupConfig, PlayerSetupConfig]
  onUpdatePlayer: (index: 0 | 1, patch: Partial<PlayerSetupConfig>) => void
  onBack: () => void
  onStartGame: () => void
}

export const SetupModal: React.FC<SetupModalProps> = ({
  players,
  onUpdatePlayer,
  onBack,
  onStartGame,
}) => {
  const [brainrotAvatars] = useState<Record<BrainrotId, string>>(() => ({
    tralalero: createBrainrotAvatar('tralalero'),
    bombardiro: createBrainrotAvatar('bombardiro'),
    tungtung: createBrainrotAvatar('tungtung'),
    lirili: createBrainrotAvatar('lirili'),
    patapim: createBrainrotAvatar('patapim'),
    cappuccino: createBrainrotAvatar('cappuccino'),
  }))

  const [activeWebcamIdx, setActiveWebcamIdx] = useState<0 | 1 | null>(null)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRefs = [useRef<HTMLInputElement | null>(null), useRef<HTMLInputElement | null>(null)]

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setActiveWebcamIdx(null)
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const openComputerWebcam = async (idx: 0 | 1) => {
    sound.playClick()
    setWebcamError(null)
    stopWebcam()

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Sinu brauser ei toeta veebikaamerat. Vali pildifail arvutist!')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      setActiveWebcamIdx(idx)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch {
      setWebcamError('Arvuti kaamerale ei saadud ligipääsu. Luba kaamera või vali pildifail!')
    }
  }

  const snapWebcamPhoto = (idx: 0 | 1) => {
    if (!videoRef.current) return
    sound.playHit()
    const pixelUrl = convertImageToPixelAvatar(
      videoRef.current,
      { offsetX: 0, offsetY: 0, zoom: 1.2 },
      48,
      240
    )
    onUpdatePlayer(idx, {
      captainAvatar: pixelUrl,
      hasCustomPhoto: true,
      selectedBrainrotId: undefined,
    })
    stopWebcam()
  }

  const handleLocalFile = (idx: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const pixelAvatar = convertImageToPixelAvatar(
        img,
        { offsetX: 0, offsetY: 0, zoom: 1.15 },
        48,
        240
      )
      sound.playHit()
      onUpdatePlayer(idx, {
        captainAvatar: pixelAvatar,
        hasCustomPhoto: true,
        selectedBrainrotId: undefined,
      })
    }
    img.src = url
    e.target.value = ''
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 flex flex-col justify-between p-4 lg:p-6">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <button
          onClick={() => {
            sound.playClick()
            stopWebcam()
            onBack()
          }}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold pixel-btn flex items-center gap-2 text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          Tagasi avakuvale
        </button>

        <h1 className="font-pixel text-base lg:text-xl text-amber-300 text-center">
          ITALIAN BRAINROT KAPTENID & KAAMERA
        </h1>

        <button
          onClick={() => {
            sound.playClick()
            stopWebcam()
            onStartGame()
          }}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs lg:text-sm pixel-btn flex items-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          ALUSTA MÄNGU
        </button>
      </div>

      {webcamError && (
        <div className="max-w-xl mx-auto mt-2 bg-rose-900/90 border-2 border-rose-400 text-rose-100 px-4 py-2 text-sm font-bold text-center">
          {webcamError}
        </div>
      )}

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 my-auto py-3">
        {([0, 1] as const).map((idx) => {
          const p = players[idx]
          const colorObj = PLAYER_COLORS.find((c) => c.id === p.colorId) || PLAYER_COLORS[idx]

          return (
            <div
              key={idx}
              className="bg-slate-900/95 border-4 p-4 lg:p-5 pixel-box flex flex-col justify-between gap-4"
              style={{ borderColor: colorObj.primary }}
            >
              {/* Player Name & Color */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-pixel text-sky-300 mb-1">
                    {idx + 1}. MÄNGIJA NIMI
                  </label>
                  <input
                    type="text"
                    maxLength={22}
                    value={p.name}
                    onChange={(e) => onUpdatePlayer(idx, { name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border-2 border-slate-700 focus:border-amber-400 text-white font-bold text-base outline-none"
                    placeholder={`Kapten ${idx + 1}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-pixel text-sky-300 mb-1">VÄRV</label>
                  <div className="flex items-center gap-1.5">
                    {PLAYER_COLORS.map((c) => {
                      const selected = p.colorId === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            sound.playClick()
                            onUpdatePlayer(idx, { colorId: c.id })
                          }}
                          className={`w-7 h-7 border-2 transition-transform ${
                            selected
                              ? 'scale-110 border-white ring-2 ring-amber-300'
                              : 'border-slate-950 opacity-75'
                          }`}
                          style={{ backgroundColor: c.primary }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Active Avatar + Computer Webcam Option */}
              <div className="flex items-center gap-4 bg-slate-950/90 p-3 border-2 border-slate-800">
                {activeWebcamIdx === idx ? (
                  <div className="relative w-28 h-28 border-4 border-amber-400 bg-black shrink-0 overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                ) : (
                  <div
                    className="w-28 h-28 border-4 bg-slate-900 overflow-hidden shrink-0"
                    style={{ borderColor: colorObj.primary }}
                  >
                    <img
                      src={p.captainAvatar}
                      alt={p.name}
                      className="w-full h-full object-contain pixelated"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  {activeWebcamIdx === idx ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => snapWebcamPhoto(idx)}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-xs pixel-btn flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        PILDISTA!
                      </button>
                      <button
                        type="button"
                        onClick={stopWebcam}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold pixel-btn flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Tühista kaamera
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-sky-200 font-semibold">
                        Vali altpoolt Italian Brainrot legend või tee pilt arvuti kaameraga:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openComputerWebcam(idx)}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs pixel-btn flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" />
                          Arvuti kaamera
                        </button>
                        <input
                          ref={fileRefs[idx]}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLocalFile(idx, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileRefs[idx].current?.click()}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold text-xs pixel-btn flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Vali fail
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Ready-made Italian Brainrot Characters Grid */}
              <div>
                <div className="text-xs font-pixel text-amber-300 mb-2">
                  VALMIS ITALIAN BRAINROT TEGELASED:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {BRAINROT_CHARACTERS.map((br) => {
                    const isSelected = p.selectedBrainrotId === br.id && !p.hasCustomPhoto
                    return (
                      <button
                        key={br.id}
                        type="button"
                        onClick={() => {
                          sound.playClick()
                          onUpdatePlayer(idx, {
                            name: br.name,
                            captainAvatar: brainrotAvatars[br.id],
                            selectedBrainrotId: br.id,
                            hasCustomPhoto: false,
                          })
                        }}
                        className={`p-2 bg-slate-950 border-2 text-left flex items-center gap-2 transition-transform ${
                          isSelected
                            ? 'border-amber-400 bg-slate-800 scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={brainrotAvatars[br.id]}
                          alt={br.name}
                          className="w-10 h-10 pixelated border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{br.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{br.tagline}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
