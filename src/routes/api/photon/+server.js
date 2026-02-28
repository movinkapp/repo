export async function GET({ url }) {
  const q = url.searchParams.get('q') || ''
  // Return empty features quickly for empty queries
  if (!q) {
    return new Response(JSON.stringify({ features: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const upstream = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&layer=city`
  try {
    const res = await fetch(upstream)
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ features: [] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
