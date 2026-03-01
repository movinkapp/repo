import { supabase } from '$lib/supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function requestNotificationPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'not_supported' }
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'not_supported' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' }
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const existing = await reg.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    let subscription = null
    let attempts = 0
    while (!subscription && attempts < 3) {
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      } catch (e) {
        attempts++
        if (attempts >= 3) throw e
        await new Promise(r => setTimeout(r, 800))
      }
    }

    let user
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch (e) {
      return { ok: false, reason: 'error' }
    }

    if (!user) return { ok: false, reason: 'error' }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      subscription: subscription.toJSON()
    }, { onConflict: 'user_id' })

    if (error) return { ok: false, reason: 'db_error' }

    return { ok: true }
  } catch (e) {
    return { ok: false, reason: 'error', detail: e.message }
  }
}

export async function isNotificationsEnabled() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

export async function disableNotifications() {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (reg) {
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  }
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
}
