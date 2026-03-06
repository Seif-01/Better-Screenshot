import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'

/** Returns the default screenshots directory path (~/Screenshots) */
export function getScreenshotsDir(): string {
  const homeDir = app.getPath('home')
  const screenshotsDir = join(homeDir, 'Screenshots')
  return screenshotsDir
}

/** Ensures the screenshots directory exists, creates it if needed */
function ensureScreenshotsDir(): string {
  const dir = getScreenshotsDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/** Generates a timestamped filename: screenshot_YYYY-MM-DD_HH-mm-ss.png */
function generateFilename(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `screenshot_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.png`
}

/** Saves a screenshot buffer to the screenshots directory */
export async function saveScreenshot(buffer: Buffer): Promise<string> {
  const dir = ensureScreenshotsDir()
  const filename = generateFilename()
  const filepath = join(dir, filename)

  writeFileSync(filepath, buffer)
  console.log(`Screenshot saved: ${filepath}`)

  return filepath
}
