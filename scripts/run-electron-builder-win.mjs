import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const args = process.argv.slice(2)
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
const buildId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
const outputDir = `release/${packageJson.version}-${buildId}`

if (process.platform !== 'win32') {
  console.error('Windows packaging script only supports win32 hosts.')
  process.exit(1)
}

await runCommand('npm.cmd', ['run', 'build'], projectRoot)
await runCommand(
  join(projectRoot, 'node_modules', '.bin', 'electron-builder.cmd'),
  ['--config', 'electron-builder.json5', `--config.directories.output=${outputDir}`, '--win', ...args],
  projectRoot,
)

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
