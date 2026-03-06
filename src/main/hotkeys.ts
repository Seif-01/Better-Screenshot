import { globalShortcut } from 'electron'

interface HotkeyCallbacks {
  onRegionCapture: () => void
  onFullscreenCapture: () => Promise<void>
  onWindowCapture: () => Promise<void>
}

/** Registers global hotkeys for screenshot capture */
export function registerHotkeys(callbacks: HotkeyCallbacks): void {
  // Ctrl+Shift+S → Region select
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    callbacks.onRegionCapture()
  })

  // Ctrl+Shift+F → Fullscreen capture
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    callbacks.onFullscreenCapture()
  })

  // Ctrl+Shift+W → Active window capture
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    callbacks.onWindowCapture()
  })

  // PrintScreen → Quick fullscreen to clipboard
  globalShortcut.register('PrintScreen', () => {
    callbacks.onFullscreenCapture()
  })

  console.log('Global hotkeys registered:')
  console.log('  Ctrl+Shift+S → Region capture')
  console.log('  Ctrl+Shift+F → Fullscreen capture')
  console.log('  Ctrl+Shift+W → Active window capture')
  console.log('  PrintScreen  → Quick fullscreen')
}

/** Unregisters all global hotkeys */
export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
  console.log('All global hotkeys unregistered')
}
