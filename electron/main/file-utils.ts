import fs from 'node:fs'
import path from 'node:path'

export function readJsonObject(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw) as Record<string, unknown>
}

export function backupIfExists(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const bak = `${filePath}.bak.${Date.now()}`
  fs.copyFileSync(filePath, bak)
}

export function atomicWriteJson(filePath: string, data: unknown) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  const base = path.basename(filePath)
  const tmp = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`)
  const content = `${JSON.stringify(data, null, 2)}\n`
  fs.writeFileSync(tmp, content, 'utf8')
  fs.renameSync(tmp, filePath)
}
