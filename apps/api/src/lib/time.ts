const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function startOfManilaPeriod(period: 'today' | 'week' | 'month' | 'quarter' | 'year', now = new Date()): Date {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = manila.getUTCFullYear();
  const month = manila.getUTCMonth();
  const date = manila.getUTCDate();

  if (period === 'today') return manilaDate(year, month, date);
  if (period === 'month') return manilaDate(year, month, 1);
  if (period === 'quarter') return manilaDate(year, Math.floor(month / 3) * 3, 1);
  if (period === 'year') return manilaDate(year, 0, 1);

  const day = manila.getUTCDay() || 7;
  return manilaDate(year, month, date - day + 1);
}

function manilaDate(year: number, month: number, date: number): Date {
  return new Date(Date.UTC(year, month, date) - MANILA_OFFSET_MS);
}
