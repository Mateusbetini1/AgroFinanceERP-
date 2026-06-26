export function getMonthPeriod(month: number, year: number) {
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 1)

  return {
    month,
    year,
    periodStart,
    periodEnd,
    bounds: { gte: periodStart, lt: periodEnd },
  }
}
