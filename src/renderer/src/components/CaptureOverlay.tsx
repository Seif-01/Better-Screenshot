import { useState, useCallback, useEffect } from 'react'

interface SelectionRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

/**
 * Fullscreen transparent overlay for region screenshot selection.
 * - Click and drag to select an area
 * - Shows dimensions (W × H) while dragging
 * - Crosshair cursor follows mouse
 * - Dims the area outside the selection
 * - ESC to cancel
 */
function CaptureOverlay(): React.JSX.Element {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [selection, setSelection] = useState<SelectionRect | null>(null)

  /** Handle ESC key to cancel capture */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.electronAPI.cancelCapture()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /** Normalize the selection rectangle (handle dragging in any direction) */
  const getNormalizedRect = (
    sel: SelectionRect
  ): { x: number; y: number; width: number; height: number } => {
    const x = Math.min(sel.startX, sel.endX)
    const y = Math.min(sel.startY, sel.endY)
    const width = Math.abs(sel.endX - sel.startX)
    const height = Math.abs(sel.endY - sel.startY)
    return { x, y, width, height }
  }

  /** Capture the selected region using a hidden canvas */
  const captureRegion = useCallback(
    async (rect: {
      x: number
      y: number
      width: number
      height: number
    }): Promise<void> => {
      try {
        // Hide the overlay before capturing to not include it in the screenshot
        const overlayEl = document.getElementById('capture-overlay')
        if (overlayEl) overlayEl.style.opacity = '0'

        // Small delay to let the overlay disappear
        await new Promise((resolve) => setTimeout(resolve, 50))

        // Request screen capture via getUserMedia (works in Electron)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              minWidth: window.screen.width,
              minHeight: window.screen.height,
              maxWidth: window.screen.width,
              maxHeight: window.screen.height
            }
          } as MediaTrackConstraints
        })

        const video = document.createElement('video')
        video.srcObject = stream
        await video.play()

        // Create a canvas to draw the full frame
        const fullCanvas = document.createElement('canvas')
        fullCanvas.width = window.screen.width
        fullCanvas.height = window.screen.height
        const fullCtx = fullCanvas.getContext('2d')

        if (!fullCtx) throw new Error('Could not get canvas context')

        fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height)

        // Stop the stream
        stream.getTracks().forEach((track) => track.stop())

        // Crop the selected region accounting for device pixel ratio
        const dpr = window.devicePixelRatio || 1
        const croppedCanvas = document.createElement('canvas')
        croppedCanvas.width = rect.width * dpr
        croppedCanvas.height = rect.height * dpr
        const cropCtx = croppedCanvas.getContext('2d')

        if (!cropCtx) throw new Error('Could not get crop canvas context')

        cropCtx.drawImage(
          fullCanvas,
          rect.x * dpr,
          rect.y * dpr,
          rect.width * dpr,
          rect.height * dpr,
          0,
          0,
          rect.width * dpr,
          rect.height * dpr
        )

        const dataUrl = croppedCanvas.toDataURL('image/png')
        window.electronAPI.regionCaptured(dataUrl)
      } catch (err) {
        console.error('Region capture failed:', err)
        window.electronAPI.cancelCapture()
      }
    },
    []
  )

  /** Track mouse position for crosshair */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent): void => {
      setMousePos({ x: e.clientX, y: e.clientY })

      if (isDragging) {
        setSelection((prev) =>
          prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null
        )
      }
    },
    [isDragging]
  )

  /** Start region selection on mouse down */
  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    if (e.button !== 0) return // Only left click
    setIsDragging(true)
    setSelection({
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY
    })
  }, [])

  /** Complete region selection on mouse up */
  const handleMouseUp = useCallback((): void => {
    if (!isDragging || !selection) return
    setIsDragging(false)

    const rect = getNormalizedRect(selection)

    // Minimum selection size (at least 5x5 pixels)
    if (rect.width < 5 || rect.height < 5) {
      setSelection(null)
      return
    }

    captureRegion(rect)
  }, [isDragging, selection, captureRegion])

  // Calculate normalized selection for rendering
  const normalizedRect = selection ? getNormalizedRect(selection) : null

  // Generate clip-path to dim everything except the selection
  const clipPath = normalizedRect
    ? `polygon(
        0% 0%,
        0% 100%,
        ${normalizedRect.x}px 100%,
        ${normalizedRect.x}px ${normalizedRect.y}px,
        ${normalizedRect.x + normalizedRect.width}px ${normalizedRect.y}px,
        ${normalizedRect.x + normalizedRect.width}px ${normalizedRect.y + normalizedRect.height}px,
        ${normalizedRect.x}px ${normalizedRect.y + normalizedRect.height}px,
        ${normalizedRect.x}px 100%,
        100% 100%,
        100% 0%
      )`
    : undefined

  return (
    <div
      id="capture-overlay"
      className="overlay-container animate-fade-in"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Dim overlay — covers everything except the selection */}
      <div
        className="overlay-dim"
        style={clipPath ? { clipPath } : undefined}
      />

      {/* Crosshair lines (hide while dragging for clarity) */}
      {!isDragging && (
        <>
          <div className="crosshair-h" style={{ top: mousePos.y }} />
          <div className="crosshair-v" style={{ left: mousePos.x }} />
        </>
      )}

      {/* Selection rectangle */}
      {normalizedRect && normalizedRect.width > 0 && normalizedRect.height > 0 && (
        <div
          className="overlay-selection"
          style={{
            left: normalizedRect.x,
            top: normalizedRect.y,
            width: normalizedRect.width,
            height: normalizedRect.height
          }}
        />
      )}

      {/* Dimension label */}
      {isDragging && normalizedRect && (
        <div
          className="dimension-label"
          style={{
            left: normalizedRect.x + normalizedRect.width + 10,
            top: normalizedRect.y + normalizedRect.height + 10
          }}
        >
          {normalizedRect.width} × {normalizedRect.height}
        </div>
      )}

      {/* Instruction hint */}
      {!isDragging && (
        <div className="capture-hint">
          Click and drag to select a region · Press ESC to cancel
        </div>
      )}
    </div>
  )
}

export default CaptureOverlay
