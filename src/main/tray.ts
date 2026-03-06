import { Tray, Menu, nativeImage, app, shell } from 'electron'
import { join } from 'path'
import { getScreenshotsDir } from './storage'

interface TrayCallbacks {
  onRegionCapture: () => void
  onFullscreenCapture: () => Promise<void>
  onWindowCapture: () => Promise<void>
}

let tray: Tray | null = null

/** Creates the system tray icon and context menu */
export function createTray(callbacks: TrayCallbacks): void {
  // Create a 16x16 tray icon programmatically (camera icon)
  const iconPath = join(__dirname, '../../resources/icon.png')
  let trayIcon: nativeImage

  try {
    trayIcon = nativeImage.createFromPath(iconPath)
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
  } catch {
    // Fallback: create a simple colored icon
    trayIcon = nativeImage.createEmpty()
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('SnapSpector')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📷 Capture Region',
      accelerator: 'Ctrl+Shift+S',
      click: () => callbacks.onRegionCapture()
    },
    {
      label: '🖥️ Fullscreen',
      accelerator: 'Ctrl+Shift+F',
      click: () => { callbacks.onFullscreenCapture() }
    },
    {
      label: '📱 Active Window',
      accelerator: 'Ctrl+Shift+W',
      click: () => { callbacks.onWindowCapture() }
    },
    {
      label: '⏱️ Delayed Capture',
      submenu: [
        {
          label: '3 seconds',
          click: () => {
            setTimeout(() => { callbacks.onFullscreenCapture() }, 3000)
          }
        },
        {
          label: '5 seconds',
          click: () => {
            setTimeout(() => { callbacks.onFullscreenCapture() }, 5000)
          }
        },
        {
          label: '10 seconds',
          click: () => {
            setTimeout(() => { callbacks.onFullscreenCapture() }, 10000)
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: '📁 Open Screenshots Folder',
      click: () => {
        const dir = getScreenshotsDir()
        shell.openPath(dir)
      }
    },
    {
      label: '📋 History',
      enabled: false, // Phase 3
      click: () => { /* TODO: Phase 3 */ }
    },
    {
      label: '⚙️ Settings',
      enabled: false, // Phase 3
      click: () => { /* TODO: Phase 3 */ }
    },
    { type: 'separator' },
    {
      label: '❌ Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}
