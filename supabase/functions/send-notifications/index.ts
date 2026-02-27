/// <reference path="./deno.d.ts" />

import webpush from 'npm:web-push'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidMailto = Deno.env.get('VAPID_MAILTO')!

webpush.setVapidDetails(vapidMailto, vapidPublic, vapidPrivate)

async function db(path: string, options?: RequestInit) {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  })
}

Deno.serve(async () => {
  const today = new Date().toISOString().split('T')[0]

  // Busca todos os spots futuros/ativos com subscriptions ativas
  const spotsRes = await db(`spots?select=*,users!inner(id)&start_date=gte.${today}`)
  const spots = await spotsRes.json()

  const subsRes = await db('push_subscriptions?select=*')
  const subscriptions = await subsRes.json()

  const notifications: { subscription: object, title: string, body: string, url: string }[] = []

  for (const spot of spots) {
    const startDate = new Date(spot.start_date)
    const diffDays = Math.ceil((startDate.getTime() - Date.now()) / 86400000)

    const sub = subscriptions.find((s: { user_id: string }) => s.user_id === spot.user_id)
    if (!sub) continue

    // D-7: voo
    if (diffDays === 7 && !spot.check_flight) {
      notifications.push({
        subscription: sub.subscription,
        title: `✈️ ${spot.studio_name} in 7 days`,
        body: 'Have you booked your flight yet?',
        url: `/spots/${spot.id}`
      })
    }

    // D-3: sessões em falta
    if (diffDays === 3) {
      const sessionsRes = await db(`sessions?spot_id=eq.${spot.id}&select=id`)
      const sessions = await sessionsRes.json()
      if (sessions.length === 0) {
        notifications.push({
          subscription: sub.subscription,
          title: `📅 ${spot.studio_name} in 3 days`,
          body: 'No sessions logged yet. Are your clients confirmed?',
          url: `/spots/${spot.id}`
        })
      }
    }

    // D-1: checklist incompleto
    if (diffDays === 1) {
      const checklistKeys = [
        'check_flight', 'check_accommodation', 'check_studio_address',
        'check_clients_notified', 'check_deposits', 'check_gear', 'check_contract'
      ]
      const incomplete = checklistKeys.filter(k => !spot[k]).length
      if (incomplete > 0) {
        notifications.push({
          subscription: sub.subscription,
          title: `⚡ Tomorrow: ${spot.studio_name}`,
          body: `${incomplete} checklist item${incomplete > 1 ? 's' : ''} still pending.`,
          url: `/spots/${spot.id}`
        })
      }
    }
  }

  // Envia todas as notificações
  const results = await Promise.allSettled(
    notifications.map(n =>
        webpush.sendNotification(
          n.subscription as any,
          JSON.stringify({ title: n.title, body: n.body, url: n.url })
        )
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return new Response(JSON.stringify({ sent, failed, total: notifications.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})