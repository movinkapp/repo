/// <reference path="./deno.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')!
const cloudKey = Deno.env.get('CLOUDINARY_API_KEY')!
const cloudSecret = Deno.env.get('CLOUDINARY_API_SECRET')!

const ALLOWED_ORIGINS = ['https://movinkapp.vercel.app', 'http://localhost:5173']
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin'
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
  })
}

// Only URLs that belong to OUR Cloudinary cloud are ever deleted.
function publicIdFromUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts[0] !== cloudName || parts[1] !== 'image' || parts[2] !== 'upload') return null
    let rest = parts.slice(3)
    if (rest.length > 0 && /^v\d+$/.test(rest[0])) rest = rest.slice(1)
    if (rest.length === 0) return null
    return decodeURIComponent(rest.join('/')).replace(/\.[A-Za-z0-9]+$/, '')
  } catch {
    return null
  }
}

async function deleteCloudinaryImages(publicIds: string[]) {
  const auth = 'Basic ' + btoa(`${cloudKey}:${cloudSecret}`)
  const send = (ids: string[], invalidate: boolean) => {
    const body = new URLSearchParams()
    ids.forEach((id) => body.append('public_ids[]', id))
    if (invalidate) body.append('invalidate', 'true')
    return fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`, {
      method: 'DELETE',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
  }
  for (let i = 0; i < publicIds.length; i += 100) {
    const chunk = publicIds.slice(i, i + 100)
    let res = await send(chunk, true)
    if (!res.ok) res = await send(chunk, false)
    if (!res.ok) throw new Error(`cloudinary delete failed: ${res.status}`)
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  // The user id ALWAYS comes from the verified token, never from the request body.
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Unauthorized' }, 401, origin)
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401, origin)

  let payload: { confirm?: string } = {}
  try { payload = await req.json() } catch { /* empty body */ }
  if (payload.confirm !== 'DELETE') return json({ error: 'Confirmation required' }, 400, origin)

  try {
    // 1) collect this user's image URLs
    const { data: rows, error: readErr } = await admin
      .from('sessions')
      .select('project_image, ref_images, spots!inner(user_id)')
      .eq('spots.user_id', user.id)
    if (readErr) throw readErr

    const ids = new Set<string>()
    for (const r of rows ?? []) {
      const a = publicIdFromUrl(r.project_image)
      if (a) ids.add(a)
      for (const u of r.ref_images ?? []) {
        const b = publicIdFromUrl(u)
        if (b) ids.add(b)
      }
    }

    // 2) images first: if this fails nothing else is deleted and the user can retry
    if (ids.size > 0) await deleteCloudinaryImages([...ids])

    // 3) profile row; cascades to spots, sessions and costs
    const { error: profileErr } = await admin.from('users').delete().eq('id', user.id)
    if (profileErr) throw profileErr

    // 4) waitlist entry with the same email
    if (user.email) {
      const { error: wlErr } = await admin.from('waitlist').delete().eq('email', user.email.toLowerCase())
      if (wlErr) throw wlErr
    }

    // 5) auth user; cascades to simulations and push_subscriptions
    const { error: authErr } = await admin.auth.admin.deleteUser(user.id)
    if (authErr) throw authErr

    return json({ ok: true }, 200, origin)
  } catch (e) {
    console.error('delete-account failed:', e)
    return json({ error: 'Could not delete account. Please try again.' }, 500, origin)
  }
})
