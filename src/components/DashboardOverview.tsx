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

type IntervalValue = 'DAY' | 'MONTH';

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
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return toDateInputValue(date);
}

function formatMoney(value: number | undefined | null) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;
}

function maxMetric(points: TimeSeriesPointDto[], key: 'count' | 'amount' | 'rate') {
  return Math.max(1, ...points.map((point) => Number(point[key] ?? 0)));
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
  action
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
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
        </div>
        {icon}
      </div>
      {action}
    </div>
  );
}

function BarSeries({
  title,
  points,
  metric,
  formatValue
}: {
  title: string;
  points: TimeSeriesPointDto[];
  metric: 'count' | 'amount' | 'rate';
  formatValue?: (value: number) => string;
}) {
  const maxValue = maxMetric(points, metric);

  return (
    <div className="dashboard-card dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h4 className="dashboard-chart-card__title">{title}</h4>
      </div>

      <div className="dashboard-bar-chart">
        {points.length === 0 ? (
          <div className="text-sm text-slate-400 font-semibold px-4 py-8">Chưa có dữ liệu</div>
        ) : (
          points.map((item, idx) => {
            const value = Number(item[metric] ?? 0);
            const height = Math.max(4, Math.round((value / maxValue) * 100));

            return (
              <div key={`${item.period}-${idx}`} className="dashboard-bar-chart__item">
                <div className="dashboard-bar-chart__tooltip">
                  {formatValue ? formatValue(value) : value.toLocaleString('vi-VN')}
                </div>

                <div className="dashboard-bar-chart__track">
                  <div
                    className="dashboard-bar-chart__bar dashboard-bar-chart__bar--active"
                    style={{ height: `${height}%` }}
                  />
                </div>

                <span className="dashboard-bar-chart__label">{item.period}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RevenueTable({ points }: { points: TimeSeriesPointDto[] }) {
  return (
    <div className="dashboard-card dashboard-chart-card">
      <div className="dashboard-chart-card__header">
        <h4 className="dashboard-chart-card__title">Doanh thu theo kỳ</h4>
      </div>

      <div className="dashboard-activity-card__table-wrap">
        <table className="dashboard-activity-card__table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td colSpan={2}>Chưa có dữ liệu</td>
              </tr>
            ) : (
              points.map((item, idx) => (
                <tr key={`${item.period}-${idx}`}>
                  <td>{item.period}</td>
                  <td>{formatMoney(Number(item.amount ?? 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          >
            <option value="DAY">Ngày</option>
            <option value="MONTH">Tháng</option>
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
          icon={<div className="dashboard-card__icon dashboard-card__icon--teal"><Users className="w-5 h-5 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Người dùng hoạt động"
          value={cards.activeUsers.toLocaleString('vi-VN')}
          tone="success"
          icon={<div className="dashboard-card__icon dashboard-card__icon--amber"><Zap className="w-5 h-5 text-amber-600" /></div>}
        />
        <MetricCard
          label="Người dùng Premium"
          value={cards.premiumUsers.toLocaleString('vi-VN')}
          icon={<div className="dashboard-card__icon dashboard-card__icon--indigo"><Award className="w-5 h-5 text-indigo-600" /></div>}
        />
        <MetricCard
          label="Gói đang hoạt động"
          value={cards.activeSubscriptions.toLocaleString('vi-VN')}
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><CheckCircle2 className="w-5 h-5 text-emerald-700" /></div>}
          action={<div className="dashboard-card__trend dashboard-card__trend--muted"><Calendar className="w-4 h-4 text-slate-400" /><span>Cập nhật từ subscription</span></div>}
        />
        <MetricCard
          label="MRR"
          value={formatMoney(cards.mrr)}
          icon={<div className="dashboard-card__icon dashboard-card__icon--teal"><Wallet className="w-5 h-5 text-teal-700" /></div>}
        />
        <MetricCard
          label="Doanh thu hôm nay"
          value={formatMoney(cards.revenueToday)}
          tone="success"
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><TrendingUp className="w-5 h-5 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Doanh thu tháng này"
          value={formatMoney(cards.revenueThisMonth)}
          icon={<div className="dashboard-card__icon dashboard-card__icon--emerald"><TrendingUp className="w-4 h-4 text-emerald-700" /></div>}
        />
        <MetricCard
          label="Thanh toán thất bại"
          value={cards.failedPayments.toLocaleString('vi-VN')}
          tone="danger"
          icon={<div className="dashboard-card__icon dashboard-card__icon--red"><AlertTriangle className="w-5 h-5 text-red-600" /></div>}
          action={<button onClick={() => setActiveTab('finance')} className="dashboard-card__link"><span>Kiểm tra ngay</span><ArrowUpRight className="w-3.5 h-3.5" /></button>}
        />
        <MetricCard
          label="Nhắc nhở đã gửi hôm nay"
          value={cards.remindersSentToday.toLocaleString('vi-VN')}
          icon={<div className="dashboard-card__icon dashboard-card__icon--slate"><Send className="w-5 h-5 text-slate-600" /></div>}
        />
      </div>

      <div className="dashboard-overview__charts-grid">
        <BarSeries title="Tăng trưởng người dùng" points={data.userGrowth} metric="count" />
        <BarSeries title="Tăng trưởng đăng ký" points={data.subscriptionGrowth} metric="count" />
        <BarSeries title="Churn" points={data.churnTrend} metric="count" />
        <RevenueTable points={data.revenueTrend} />
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
