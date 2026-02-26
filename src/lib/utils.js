export function getStatus(spot) {
  const today = new Date()
  const start = new Date(spot.start_date)
  const end = new Date(spot.end_date)
  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'active'
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function formatDeal(spot) {
  return spot.deal_type === 'flat_daily'
    ? spot.deal_value + ' ' + spot.currency + '/day'
    : spot.deal_value + '% commission'
}
