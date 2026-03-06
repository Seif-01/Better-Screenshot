import { contextBridge, ipcRenderer } from 'electron'

/** Exposed API for the renderer process */
const api = {
  /** Trigger a fullscreen capture */
  captureFullscreen: (): Promise<void> => ipcRenderer.invoke('capture-fullscreen'),

  /** Trigger an active window capture */
  captureWindow: (): Promise<void> => ipcRenderer.invoke('capture-window'),

  /** Request region capture overlay to appear */
  startRegionCapture: (): void => ipcRenderer.send('start-region-capture'),

  /** Cancel the current capture operation */
  cancelCapture: (): void => ipcRenderer.send('cancel-capture'),

  /** Send the captured region data back to main */
  regionCaptured: (dataUrl: string): void =>
    ipcRenderer.send('region-captured', dataUrl),

  /** Listen for capture mode changes from main process */
  onCaptureMode: (callback: (mode: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, mode: string): void => {
      callback(mode)
    }
    ipcRenderer.on('set-capture-mode', handler)
    return () => {
      ipcRenderer.removeListener('set-capture-mode', handler)
    }
  }
}

// Expose the API to the renderer via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', api)

// Type declaration for the exposed API
export type ElectronAPI = typeof api
