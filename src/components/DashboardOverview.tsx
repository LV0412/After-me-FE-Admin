import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Calendar,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap
} from 'lucide-react';

import {
  DashboardOverviewDto,
  TimeSeriesPointDto,
  getDashboardOverview
} from '../api/adminApi';
import { Transaction } from '../types';

import '../styles/dashboard/DashboardOverview.css';

interface DashboardOverviewProps {
  overview?: DashboardOverviewDto | null;
  transactions?: Transaction[];
  setActiveTab: (tab: string) => void;
  onViewActivityDetails: (activity: Transaction) => void;
}

type IntervalValue = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

const intervalOptions: Array<{ value: IntervalValue; label: string }> = [
  { value: 'DAY', label: 'Ngày' },
  { value: 'WEEK', label: 'Tuần' },
  { value: 'MONTH', label: 'Tháng' },
  { value: 'QUARTER', label: 'Quý' },
  { value: 'YEAR', label: 'Năm' }
];

const emptyOverview: DashboardOverviewDto = {
  cards: {
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    activeSubscriptions: 0,
    mrr: 0,
    revenueToday: 0,
    revenueThisMonth: 0,
    failedPayments: 0,
    remindersSentToday: 0
  },
  userGrowth: [],
  subscriptionGrowth: [],
  revenueTrend: [],
  churnTrend: []
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultFromDate() {
  return `${new Date().getFullYear()}-01-01`;
}

function formatMoney(value: number | undefined | null) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;
}

function maxMetric(points: TimeSeriesPointDto[], key: 'count' | 'amount' | 'rate') {
  return Math.max(1, ...points.map((point) => Number(point[key] ?? 0)));
}

function previousMetric(points: TimeSeriesPointDto[], key: 'count' | 'amount' | 'rate') {
  if (points.length < 2) {
    return null;
  }

  return Number(points[points.length - 2][key] ?? 0);
}

function hasUsablePreviousMetric(value: number | null) {
  return value !== null && value > 0;
}

function periodLabel(interval: IntervalValue) {
  switch (interval) {
    case 'DAY':
      return 'hôm qua';
    case 'WEEK':
      return 'tuần trước';
    case 'MONTH':
      return 'tháng trước';
    case 'QUARTER':
      return 'quý trước';
    case 'YEAR':
      return 'năm trước';
    default:
      return 'kỳ trước';
  }
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

  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

function groupTimeSeries(points: TimeSeriesPointDto[], interval: IntervalValue) {
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

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
  comparison,
  action
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
  comparison?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dashboard-card dashboard-metric-card">
      <div className="dashboard-card__header">
        <div>
          <p className="dashboard-card__label">{label}</p>
          <h3
            className={`dashboard-card__value ${
              tone === 'success'
                ? 'dashboard-card__value--emerald'
                : tone === 'danger'
                ? 'dashboard-card__value--danger'
                : ''
            }`}
          >
            {value}
          </h3>
          {comparison && <p className="dashboard-card__comparison">{comparison}</p>}
        </div>
        {icon}
      </div>
      {action}
    </div>
  );
}

function TrendLineChart({
  title,
  points,
  metric,
  formatValue,
  summaryLabel,
  summaryValue,
  tone = 'default'
}: {
  title: string;
  points: TimeSeriesPointDto[];
  metric: 'count' | 'amount' | 'rate';
  formatValue?: (value: number) => string;
  summaryLabel?: string;
  summaryValue?: string;
  tone?: 'default' | 'danger' | 'money';
}) {
  const maxValue = maxMetric(points, metric);
  const chartTop = 8;
  const chartBottom = 84;
  const chartLeft = 12;
  const chartRight = 98;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;
  const yTicks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
  const coordinates = points.map((item, idx) => {
    const value = Number(item[metric] ?? 0);
    const x = points.length === 1 ? chartLeft + chartWidth / 2 : chartLeft + (idx / (points.length - 1)) * chartWidth;
    const y = chartBottom - (value / maxValue) * chartHeight;

    return { item, value, x, y };
  });
  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath =
    coordinates.length > 0
      ? `M ${coordinates[0].x} ${chartBottom} L ${coordinates
          .map((point) => `${point.x} ${point.y}`)
          .join(' L ')} L ${coordinates[coordinates.length - 1].x} ${chartBottom} Z`
      : '';

  return (
    <div className="dashboard-card dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h4 className="dashboard-chart-card__title">{title}</h4>
        {summaryValue && (
          <div className="dashboard-chart-card__summary">
            <span>{summaryLabel ?? 'Tổng'}</span>
            <strong>{summaryValue}</strong>
          </div>
        )}
      </div>

      <div className={`dashboard-line-chart dashboard-line-chart--${tone}`}>
        {points.length === 0 ? (
          <div className="text-sm text-slate-400 font-semibold px-4 py-8">Chưa có dữ liệu</div>
        ) : (
          <>
            <div className="dashboard-line-chart__y-axis" aria-hidden="true">
              {yTicks.map((tick, idx) => (
                <span key={`${tick}-${idx}`}>{formatValue ? formatValue(tick) : Math.round(tick).toLocaleString('vi-VN')}</span>
              ))}
            </div>

            <svg className="dashboard-line-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {yTicks.map((_, idx) => {
                const y = chartTop + (idx / (yTicks.length - 1)) * chartHeight;

                return <line key={idx} className="dashboard-line-chart__grid-line" x1={chartLeft} x2={chartRight} y1={y} y2={y} />;
              })}
              <path className="dashboard-line-chart__area" d={areaPath} />
              <polyline className="dashboard-line-chart__line" points={linePoints} />
            </svg>

            <div className="dashboard-line-chart__points">
              {coordinates.map((point, idx) => (
                <div
                  key={`${point.item.period}-${idx}`}
                  className="dashboard-line-chart__point"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <span className="dashboard-line-chart__tooltip">
                    {point.item.period}: {formatValue ? formatValue(point.value) : point.value.toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverview({
  overview,
  transactions = [],
  setActiveTab,
  onViewActivityDetails
}: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardOverviewDto>(overview ?? emptyOverview);
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [interval, setInterval] = useState<IntervalValue>('DAY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (overview) {
      setData(overview);
    }
  }, [overview]);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardOverview({ from, to, interval });
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được dữ liệu tổng quan');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [from, to, interval]);

  const cards = data.cards;
  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);
  const userGrowthPoints = useMemo(() => groupTimeSeries(data.userGrowth, interval), [data.userGrowth, interval]);
  const subscriptionGrowthPoints = useMemo(
    () => groupTimeSeries(data.subscriptionGrowth, interval),
    [data.subscriptionGrowth, interval]
  );
  const churnTrendPoints = useMemo(() => groupTimeSeries(data.churnTrend, interval), [data.churnTrend, interval]);
  const revenueTrendPoints = useMemo(() => groupTimeSeries(data.revenueTrend, interval), [data.revenueTrend, interval]);
  const revenueTrendTotal = useMemo(
    () => revenueTrendPoints.reduce((sum, point) => sum + Number(point.amount ?? 0), 0),
    [revenueTrendPoints]
  );
  const comparisonPeriod = periodLabel(interval);
  const previousUsers = previousMetric(userGrowthPoints, 'count');
  const previousSubscriptions = previousMetric(subscriptionGrowthPoints, 'count');
  const previousRevenue = previousMetric(revenueTrendPoints, 'amount');
  const activeUserRate = cards.totalUsers > 0 ? Math.round((cards.activeUsers / cards.totalUsers) * 100) : 0;
  const premiumUserRate = cards.totalUsers > 0 ? Math.round((cards.premiumUsers / cards.totalUsers) * 100) : 0;

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview__header">
        <div className="dashboard-overview__heading">
          <h2 className="dashboard-overview__title">Tổng quan hệ thống</h2>
          <p className="dashboard-overview__subtitle">
            Dữ liệu lấy từ Admin Dashboard API của backend AfterMe.
          </p>
        </div>

        <div className="dashboard-overview__header-actions">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="dashboard-overview__button"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="dashboard-overview__button"
          />
          <select
            value={interval}
            onChange={(event) => setInterval(event.target.value as IntervalValue)}
            className="dashboard-overview__button"
            aria-label="Chọn kỳ phân tích biểu đồ"
          >
            {intervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="dashboard-overview__button dashboard-overview__button--primary" disabled>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Live API'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-card p-4 text-sm font-semibold text-red-700 bg-red-50 border-red-100">
          {error}
        </div>
      )}

      <div className="dashboard-overview__metrics-grid">
        <MetricCard
          label="Tổng người dùng"
          value={cards.totalUsers.toLocaleString('vi-VN')}
          comparison={
            hasUsablePreviousMetric(previousUsers)
              ? `vs ${previousUsers.toLocaleString('vi-VN')} ${comparisonPeriod}`
              : undefined
          }
          icon={<div className="dashboard-card__icon dashboard-card__icon--teal"><Users className="w-5 h-5 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Người dùng hoạt động"
          value={cards.activeUsers.toLocaleString('vi-VN')}
          tone="success"
          comparison={`${activeUserRate}% trên tổng người dùng`}
          icon={<div className="dashboard-card__icon dashboard-card__icon--amber"><Zap className="w-5 h-5 text-amber-600" /></div>}
        />
        <MetricCard
          label="Người dùng Premium"
          value={cards.premiumUsers.toLocaleString('vi-VN')}
          comparison={`${premiumUserRate}% trên tổng người dùng`}
          icon={<div className="dashboard-card__icon dashboard-card__icon--indigo"><Award className="w-5 h-5 text-indigo-600" /></div>}
        />
        <MetricCard
          label="Gói đang hoạt động"
          value={cards.activeSubscriptions.toLocaleString('vi-VN')}
          comparison={
            hasUsablePreviousMetric(previousSubscriptions)
              ? `vs ${previousSubscriptions.toLocaleString('vi-VN')} ${comparisonPeriod}`
              : undefined
          }
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><CheckCircle2 className="w-5 h-5 text-emerald-700" /></div>}
          action={<div className="dashboard-card__trend dashboard-card__trend--muted"><Calendar className="w-4 h-4 text-slate-400" /><span>Cập nhật từ subscription</span></div>}
        />
        <MetricCard
          label="MRR"
          value={formatMoney(cards.mrr)}
          comparison={
            hasUsablePreviousMetric(previousRevenue)
              ? `Doanh thu ${comparisonPeriod}: ${formatMoney(previousRevenue)}`
              : undefined
          }
          icon={<div className="dashboard-card__icon dashboard-card__icon--teal"><Wallet className="w-5 h-5 text-teal-700" /></div>}
        />
        <MetricCard
          label="Doanh thu hôm nay"
          value={formatMoney(cards.revenueToday)}
          tone="success"
          comparison={
            hasUsablePreviousMetric(previousRevenue)
              ? `vs ${formatMoney(previousRevenue)} ${comparisonPeriod}`
              : undefined
          }
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><TrendingUp className="w-5 h-5 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Doanh thu tháng này"
          value={formatMoney(cards.revenueThisMonth)}
          comparison={
            hasUsablePreviousMetric(previousRevenue)
              ? `vs ${formatMoney(previousRevenue)} ${comparisonPeriod}`
              : undefined
          }
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><TrendingUp className="w-4 h-4 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Thanh toán thất bại"
          value={cards.failedPayments.toLocaleString('vi-VN')}
          tone="danger"
          comparison="Đối chiếu trong Finance"
          icon={<div className="dashboard-card__icon dashboard-card__icon--red"><AlertTriangle className="w-5 h-5 text-red-600" /></div>}
          action={<button onClick={() => setActiveTab('finance')} className="dashboard-card__link"><span>Kiểm tra ngay</span><ArrowUpRight className="w-3.5 h-3.5" /></button>}
        />
        <MetricCard
          label="Nhắc nhở đã gửi hôm nay"
          value={cards.remindersSentToday.toLocaleString('vi-VN')}
          comparison="Theo dữ liệu nhắc nhở hiện tại"
          icon={<div className="dashboard-card__icon dashboard-card__icon--slate"><Send className="w-5 h-5 text-slate-600" /></div>}
        />
      </div>

      <div className="dashboard-overview__charts-grid">
        <TrendLineChart title="Tăng trưởng người dùng" points={userGrowthPoints} metric="count" />
        <TrendLineChart title="Tăng trưởng đăng ký" points={subscriptionGrowthPoints} metric="count" />
        <TrendLineChart title="Churn" points={churnTrendPoints} metric="count" tone="danger" />
        <TrendLineChart
          title="Doanh thu theo kỳ"
          points={revenueTrendPoints}
          metric="amount"
          formatValue={formatMoney}
          summaryLabel="Tổng biểu đồ"
          summaryValue={formatMoney(revenueTrendTotal)}
          tone="money"
        />
      </div>

      <div className="dashboard-card dashboard-activity-card">
        <div className="dashboard-activity-card__header">
          <h4 className="dashboard-activity-card__title">Giao dịch gần đây</h4>
          <button onClick={() => setActiveTab('finance')} className="dashboard-activity-card__action">
            Xem tất cả
          </button>
        </div>

        <div className="dashboard-activity-card__table-wrap">
          <table className="dashboard-activity-card__table">
            <thead>
              <tr className="dashboard-activity-card__table-head-row">
                <th className="dashboard-activity-card__th">User</th>
                <th className="dashboard-activity-card__th">Trạng thái</th>
                <th className="dashboard-activity-card__th">Ngày</th>
                <th className="dashboard-activity-card__th dashboard-activity-card__th--right">Giá trị</th>
                <th className="dashboard-activity-card__th dashboard-activity-card__th--right">Hành động</th>
              </tr>
            </thead>

            <tbody className="dashboard-activity-card__tbody">
              {recentTransactions.length === 0 ? (
                <tr className="dashboard-activity-card__row">
                  <td className="dashboard-activity-card__td" colSpan={5}>
                    Chưa có giao dịch gần đây
                  </td>
                </tr>
              ) : (
                recentTransactions.map((trx, idx) => (
                  <tr key={trx.id || idx} className="dashboard-activity-card__row">
                    <td className="dashboard-activity-card__td">
                      <p className="dashboard-activity-card__name">{trx.userEmail}</p>
                    </td>
                    <td className="dashboard-activity-card__td">{trx.status}</td>
                    <td className="dashboard-activity-card__td">{trx.date}</td>
                    <td className="dashboard-activity-card__td dashboard-activity-card__td--right dashboard-activity-card__amount">
                      {formatMoney(trx.amount)}
                    </td>
                    <td className="dashboard-activity-card__td dashboard-activity-card__td--right">
                      <button
                        onClick={() => onViewActivityDetails(trx)}
                        className="dashboard-activity-card__icon-button"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
