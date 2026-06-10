import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  RefreshCw,
  TrendingUp,
  Wallet,
  X
} from 'lucide-react';
import {
  getFinanceRevenueByPlan,
  getFinanceRevenueTimeseries,
  getFinanceSummary,
  getFinanceTransactionById,
  getFinanceTransactions,
  getFinanceTransactionSummary,
  type FinanceSummaryDto,
  type RevenueByPlanDto,
  type TimeSeriesPointDto,
  type TransactionRowDto,
  type TransactionSummaryDto
} from '../api/adminApi';
import { Transaction } from '../types';
import '../styles/financial/FinancialAdmin.css';

interface FinancialAdminProps {
  transactions?: Transaction[];
  searchTerm: string;
  onUpdateTransactionStatus?: (id: string, status: unknown) => void;
}

const statusOptions = ['All', 'SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'];

const emptyFinanceSummary: FinanceSummaryDto = {
  revenueToday: 0,
  revenueMtd: 0,
  revenueYtd: 0,
  mrr: 0,
  arr: 0
};

const emptyTransactionSummary: TransactionSummaryDto = {
  total: 0,
  success: 0,
  failed: 0,
  pending: 0,
  refunded: 0,
  successfulRevenue: 0
};

function formatMoney(value: number | null | undefined, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN').format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return includeTime ? parsed.toLocaleString('vi-VN') : parsed.toLocaleDateString('vi-VN');
}

function getInitials(value: string) {
  const source = value.includes('@') ? value.split('@')[0] : value;
  return source
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TX';
}

function getStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'SUCCESS') return 'Thành công';
  if (normalized === 'FAILED') return 'Thất bại';
  if (normalized === 'PENDING') return 'Đang chờ';
  if (normalized === 'REFUNDED') return 'Hoàn tiền';
  return status || '-';
}

function getStatusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'SUCCESS') return 'finance-admin__status-pill--success';
  if (normalized === 'FAILED') return 'finance-admin__status-pill--danger';
  if (normalized === 'REFUNDED') return 'finance-admin__status-pill--neutral';
  return 'finance-admin__status-pill--pending';
}

function buildPlanGradient(plans: RevenueByPlanDto[]) {
  const total = plans.reduce((sum, plan) => sum + Number(plan.revenue ?? 0), 0);
  const colors = ['#047857', '#002046', '#4f46e5', '#f59e0b', '#8bf1e6'];

  if (total <= 0 || plans.length === 0) {
    return '#eef2f7';
  }

  let cursor = 0;
  const stops = plans.map((plan, index) => {
    const portion = (Number(plan.revenue ?? 0) / total) * 100;
    const from = cursor;
    const to = cursor + portion;
    cursor = to;
    const color = colors[index % colors.length];
    return `${color} ${from}% ${to}%`;
  });

  return `conic-gradient(${stops.join(', ')})`;
}

export default function FinancialAdmin({ searchTerm }: FinancialAdminProps) {
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryDto>(emptyFinanceSummary);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummaryDto>(emptyTransactionSummary);
  const [revenueTimeseries, setRevenueTimeseries] = useState<TimeSeriesPointDto[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlanDto[]>([]);
  const [rows, setRows] = useState<TransactionRowDto[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detail, setDetail] = useState<TransactionRowDto | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadFinance = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [summaryResponse, timeseriesResponse, byPlanResponse, listResponse, transactionSummaryResponse] = await Promise.all([
        getFinanceSummary(),
        getFinanceRevenueTimeseries({ interval: 'DAY' }),
        getFinanceRevenueByPlan(),
        getFinanceTransactions({
          page,
          size,
          q: searchTerm,
          status: statusFilter === 'All' ? undefined : statusFilter
        }),
        getFinanceTransactionSummary()
      ]);

      setFinanceSummary(summaryResponse.data);
      setRevenueTimeseries(timeseriesResponse.data);
      setRevenueByPlan(byPlanResponse.data);
      setRows(listResponse.data.content);
      setTotalElements(listResponse.data.totalElements);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setTransactionSummary(transactionSummaryResponse.data);
    } catch (error) {
      setFinanceSummary(emptyFinanceSummary);
      setTransactionSummary(emptyTransactionSummary);
      setRevenueTimeseries([]);
      setRevenueByPlan([]);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được dữ liệu tài chính.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [page, size, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

  const maxRevenue = Math.max(...revenueTimeseries.map(point => Number(point.amount ?? 0)), 1);
  const planTotal = useMemo(
    () => revenueByPlan.reduce((sum, plan) => sum + Number(plan.revenue ?? 0), 0),
    [revenueByPlan]
  );

  const openDetail = async (row: TransactionRowDto) => {
    setActionLoading(true);
    setNotice(null);

    try {
      const response = await getFinanceTransactionById(String(row.id));
      setDetail(response.data);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được chi tiết giao dịch.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="finance-admin">
      <section className="finance-admin__stats-grid">
        <article className="finance-admin__metric-card">
          <div className="finance-admin__metric-head">
            <span className="finance-admin__metric-label">Hôm nay</span>
            <TrendingUp />
          </div>
          <p className="finance-admin__metric-value">{formatMoney(financeSummary.revenueToday)}</p>
          <p className="finance-admin__metric-note finance-admin__metric-note--muted">Doanh thu thành công trong ngày</p>
        </article>

        <article className="finance-admin__metric-card">
          <div className="finance-admin__metric-head">
            <span className="finance-admin__metric-label">Tháng này</span>
            <Calendar />
          </div>
          <p className="finance-admin__metric-value">{formatMoney(financeSummary.revenueMtd)}</p>
          <p className="finance-admin__metric-note finance-admin__metric-note--muted">Revenue MTD</p>
        </article>

        <article className="finance-admin__metric-card">
          <div className="finance-admin__metric-head">
            <span className="finance-admin__metric-label">Năm nay</span>
            <Activity />
          </div>
          <p className="finance-admin__metric-value">{formatMoney(financeSummary.revenueYtd)}</p>
          <p className="finance-admin__metric-note finance-admin__metric-note--muted">Revenue YTD</p>
        </article>

        <article className="finance-admin__metric-card finance-admin__metric-card--dark">
          <div className="finance-admin__metric-head finance-admin__metric-head--dimmed">
            <span className="finance-admin__metric-label finance-admin__metric-label--inverse">MRR</span>
            <RefreshCw />
          </div>
          <p className="finance-admin__metric-value finance-admin__metric-value--inverse">{formatMoney(financeSummary.mrr)}</p>
          <p className="finance-admin__metric-note finance-admin__metric-note--inverse">Doanh thu định kỳ tháng</p>
        </article>

        <article className="finance-admin__metric-card finance-admin__metric-card--emerald">
          <div className="finance-admin__metric-head finance-admin__metric-head--dimmed">
            <span className="finance-admin__metric-label finance-admin__metric-label--inverse">ARR</span>
            <Award />
          </div>
          <p className="finance-admin__metric-value finance-admin__metric-value--inverse">{formatMoney(financeSummary.arr)}</p>
          <p className="finance-admin__metric-note finance-admin__metric-note--inverse">Dự phóng doanh thu năm</p>
        </article>
      </section>

      {notice && (
        <div className={`finance-admin__notice finance-admin__notice--${notice.type}`}>
          {notice.text}
        </div>
      )}

      <section className="finance-admin__layout">
        <div className="finance-admin__revenue-card">
          <div className="finance-admin__card-head">
            <div>
              <h3 className="finance-admin__card-title">Timeseries doanh thu</h3>
              <p className="finance-admin__card-subtitle">Dữ liệu từ `/finance/revenue/timeseries`</p>
            </div>
          </div>

          <div className="finance-admin__bar-chart">
            <div className="finance-admin__chart-unit">VND</div>
            {revenueTimeseries.length > 0 ? (
              revenueTimeseries.slice(-12).map(point => {
                const amount = Number(point.amount ?? 0);
                return (
                  <div key={point.period} className="finance-admin__bar-chart-item">
                    <span className="finance-admin__bar-chart-tooltip">{formatMoney(amount)}</span>
                    <div className="finance-admin__bar-track">
                      <div
                        className="finance-admin__bar finance-admin__bar--primary"
                        style={{ height: `${Math.max((amount / maxRevenue) * 100, 8)}%` }}
                      />
                    </div>
                    <span className="finance-admin__bar-label">{point.period.slice(5)}</span>
                  </div>
                );
              })
            ) : (
              <div className="finance-admin__chart-empty">Chưa có dữ liệu doanh thu</div>
            )}
          </div>
        </div>

        <div className="finance-admin__donut-card">
          <h3 className="finance-admin__card-title finance-admin__card-title--spaced">Doanh thu theo plan</h3>
          <div className="finance-admin__donut-shell">
            <div className="finance-admin__donut" style={{ background: buildPlanGradient(revenueByPlan) }}>
              <div className="finance-admin__donut-inner">
                <span className="finance-admin__donut-value">{formatNumber(revenueByPlan.length)}</span>
                <span className="finance-admin__donut-caption">plans</span>
              </div>
            </div>
          </div>

          <div className="finance-admin__legend">
            {revenueByPlan.length > 0 ? (
              revenueByPlan.slice(0, 5).map((plan, index) => {
                const percent = planTotal > 0 ? (Number(plan.revenue ?? 0) / planTotal) * 100 : 0;
                return (
                  <div className="finance-admin__legend-row" key={plan.planId}>
                    <div className="finance-admin__legend-label">
                      <span className={`finance-admin__legend-dot finance-admin__legend-dot--${index + 1}`} />
                      <span>{plan.planName}</span>
                    </div>
                    <span>{percent.toFixed(1)}%</span>
                  </div>
                );
              })
            ) : (
              <p className="finance-admin__empty-note">Chưa có doanh thu theo plan</p>
            )}
          </div>
        </div>
      </section>

      <section className="finance-admin__summary-strip">
        <article><span>Tổng giao dịch</span><strong>{formatNumber(transactionSummary.total)}</strong></article>
        <article><span>Thành công</span><strong>{formatNumber(transactionSummary.success)}</strong></article>
        <article><span>Thất bại</span><strong>{formatNumber(transactionSummary.failed)}</strong></article>
        <article><span>Đang chờ</span><strong>{formatNumber(transactionSummary.pending)}</strong></article>
        <article><span>Hoàn tiền</span><strong>{formatNumber(transactionSummary.refunded)}</strong></article>
        <article><span>Revenue thành công</span><strong>{formatMoney(transactionSummary.successfulRevenue)}</strong></article>
      </section>

      <section className="finance-admin__table-card">
        <div className="finance-admin__table-head">
          <div>
            <h3 className="finance-admin__table-title">Lịch sử giao dịch</h3>
            <p className="finance-admin__table-subtitle">Dữ liệu từ endpoint transactions, chỉ hiển thị và xem chi tiết</p>
          </div>
          <div className="finance-admin__filters">
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  Trạng thái: {status === 'All' ? 'Tất cả' : getStatusLabel(status)}
                </option>
              ))}
            </select>
            <button className="finance-admin__refresh-button" type="button" onClick={loadFinance}>
              <RefreshCw />
              Làm mới
            </button>
          </div>
        </div>

        <div className="finance-admin__table-wrap">
          <table className="finance-admin__table">
            <thead className="finance-admin__thead">
              <tr>
                <th className="finance-admin__th">Người dùng</th>
                <th className="finance-admin__th">Mã tham chiếu</th>
                <th className="finance-admin__th finance-admin__th--right">Số tiền</th>
                <th className="finance-admin__th">Provider</th>
                <th className="finance-admin__th">Trạng thái</th>
                <th className="finance-admin__th">Ngày thanh toán</th>
                <th className="finance-admin__th finance-admin__th--right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="finance-admin__tbody">
              {loading ? (
                <tr>
                  <td className="finance-admin__empty-row" colSpan={7}>Đang tải dữ liệu...</td>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((trx) => (
                  <tr key={trx.id} className="finance-admin__row">
                    <td className="finance-admin__td">
                      <div className="finance-admin__user">
                        <div className="finance-admin__avatar">{getInitials(trx.userEmail)}</div>
                        <div>
                          <p className="finance-admin__user-name">{trx.userEmail}</p>
                          <p className="finance-admin__user-email">User ID {trx.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="finance-admin__td finance-admin__td--mono">{trx.transactionRef || trx.id}</td>
                    <td className="finance-admin__td finance-admin__td--right finance-admin__amount">
                      {formatMoney(trx.amount, trx.currency)}
                    </td>
                    <td className="finance-admin__td">
                      <span className="finance-admin__gateway">
                        <CreditCard />
                        <span>{trx.provider || '-'}</span>
                      </span>
                    </td>
                    <td className="finance-admin__td">
                      <span className={`finance-admin__status-pill ${getStatusClass(trx.status)}`}>
                        {getStatusLabel(trx.status)}
                      </span>
                    </td>
                    <td className="finance-admin__td finance-admin__td--muted">{formatDate(trx.paidAt || trx.createdAt, true)}</td>
                    <td className="finance-admin__td finance-admin__td--right">
                      <button
                        className="finance-admin__icon-button"
                        type="button"
                        title="Xem chi tiết"
                        disabled={actionLoading}
                        onClick={() => openDetail(trx)}
                      >
                        <Eye />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="finance-admin__empty-row" colSpan={7}>Không có giao dịch phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="finance-admin__footer">
          <p>Hiển thị {formatNumber(rows.length)} / {formatNumber(totalElements)} giao dịch</p>
          <div>
            <button type="button" onClick={() => setPage(current => Math.max(current - 1, 0))} disabled={page === 0}>
              <ChevronLeft />
            </button>
            <span>Trang {page + 1} / {totalPages}</span>
            <button type="button" onClick={() => setPage(current => Math.min(current + 1, totalPages - 1))} disabled={page + 1 >= totalPages}>
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>

      {detail && (
        <div className="finance-admin__modal-backdrop">
          <div className="finance-admin__modal">
            <div className="finance-admin__modal-header">
              <h3>Chi tiết giao dịch</h3>
              <button type="button" onClick={() => setDetail(null)}><X /></button>
            </div>
            <div className="finance-admin__detail-head">
              <span className="finance-admin__avatar finance-admin__avatar--lg">
                <Wallet />
              </span>
              <div>
                <strong>{formatMoney(detail.amount, detail.currency)}</strong>
                <p>{detail.userEmail}</p>
              </div>
            </div>
            <div className="finance-admin__detail-grid">
              <div><span>ID giao dịch</span><strong>{detail.id}</strong></div>
              <div><span>ID user</span><strong>{detail.userId}</strong></div>
              <div><span>Email</span><strong>{detail.userEmail}</strong></div>
              <div><span>Provider</span><strong>{detail.provider || '-'}</strong></div>
              <div><span>Trạng thái</span><strong>{getStatusLabel(detail.status)}</strong></div>
              <div><span>Transaction ref</span><strong>{detail.transactionRef || '-'}</strong></div>
              <div><span>Paid at</span><strong>{formatDate(detail.paidAt, true)}</strong></div>
              <div><span>Created at</span><strong>{formatDate(detail.createdAt, true)}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
