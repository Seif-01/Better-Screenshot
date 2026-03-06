import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  clipboard,
  nativeImage,
  screen
} from 'electron'
import { join } from 'path'
import { createTray } from './tray'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { saveScreenshot } from './storage'

let overlayWindow: BrowserWindow | null = null

/** Creates the transparent fullscreen overlay for region selection */
function createOverlayWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true)

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#overlay`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'overlay' })
  }

  return win
}

/** Captures the full screen and returns a base64 PNG data URL */
async function captureFullScreen(): Promise<string | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    if (sources.length === 0) return null

    const source = sources[0]
    const image = source.thumbnail
    return image.toDataURL()
  } catch (error) {
    console.error('Failed to capture screen:', error)
    return null
  }
}

/** Captures the active window */
async function captureActiveWindow(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 }
    })

    // The focused window is typically the first one
    // We skip our own windows
    const source = sources.find(
      (s) => !s.name.includes('SnapSpector') && !s.name.includes('Overlay')
    )

    if (!source) return null

    const image = source.thumbnail
    return image.toDataURL()
  } catch (error) {
    console.error('Failed to capture window:', error)
    return null
  }
}

/** Processes a captured screenshot — copies to clipboard and saves to disk */
async function processCapture(dataUrl: string): Promise<void> {
  // Copy to clipboard
  const image = nativeImage.createFromDataURL(dataUrl)
  clipboard.writeImage(image)

  // Auto-save to disk
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')
  await saveScreenshot(buffer)
}

// ─── IPC Handlers ───────────────────────────────────────────────

/** Handle fullscreen capture request */
async function handleFullscreenCapture(): Promise<void> {
  const dataUrl = await captureFullScreen()
  if (dataUrl) {
    await processCapture(dataUrl)
  }
}

/** Handle active window capture request */
async function handleWindowCapture(): Promise<void> {
  const dataUrl = await captureActiveWindow()
  if (dataUrl) {
    await processCapture(dataUrl)
  }
}

/** Show the region selection overlay */
function handleRegionCapture(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close()
  }
  overlayWindow = createOverlayWindow()
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

// ─── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
  // Register IPC handlers
  ipcMain.handle('capture-fullscreen', handleFullscreenCapture)
  ipcMain.handle('capture-window', handleWindowCapture)
  ipcMain.on('start-region-capture', handleRegionCapture)

  ipcMain.on('cancel-capture', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close()
    }
  })

  // Handle region capture complete — receives the cropped region as data URL
  ipcMain.on('region-captured', async (_event, dataUrl: string) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close()
    }
    await processCapture(dataUrl)
  })

  // Create system tray
  createTray({
    onRegionCapture: handleRegionCapture,
    onFullscreenCapture: handleFullscreenCapture,
    onWindowCapture: handleWindowCapture
  })

  // Register global hotkeys
  registerHotkeys({
    onRegionCapture: handleRegionCapture,
    onFullscreenCapture: handleFullscreenCapture,
    onWindowCapture: handleWindowCapture
  })
})

app.on('will-quit', () => {
  unregisterHotkeys()
})

// Prevent app from quitting when all windows close (it lives in the tray)
app.on('window-all-closed', () => {
  // Do nothing — app should keep running in the tray
})
