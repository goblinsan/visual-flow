import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Derive version from package.json at build time so we can surface in About modal.
const __dirname = dirname(fileURLToPath(import.meta.url))
let pkgVersion = '0.0.0'
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
  if (typeof pkg.version === 'string') pkgVersion = pkg.version
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[vite config] failed to read package.json version:', e)
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkgVersion),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})
