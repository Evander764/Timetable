import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(projectRoot, 'out')
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

