import React, { useEffect, useRef, useState } from 'react'
import { Camera, Upload, ArrowLeft, Play, X, Users, Ship, QrCode, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { BRAINROT_CHARACTERS, PLAYER_COLORS, PLAYER_COUNT_SLOGANS, type BrainrotId } from '../data/gameContent'
import { convertImageToPixelAvatar, createBrainrotAvatar } from '../utils/pixelAvatar'
import { sound } from '../utils/sound'

export interface PlayerSetupConfig {
  id: number
  team: 0 | 1
  name: string
  colorId: string
  captainAvatar: string
  selectedBrainrotId?: BrainrotId
  hasCustomPhoto: boolean
}

interface SetupModalProps {
  sessionId: string
  playerCount: number
  onChangePlayerCount: (count: number) => void
  players: PlayerSetupConfig[]
  onUpdatePlayer: (index: number, patch: Partial<PlayerSetupConfig>) => void
  onBack: () => void
  onStartGame: () => void
}

export const SetupModal: React.FC<SetupModalProps> = ({
  sessionId,
  playerCount,
  onChangePlayerCount,
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

  const [activeWebcamIdx, setActiveWebcamIdx] = useState<number | null>(null)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [activeQrIdx, setActiveQrIdx] = useState<number | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [lanIp, setLanIp] = useState<string | null>(null)
  const [useLocalLanUrl, setUseLocalLanUrl] = useState<boolean>(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setActiveWebcamIdx(null)
  }

  useEffect(() => {
    // Register session on local dev server if running locally
    fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {})

    fetch('/api/lan-info')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ip && data.ip !== 'localhost') {
          setLanIp(data.ip)
        }
      })
      .catch(() => {})

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [sessionId])

  // Listen for mobile QR avatar uploads (via ntfy.sh HTTPS SSE + JSON poll, local Vite poll, and BroadcastChannel)
  useEffect(() => {
    const seenIds = new Set<string>()
    const seenPayloads = new Set<string>()

    const applyAvatar = (playerNum: number, avatarDataUrl: string) => {
      const idx = playerNum - 1
      if (idx < 0 || idx >= 6 || !avatarDataUrl.startsWith('data:image/')) return
      const sig = `${idx}:${avatarDataUrl.slice(-48)}`
      if (seenPayloads.has(sig)) return
      seenPayloads.add(sig)

      sound.playHit()
      onUpdatePlayer(idx, {
        captainAvatar: avatarDataUrl,
        hasCustomPhoto: true,
        selectedBrainrotId: undefined,
      })
      setActiveQrIdx((curr) => (curr === idx ? null : curr))
    }

    const parseAndApplyNtfyItem = (outer: {
      id?: string
      event?: string
      message?: string
      attachment?: { url?: string }
    }) => {
      if (!outer || outer.event !== 'message') return
      if (outer.id) {
        if (seenIds.has(outer.id)) return
        seenIds.add(outer.id)
      }

      const handleRawJson = (rawText: string) => {
        try {
          const inner = JSON.parse(rawText)
          const pNum = Number(inner?.p ?? inner?.player)
          const imgUrl = String(inner?.img ?? inner?.avatarDataUrl ?? '')
          if (pNum && imgUrl.startsWith('data:image/')) {
            applyAvatar(pNum, imgUrl)
          }
        } catch {
          // Ignore non-JSON
        }
      }

      if (outer.attachment?.url) {
        fetch(outer.attachment.url)
          .then((r) => (r.ok ? r.text() : ''))
          .then((txt) => {
            if (txt) handleRawJson(txt)
          })
          .catch(() => {})
      } else if (outer.message) {
        handleRawJson(outer.message)
      }
    }

    // 1. BroadcastChannel for same-device testing
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('parvepauk_sync')
      bc.onmessage = (ev) => {
        const data = ev.data
        if (data?.type === 'AVATAR_READY' && data.sessionId === sessionId) {
          applyAvatar(Number(data.player), String(data.avatarDataUrl))
        }
      }
    } catch {
      // Ignore
    }

    // 2. Real-time Server-Sent Events via ntfy.sh
    const topicUrl = `https://ntfy.sh/parvepauk_${encodeURIComponent(sessionId)}`
    let es: EventSource | null = null
    try {
      es = new EventSource(`${topicUrl}/sse`)
      es.onmessage = (ev) => {
        try {
          const outer = JSON.parse(ev.data)
          parseAndApplyNtfyItem(outer)
        } catch {
          // Ignore malformed message
        }
      }
    } catch {
      // Ignore if offline
    }

    // 3. Active HTTPS JSON polling + local Vite server polling every 1.5s
    const pollTimer = setInterval(() => {
      // Poll ntfy.sh JSON feed (fallback if browser blocks SSE streams)
      fetch(`${topicUrl}/json?poll=1&since=45s`)
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => {
          if (!text) return
          const lines = text.trim().split('\n')
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              parseAndApplyNtfyItem(JSON.parse(line))
            } catch {
              // Ignore
            }
          }
        })
        .catch(() => {})

      // Poll local Vite server (works on offline local WiFi LAN)
      fetch(`/api/session/poll?session=${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.avatars) {
            Object.entries(data.avatars).forEach(([pKey, url]) => {
              if (typeof url === 'string') {
                applyAvatar(Number(pKey), url)
              }
            })
          }
        })
        .catch(() => {})
    }, 1500)

    return () => {
      if (bc) bc.close()
      if (es) es.close()
      clearInterval(pollTimer)
    }
  }, [sessionId, onUpdatePlayer])

  // Generate QR code DataURL whenever activeQrIdx or link mode changes
  useEffect(() => {
    if (activeQrIdx === null) {
      setQrDataUrl(null)
      return
    }
    const player = players[activeQrIdx]
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    let baseUrl = `${window.location.origin}${window.location.pathname}`
    if (isLocalhost) {
      if (useLocalLanUrl && lanIp) {
        const port = window.location.port ? `:${window.location.port}` : ''
        baseUrl = `http://${lanIp}${port}${window.location.pathname}`
      } else {
        baseUrl = 'https://sherektus.github.io/parvepauk/'
      }
    }

    const mobileUrl = `${baseUrl}?mobile=1&session=${encodeURIComponent(sessionId)}&player=${
      activeQrIdx + 1
    }&name=${encodeURIComponent(player?.name || `Kapten ${activeQrIdx + 1}`)}`

    QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [activeQrIdx, sessionId, players, lanIp, useLocalLanUrl])

  const openComputerWebcam = async (idx: number) => {
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

  const snapWebcamPhoto = (idx: number) => {
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

  const handleLocalFile = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
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

  const activePlayers = players.slice(0, playerCount)

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 flex flex-col justify-between p-4 lg:p-6">
      {/* Top Bar */}
      <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
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
          MÄNGIJATE ARV (2–6) & PAATIDE KAPTENID
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

      {/* Player Count Selector (2 to 6 players) */}
      <div className="max-w-5xl w-full mx-auto my-4 bg-slate-900/95 border-4 border-amber-400 p-4 pixel-box">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-pixel text-xs sm:text-sm">
            <Users className="w-5 h-5" />
            <span>VALI MÄNGIJATE ARV:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[2, 3, 4, 5, 6].map((cnt) => {
              const isSelected = playerCount === cnt
              const label =
                cnt === 2
                  ? '2 (Kahekesi 1v1)'
                  : cnt === 6
                  ? '6 (Tiimid 3v3)'
                  : `${cnt} mängijat`
              return (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => {
                    sound.playClick()
                    stopWebcam()
                    onChangePlayerCount(cnt)
                  }}
                  className={`px-4 py-2 font-extrabold text-sm sm:text-base pixel-btn ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 scale-105'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        <p className="text-base sm:text-lg text-amber-300 font-extrabold mt-3 text-center">
          {PLAYER_COUNT_SLOGANS[playerCount] || 'Seltsis segasem – tuld kõigi pihta! 💥'}
        </p>
      </div>

      {webcamError && (
        <div className="max-w-xl mx-auto mb-3 bg-rose-900/90 border-2 border-rose-400 text-rose-100 px-4 py-2 text-sm font-bold text-center">
          {webcamError}
        </div>
      )}

      {/* Players Grid */}
      <div
        className={`max-w-7xl w-full mx-auto grid gap-4 my-auto py-2 ${
          playerCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {activePlayers.map((p, idx) => {
          const colorObj =
            PLAYER_COLORS.find((c) => c.id === p.colorId) ||
            PLAYER_COLORS[idx % PLAYER_COLORS.length]
          const teamLabel =
            playerCount === 2
              ? `${idx + 1}. MÄNGIJA`
              : p.team === 0
              ? `TIIM 1 (VASAK LAEVASTIK) – PAAT #${idx + 1}`
              : `TIIM 2 (PAREM LAEVASTIK) – PAAT #${idx + 1}`

          return (
            <div
              key={p.id}
              className="bg-slate-900/95 border-4 p-4 pixel-box flex flex-col justify-between gap-3"
              style={{ borderColor: colorObj.primary }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="text-[11px] font-pixel text-amber-300 flex items-center gap-1.5">
                  <Ship className="w-4 h-4" />
                  {teamLabel}
                </span>
                <div className="flex items-center gap-1">
                  {PLAYER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() => {
                        sound.playClick()
                        onUpdatePlayer(idx, { colorId: c.id })
                      }}
                      className={`w-5 h-5 border ${
                        p.colorId === c.id ? 'border-white scale-110 ring-1 ring-amber-300' : 'border-slate-950 opacity-70'
                      }`}
                      style={{ backgroundColor: c.primary }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={22}
                  value={p.name}
                  onChange={(e) => onUpdatePlayer(idx, { name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border-2 border-slate-700 focus:border-amber-400 text-white font-bold text-sm outline-none"
                  placeholder={`Kapten ${idx + 1}`}
                />
              </div>

              {/* Avatar & Webcam */}
              <div className="flex items-center gap-3 bg-slate-950/90 p-2.5 border-2 border-slate-800">
                {activeWebcamIdx === idx ? (
                  <div className="relative w-20 h-20 border-2 border-amber-400 bg-black shrink-0 overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                ) : (
                  <div
                    className="w-20 h-20 border-2 bg-slate-900 overflow-hidden shrink-0"
                    style={{ borderColor: colorObj.primary }}
                  >
                    <img
                      src={p.captainAvatar}
                      alt={p.name}
                      className="w-full h-full object-contain pixelated"
                    />
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  {activeWebcamIdx === idx ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => snapWebcamPhoto(idx)}
                        className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-[10px] pixel-btn flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        PILDISTA!
                      </button>
                      <button
                        type="button"
                        onClick={stopWebcam}
                        className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold pixel-btn flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> Tühista
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick()
                          stopWebcam()
                          setActiveQrIdx(idx)
                        }}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs pixel-btn flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        QR-kood
                      </button>
                      <button
                        type="button"
                        onClick={() => openComputerWebcam(idx)}
                        className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs pixel-btn flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Kaamera
                      </button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[idx] = el
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLocalFile(idx, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold text-xs pixel-btn flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Fail
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Brainrot Character Picker */}
              <div className="grid grid-cols-3 gap-1.5">
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
                      className={`p-1.5 bg-slate-950 border text-left flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-amber-400 bg-slate-800'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={brainrotAvatars[br.id]}
                        alt={br.name}
                        className="w-7 h-7 pixelated shrink-0"
                      />
                      <span className="text-[10px] font-bold text-white truncate">{br.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* QR Code Scanner Modal */}
      {activeQrIdx !== null && players[activeQrIdx] && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border-4 border-amber-400 p-5 pixel-box text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-pixel text-xs text-amber-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                SKANNI TELEFONIGA
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playClick()
                  setActiveQrIdx(null)
                }}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 pixel-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                {players[activeQrIdx].name} ({activeQrIdx + 1}. paat)
              </div>
              <p className="text-xs text-sky-200 mt-1">
                Skanni QR-kood telefoni kaameraga, tee selfie ja pilt ilmub kohe siia mängu!
              </p>
            </div>

            <div className="bg-white p-3 w-56 h-56 mx-auto border-4 border-slate-950 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR-kood pildistamiseks"
                  className="w-full h-full object-contain pixelated"
                />
              ) : (
                <span className="text-xs font-bold text-slate-800">Loon QR-koodi...</span>
              )}
            </div>

            {(window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1') &&
              lanIp && (
                <button
                  type="button"
                  onClick={() => setUseLocalLanUrl((v) => !v)}
                  className="text-[11px] text-amber-300 hover:underline font-semibold block mx-auto"
                >
                  {useLocalLanUrl
                    ? 'Kasuta HTTPS veebilinki (töötab iga võrguga)'
                    : `Või kasuta kohalikku WiFi võrku (${lanIp})`}
                </button>
              )}

            <button
              type="button"
              onClick={() => {
                sound.playClick()
                setActiveQrIdx(null)
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm pixel-btn"
            >
              Sulge
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
