import { isServer } from '@tanstack/start'

let lastError: Error | null = null

export function captureError(err: Error) {
  lastError = err
  console.error('Erro capturado:', err)
}

export function consumeLastCapturedError() {
  const err = lastError
  lastError = null
  return err
}
