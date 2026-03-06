import CaptureOverlay from './components/CaptureOverlay'

/**
 * Root application component.
 * When the window opens with #overlay hash, it renders the capture overlay.
 * Otherwise, it renders nothing (the app lives in the system tray).
 */
function App(): React.JSX.Element | null {
  const hash = window.location.hash

  // Overlay mode — shown when the user initiates region capture
  if (hash === '#overlay') {
    return <CaptureOverlay />
  }

  // Default: nothing to render (app is tray-only in Phase 1)
  return null
}

export default App
