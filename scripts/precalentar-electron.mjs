#!/usr/bin/env node
/**
 * Baja Electron para las dos arquitecturas de Mac ANTES de compilar, con reintentos.
 *
 *   node scripts/precalentar-electron.mjs
 *
 * ---------------------------------------------------------------------------
 * Por qué existe
 * ---------------------------------------------------------------------------
 *
 * electron-builder baja Electron en medio del build, una vez por arquitectura, y
 * no reintenta: un "504 Gateway Time-out" del CDN de releases de GitHub corta
 * todo. Pasó dos veces seguidas el 2026-09-14, la segunda DESPUÉS de haber firmado
 * y notarizado el .app de Apple Silicon, así que se tiró trabajo hecho.
 *
 * electron-builder usa @electron/get con su caché por defecto, y si el zip ya está
 * ahí no sale a la red. Este script lo pone ahí con el mismo @electron/get y la
 * misma versión, reintentando con espera creciente. Junto con la caché del
 * workflow, en las corridas siguientes ni siquiera hace falta bajarlo.
 */
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const { downloadArtifact } = require('@electron/get')
const version = require('electron/package.json').version

const INTENTOS = 6
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

for (const arch of ['arm64', 'x64']) {
  for (let intento = 1; ; intento++) {
    try {
      const ruta = await downloadArtifact({ version, platform: 'darwin', arch, artifactName: 'electron' })
      console.log(`✓ Electron ${version} darwin-${arch} en la caché: ${ruta}`)
      break
    } catch (e) {
      if (intento >= INTENTOS) {
        console.error(`✗ No se pudo bajar Electron ${version} darwin-${arch} después de ${INTENTOS} intentos: ${e.message}`)
        process.exit(1)
      }
      const espera = 15 * intento
      console.log(`  intento ${intento} falló (${e.message}); reintento en ${espera} s`)
      await dormir(espera * 1000)
    }
  }
}
