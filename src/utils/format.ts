export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '0'
  return value.toLocaleString()
}

export const formatMoney = (cents: number | null | undefined, currency: string = 'USD'): string => {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '$0'
  const dollars = cents / 100
  return dollars.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: 0 })
}

export const formatMoneyExact = (cents: number | null | undefined, currency: string = 'USD'): string => {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '$0.00'
  const dollars = cents / 100
  return dollars.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
