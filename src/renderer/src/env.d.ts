/** Type declarations for the Electron API exposed via preload */
interface ElectronAPI {
  captureFullscreen: () => Promise<void>
  captureWindow: () => Promise<void>
  startRegionCapture: () => void
  cancelCapture: () => void
  regionCaptured: (dataUrl: string) => void
  onCaptureMode: (callback: (mode: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
