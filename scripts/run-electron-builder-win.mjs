import { constants } from 'node:fs'
import { access, lstat, mkdir, readFile, readlink, rm, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const aliasRoot = join(tmpdir(), 'timeable-builder-link')
const args = process.argv.slice(2)
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
const buildId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const outputDir = `release/${packageJson.version}-${buildId}`

if (process.platform !== 'win32') {
  console.error('Windows packaging script only supports win32 hosts.')
  process.exit(1)
}

await ensureAliasPath(aliasRoot, projectRoot)
await runCommand('npm.cmd', ['run', 'build'], aliasRoot)
await runCommand(
  join(aliasRoot, 'node_modules', '.bin', 'electron-builder.cmd'),
  ['--config', 'electron-builder.json5', `--config.directories.output=${outputDir}`, '--win', ...args],
  aliasRoot,
)

async function ensureAliasPath(aliasPath, targetPath) {
  await mkdir(dirname(aliasPath), { recursive: true })

  try {
    const stat = await lstat(aliasPath)
    if (stat.isSymbolicLink()) {
      const linkedTarget = await readlink(aliasPath)
      if (normalizePath(linkedTarget) === normalizePath(targetPath)) {
        return
      }
    }

    await rm(aliasPath, { recursive: true, force: true })
  } catch {
    // Alias does not exist yet.
  }

  await symlink(targetPath, aliasPath, 'junction')
  await access(aliasPath, constants.R_OK)
}

function normalizePath(input) {
  return input.replaceAll('/', '\\').toLowerCase()
}

function runCommand(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const isCmd = command.toLowerCase().endsWith('.cmd')
    const child = spawn(isCmd ? 'cmd.exe' : command, isCmd ? ['/d', '/s', '/c', command, ...commandArgs] : commandArgs, {
      cwd,
      stdio: 'inherit',
      windowsHide: false,
      shell: false,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} exited with code ${code ?? 'unknown'}`))
    })
  })
}
