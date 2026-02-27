import { writable } from 'svelte/store'

export const toasts = writable([])

let id = 0

export function toast(message, type = 'success', duration = 3000) {
  const current = ++id
  toasts.update(t => [...t, { id: current, message, type }])
  setTimeout(() => {
    toasts.update(t => t.filter(x => x.id !== current))
  }, duration)
}

export function toastConfirm(message, onConfirm) {
  const current = ++id
  toasts.update(t => [...t, {
    id: current,
    message,
    type: 'confirm',
    onConfirm: () => {
      toasts.update(t => t.filter(x => x.id !== current))
      onConfirm()
    },
    onCancel: () => {
      toasts.update(t => t.filter(x => x.id !== current))
    }
  }])
}