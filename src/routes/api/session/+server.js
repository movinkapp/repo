/**
 * Returns whether the request has a server-side session (from hooks)
 */
export const GET = async (event) => {
  const authenticated = !!event.locals.session
  return new Response(JSON.stringify({ authenticated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
