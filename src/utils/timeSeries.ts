import type { TimeSeriesPointDto } from '../api/adminApi';

export type IntervalValue = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export const intervalOptions: Array<{ value: IntervalValue; label: string }> = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'WEEK', label: 'Tuần' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'QUARTER', label: 'Quý' },
  { value: 'YEAR', label: 'Năm' }
];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parsePeriodDate(period: string) {
  const value = period.trim();
  const dateMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const monthMatch = value.match(/^(\d{4})-(\d{1,2})$/);
  const quarterMatch = value.match(/^(\d{4})-?Q([1-4])$/i);
  const yearMatch = value.match(/^(\d{4})$/);
  const slashMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (dateMatch) {
    return new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])));
  }

  if (monthMatch) {
    return new Date(Date.UTC(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1));
  }

  if (quarterMatch) {
    return new Date(Date.UTC(Number(quarterMatch[1]), (Number(quarterMatch[2]) - 1) * 3, 1));
  }

  if (yearMatch) {
    return new Date(Date.UTC(Number(yearMatch[1]), 0, 1));
  }

  if (slashMatch) {
    return new Date(Date.UTC(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1])));
  }

  return null;
}

function startOfIsoWeek(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
}

function getIsoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7));
}

function getBucketStart(date: Date, interval: IntervalValue) {
  switch (interval) {
    case 'WEEK':
      return startOfIsoWeek(date);
    case 'MONTH':
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    case 'QUARTER':
      return new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1));
    case 'YEAR':
      return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    default:
      return date;
  }
}

function formatBucketLabel(date: Date, interval: IntervalValue) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  switch (interval) {
    case 'WEEK':
      return `Tuần ${getIsoWeek(date)}/${year}`;
    case 'MONTH':
      return `T${month}/${year}`;
    case 'QUARTER':
      return `Q${Math.floor(date.getUTCMonth() / 3) + 1}/${year}`;
    case 'YEAR':
      return String(year);
    default:
      return toDateInputValue(date);
  }
}

export function groupTimeSeries(points: TimeSeriesPointDto[], interval: IntervalValue) {
  if (interval === 'DAY' || points.length === 0) {
    return points;
  }

  const buckets = new Map<string, TimeSeriesPointDto & { timestamp: number; rateSamples: number }>();

  for (const point of points) {
    const date = parsePeriodDate(point.period);

    if (!date) {
      return points;
    }

    const bucketDate = getBucketStart(date, interval);
    const key = bucketDate.toISOString();
    const current =
      buckets.get(key) ??
      ({
        period: formatBucketLabel(bucketDate, interval),
        count: 0,
        amount: 0,
        rate: 0,
        timestamp: bucketDate.getTime(),
        rateSamples: 0
      } as TimeSeriesPointDto & { timestamp: number; rateSamples: number });

    current.count = Number(current.count ?? 0) + Number(point.count ?? 0);
    current.amount = Number(current.amount ?? 0) + Number(point.amount ?? 0);

    if (point.rate !== undefined && point.rate !== null) {
      current.rate = Number(current.rate ?? 0) + Number(point.rate);
      current.rateSamples += 1;
    }

    buckets.set(key, current);
  }

  return Array.from(buckets.values())
    .sort((first, second) => first.timestamp - second.timestamp)
    .map(({ timestamp, rateSamples, ...point }) => ({
      ...point,
      rate: rateSamples > 0 ? Number(point.rate ?? 0) / rateSamples : point.rate
    }));
}
