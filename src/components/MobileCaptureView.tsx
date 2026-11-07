import React, { useEffect, useRef, useState } from 'react'
import { Camera, Check, RefreshCw, ZoomIn, Move, AlertTriangle } from 'lucide-react'
import { convertImageToPixelAvatar } from '../utils/pixelAvatar'

interface MobileCaptureViewProps {
  sessionId: string
  playerNumber: number
  playerName?: string
}

export const MobileCaptureView: React.FC<MobileCaptureViewProps> = ({
  sessionId,
  playerNumber,
  playerName,
}) => {
  const [expired, setExpired] = useState(false)
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<'capture' | 'crop_preview' | 'sent'>('capture')
  const [cameraActive, setCameraActive] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Raw captured image kept strictly in memory and cleared after confirmation
  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState({ offsetX: 0, offsetY: 0, zoom: 1.2 })
  const [pixelPreview, setPixelPreview] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/session/status?session=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        if (data.expired) {
          setExpired(true)
        }
        setChecking(false)
      })
      .catch(() => {
        if (mounted) setChecking(false)
      })

    return () => {
      mounted = false
      stopCameraStream()
    }
  }, [sessionId])

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const startLiveCamera = async () => {
    setErrorMsg(null)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback directly to native phone camera input (works over HTTP LAN IP)
      fileInputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 50)
    } catch {
      // If browser blocks live stream over LAN HTTP, trigger native camera capture
      fileInputRef.current?.click()
    }
  }

  const snapFromLiveVideo = () => {
    if (!videoRef.current) return
    const v = videoRef.current
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = v.videoWidth || 480
    tempCanvas.height = v.videoHeight || 480
    const ctx = tempCanvas.getContext('2d')!
    ctx.drawImage(v, 0, 0, tempCanvas.width, tempCanvas.height)
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9)
    stopCameraStream()

    const img = new Image()
    img.onload = () => {
      setRawImage(img)
      setCrop({ offsetX: 0, offsetY: 0, zoom: 1.25 })
      setStep('crop_preview')
    }
    img.src = dataUrl
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg(null)
    const objUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      // Revoke temporary object URL immediately so nothing persists
      URL.revokeObjectURL(objUrl)
      setRawImage(img)
      setCrop({ offsetX: 0, offsetY: 0, zoom: 1.25 })
      setStep('crop_preview')
    }
    img.onerror = () => {
      URL.revokeObjectURL(objUrl)
      setErrorMsg('Pildi lugemine ebaõnnestus. Proovi uuesti.')
    }
    img.src = objUrl
    e.target.value = ''
  }

  // Recompute pixel-art avatar preview whenever rawImage or crop changes
  useEffect(() => {
    if (!rawImage || step !== 'crop_preview') return
    const pixelUrl = convertImageToPixelAvatar(rawImage, crop, 48, 240)
    setPixelPreview(pixelUrl)
  }, [rawImage, crop, step])

  const handleRetake = () => {
    setRawImage(null)
    setPixelPreview(null)
    setErrorMsg(null)
    setStep('capture')
  }

  const handleConfirmAvatar = async () => {
    if (!pixelPreview) return
    setSending(true)
    setErrorMsg(null)
    try {
      // Ensure compact inline payload (< 3.5 KB) so ntfy.sh never turns it into a file attachment
      let compactAvatar = pixelPreview
      if (compactAvatar.length > 3500 && rawImage) {
        compactAvatar = convertImageToPixelAvatar(rawImage, crop, 36, 36)
      }
      if (compactAvatar.length > 3500 && rawImage) {
        compactAvatar = convertImageToPixelAvatar(rawImage, crop, 28, 28)
      }

      const payload = {
        type: 'AVATAR_READY',
        sessionId,
        player: playerNumber,
        avatarDataUrl: compactAvatar,
      }

      let deliveredOk = false

      // 1. Try local Vite relay (works when phone & PC are on same WiFi LAN)
      try {
        const res = await fetch('/api/session/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.status === 410) {
          setExpired(true)
          setRawImage(null)
          setPixelPreview(null)
          setSending(false)
          return
        }
        if (res.ok) {
          deliveredOk = true
        }
      } catch {
        // Ignore if running on static GitHub Pages
      }

      // 2. Also send via public HTTPS relay so QR works anywhere (GitHub Pages, 4G/5G, or WiFi)
      try {
        const ntfyRes = await fetch(`https://ntfy.sh/parvepauk_${encodeURIComponent(sessionId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({
            p: playerNumber,
            img: compactAvatar,
          }),
        })
        if (ntfyRes.ok) {
          deliveredOk = true
        }
      } catch {
        // Ignore if offline LAN
      }

      // 3. Also broadcast locally in case user opened the link on the same computer
      try {
        const bc = new BroadcastChannel('parvepauk_sync')
        bc.postMessage(payload)
        bc.close()
      } catch {
        // Ignore if BroadcastChannel unsupported
      }

      if (!deliveredOk) {
        throw new Error('Saatmine ebaõnnestus')
      }

      // Immediately delete temporary images from phone memory after sending
      setRawImage(null)
      setPixelPreview(null)
      setStep('sent')
    } catch {
      setErrorMsg('Ühendus mänguga ebaõnnestus. Kontrolli interneti või WiFi ühendust.')
    } finally {
      setSending(false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: crop.offsetX,
      oy: crop.offsetY,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    const dx = (e.clientX - dragStartRef.current.x) / 90
    const dy = (e.clientY - dragStartRef.current.y) / 90
    setCrop((prev) => ({
      ...prev,
      offsetX: Math.max(-1, Math.min(1, dragStartRef.current!.ox + dx)),
      offsetY: Math.max(-1, Math.min(1, dragStartRef.current!.oy + dy)),
    }))
  }

  const handlePointerUp = () => {
    dragStartRef.current = null
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-sky-950 text-white flex items-center justify-center p-6">
        <p className="font-pixel text-sm text-amber-300">Ühendan mänguga...</p>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-sky-950 text-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-slate-900 border-4 border-rose-500 p-6 text-center pixel-box">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h1 className="font-pixel text-base text-rose-300 mb-3">QR-kood on aegunud</h1>
          <p className="text-slate-200 text-base">
            See mänguseanss on lõppenud või suletud. Alusta arvutis uus mäng, et luua uus QR-kood.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-sky-950 to-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/95 border-4 border-amber-400 p-5 pixel-box">
        <div className="text-center mb-4">
          <h1 className="font-pixel text-lg text-amber-300">PARVEPAUK</h1>
          <p className="text-sky-200 font-bold text-lg mt-1">
            {playerName ? `Kapten: ${playerName}` : `${playerNumber}. mängija pikslikapten`}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />

        {errorMsg && (
          <div className="bg-rose-900/90 border-2 border-rose-400 text-rose-100 px-3 py-2 mb-4 text-sm text-center font-semibold">
            {errorMsg}
          </div>
        )}

        {step === 'capture' && (
          <div className="space-y-4">
            {cameraActive ? (
              <div className="space-y-3">
                <div className="relative aspect-square w-full max-w-[260px] mx-auto border-4 border-sky-400 overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
                <button
                  onClick={snapFromLiveVideo}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  TEE PILT
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-slate-200 text-base">
                  Tee endast pilt. Pilt muudetakse otse telefonis teravaks pikslikunsti kapteniks!
                </p>
                <button
                  onClick={startLiveCamera}
                  className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-sm pixel-btn flex items-center justify-center gap-3"
                >
                  <Camera className="w-5 h-5" />
                  AVA KAAMERA
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold text-base pixel-btn"
                >
                  Vali või pildista telefoni kaameraga
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'crop_preview' && pixelPreview && (
          <div className="space-y-4">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-48 h-48 mx-auto border-4 border-amber-400 bg-slate-950 touch-none cursor-move select-none"
            >
              <img
                src={pixelPreview}
                alt="Pikslikapteni eelvaade"
                className="w-full h-full object-contain pixelated pointer-events-none"
              />
              <div className="absolute bottom-1 right-1 bg-slate-950/85 px-2 py-0.5 text-xs text-amber-300 flex items-center gap-1">
                <Move className="w-3 h-3" /> Lohista kärpimiseks
              </div>
            </div>

            <div className="bg-slate-800/90 p-3 border-2 border-slate-700 space-y-2">
              <label className="flex items-center justify-between text-sm text-sky-200 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-4 h-4 text-amber-400" />
                  Kärpimine / Suurendus
                </span>
                <span>{Math.round(crop.zoom * 100)}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="2.6"
                step="0.05"
                value={crop.zoom}
                onChange={(e) => setCrop((c) => ({ ...c, zoom: parseFloat(e.target.value) }))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleRetake}
                disabled={sending}
                className="py-3.5 px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-base pixel-btn flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tee uuesti
              </button>
              <button
                onClick={handleConfirmAvatar}
                disabled={sending}
                className="py-3.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base pixel-btn flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {sending ? 'Saadan...' : 'Kasuta tegelasena'}
              </button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className="text-center space-y-4 py-3">
            <div className="w-16 h-16 bg-emerald-500 text-slate-950 mx-auto flex items-center justify-center pixel-box">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <h2 className="font-pixel text-base text-emerald-300">Kapten saadetud!</h2>
            <p className="text-slate-200 text-base">
              Sinu pikslikapten on nüüd arvutiekraanil parve peal valmis. Ajutine pildifail kustutati telefonist.
            </p>
            <button
              onClick={handleRetake}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold text-sm pixel-btn"
            >
              Tee uus pilt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
