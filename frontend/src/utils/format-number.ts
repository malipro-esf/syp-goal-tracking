export function formatNumber(value: string | number): string {
  const text = String(value)

  if (!text.includes('.')) return text

  return text.replace(/\.?0+$/, '')
}
