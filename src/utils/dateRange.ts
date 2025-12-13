export type DateRangePreset = '7d' | '30d' | '90d' | 'custom'

export type DateRangeValue = {
  preset: DateRangePreset
  from?: string
  to?: string
}

const startOfDayUtc = (date: Date) => {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

const endOfDayUtc = (date: Date) => {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))
}

export const computeRange = (value: DateRangeValue): { fromUtc: string; toUtc: string } => {
  const now = new Date()
  if (value.preset !== 'custom') {
    const days = value.preset === '7d' ? 7 : value.preset === '30d' ? 30 : 90
    const end = endOfDayUtc(now)
    const start = startOfDayUtc(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000))
    return { fromUtc: start.toISOString(), toUtc: end.toISOString() }
  }
  const customFrom = value.from ? startOfDayUtc(new Date(value.from)) : startOfDayUtc(now)
  const customTo = value.to ? endOfDayUtc(new Date(value.to)) : endOfDayUtc(now)
  return { fromUtc: customFrom.toISOString(), toUtc: customTo.toISOString() }
}

export const parseRangeFromParams = (params: URLSearchParams): DateRangeValue => {
  const rangeParam = params.get('range') as DateRangePreset | null
  const fromParam = params.get('from')
  const toParam = params.get('to')
  if (rangeParam && rangeParam !== 'custom') {
    return { preset: rangeParam }
  }
  if (fromParam || toParam) {
    return { preset: 'custom', from: fromParam || undefined, to: toParam || undefined }
  }
  return { preset: '7d' }
}

export const persistRangeToParams = (value: DateRangeValue, params: URLSearchParams) => {
  params.delete('range')
  params.delete('from')
  params.delete('to')
  if (value.preset === 'custom') {
    if (value.from) params.set('from', value.from)
    if (value.to) params.set('to', value.to)
  } else {
    params.set('range', value.preset)
  }
  return params
}
