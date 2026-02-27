import { cubicOut } from 'svelte/easing'
import { crossfade } from 'svelte/transition'

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

export const currencySymbols = {
  EUR: '€', GBP: '£', USD: '$', BRL: 'R$',
  AUD: 'A$', JPY: '¥', CHF: 'CHF', CAD: 'CA$', KRW: '₩'
}

export function formatDeal(spot) {
  const symbol = currencySymbols[spot.currency] || spot.currency
  return spot.deal_type === 'flat_daily'
    ? 'Studio · ' + symbol + formatAmount(spot.deal_value, spot.currency) + '/day'
    : 'Commission · ' + spot.deal_value + '%'
}

export function formatAmount(value, currency = 'EUR') {
  const num = Number(value) || 0
  const locales = {
    EUR: 'de-DE', GBP: 'en-GB', USD: 'en-US',
    BRL: 'pt-BR', AUD: 'en-AU', JPY: 'ja-JP',
    CHF: 'de-CH', CAD: 'en-CA', KRW: 'ko-KR'

  }
  const locale = locales[currency] || 'en-US'
  const decimals = 0
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export function fadeSlide(node, { delay = 0, duration = 300, y = 8 } = {}) {
  const style = getComputedStyle(node)
  const targetOpacity = parseFloat(style.opacity) || 1
  const transform = style.transform === 'none' ? '' : style.transform

  return {
    delay,
    duration,
    easing: cubicOut,
    css: t => `transform: ${transform} translateY(${(1 - t) * y}px); opacity: ${t * targetOpacity};`
  }
}

export const [send, receive] = crossfade({
  duration: d => Math.max(200, d * 0.6),
  fallback: (node) => {
    return {
      duration: 300,
      easing: cubicOut,
      css: t => `opacity: ${t}; transform: scale(${0.96 + 0.04 * t});`
    }
  }
})