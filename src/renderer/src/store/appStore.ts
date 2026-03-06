import { create } from 'zustand'

type CaptureMode = 'idle' | 'region' | 'fullscreen' | 'window'

interface AppState {
  /** Current capture mode */
  captureMode: CaptureMode
  /** Last captured screenshot as data URL */
  lastScreenshot: string | null
  /** Whether the app is currently capturing */
  isCapturing: boolean

  /** Actions */
  setCaptureMode: (mode: CaptureMode) => void
  setLastScreenshot: (dataUrl: string | null) => void
  setIsCapturing: (capturing: boolean) => void
  reset: () => void
}

/** Global app state managed by Zustand */
export const useAppStore = create<AppState>((set) => ({
  captureMode: 'idle',
  lastScreenshot: null,
  isCapturing: false,

  setCaptureMode: (mode) => set({ captureMode: mode }),
  setLastScreenshot: (dataUrl) => set({ lastScreenshot: dataUrl }),
  setIsCapturing: (capturing) => set({ isCapturing: capturing }),
  reset: () =>
    set({
      captureMode: 'idle',
      lastScreenshot: null,
      isCapturing: false
    })
}))
