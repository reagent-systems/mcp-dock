import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const execFileAsync = promisify(execFile)

const ROOT = path.join(import.meta.dirname, '..')
const inputLogo = path.join(ROOT, 'src/assets/5_uDAxsL_400x400.jpg')
const outDir = path.join(ROOT, 'build')
const outPng = path.join(outDir, 'icon.png')
const outIco = path.join(outDir, 'icon.ico')
const outIcns = path.join(outDir, 'icon.icns')

async function main() {
  await fs.mkdir(outDir, { recursive: true })

  const baseSize = 1024
  const composed = await sharp(inputLogo)
    // Ensure a square icon canvas and avoid introducing any background color.
    .resize(baseSize, baseSize, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  await fs.writeFile(outPng, composed)

  // NSIS is picky: include only standard ICO sizes up to 256x256.
  const icoSizes = [16, 24, 32, 48, 64, 128, 256]
  const icoPngs = await Promise.all(icoSizes.map((s) => sharp(composed).resize(s, s).png().toBuffer()))
  const ico = await pngToIco(icoPngs)
  await fs.writeFile(outIco, ico)

  if (process.platform === 'darwin') {
    const iconsetDir = path.join(outDir, 'icon.iconset')
    await fs.rm(iconsetDir, { recursive: true, force: true })
    await fs.mkdir(iconsetDir, { recursive: true })

    const sizes = [16, 32, 64, 128, 256, 512, 1024]
    for (const s of sizes) {
      const oneX = await sharp(composed).resize(s, s).png().toBuffer()
      const twoX = await sharp(composed).resize(s * 2, s * 2).png().toBuffer()
      await fs.writeFile(path.join(iconsetDir, `icon_${s}x${s}.png`), oneX)
      await fs.writeFile(path.join(iconsetDir, `icon_${s}x${s}@2x.png`), twoX)
    }

    await execFileAsync('iconutil', ['-c', 'icns', iconsetDir, '-o', outIcns])
    await fs.rm(iconsetDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

