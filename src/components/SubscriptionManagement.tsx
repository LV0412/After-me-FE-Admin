import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers3,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
  XCircle
} from 'lucide-react';
import {
  cancelSubscription,
  downgradeSubscription,
  extendSubscription,
  getSubscriptionAnalytics,
  getSubscriptionById,
  getSubscriptions,
  getSubscriptionSummary,
  reactivateSubscription,
  type SubscriptionAnalyticsDto,
  type SubscriptionRowDto,
  type SubscriptionSummaryDto,
  upgradeSubscription
} from '../api/adminApi';
import { Subscription } from '../types';
import '../styles/SubscriptionManagement.css';

interface SubscriptionManagementProps {
  subscriptions?: Subscription[];
  searchTerm: string;
  onCancelSubscription?: (subscriptionId: number) => void;
}

type ActionMode = 'upgrade' | 'downgrade' | 'extend';

const statusOptions = ['All', 'ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'PENDING', 'FAILED'];
const planNameOptions = ['All', 'Free', 'Pro', 'Premium', 'Enterprise'];

const emptySummary: SubscriptionSummaryDto = {
  total: 0,
  active: 0,
  trial: 0,
  expired: 0,
  cancelled: 0,
  pending: 0,
  failed: 0
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN').format(Number(value ?? 0));
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('vi-VN');
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AM';
}

function getStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE') return 'Hoạt động';
  if (normalized === 'TRIAL') return 'Dùng thử';
  if (normalized === 'EXPIRED') return 'Hết hạn';
  if (normalized === 'CANCELLED') return 'Đã hủy';
  if (normalized === 'PENDING') return 'Đang chờ';
  if (normalized === 'FAILED') return 'Thất bại';
  return status || '-';
}

function getStatusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'TRIAL') return 'subscription-management__status--active';
  if (normalized === 'CANCELLED' || normalized === 'FAILED') return 'subscription-management__status--danger';
  if (normalized === 'EXPIRED') return 'subscription-management__status--expired';
  return 'subscription-management__status--pending';
}

function isActiveLike(status: string) {
  const normalized = status.toUpperCase();
  return normalized === 'ACTIVE' || normalized === 'TRIAL';
}

export default function SubscriptionManagement({ searchTerm }: SubscriptionManagementProps) {
  const [rows, setRows] = useState<SubscriptionRowDto[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummaryDto>(emptySummary);
  const [analytics, setAnalytics] = useState<SubscriptionAnalyticsDto | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detail, setDetail] = useState<SubscriptionRowDto | null>(null);
  const [actionTarget, setActionTarget] = useState<SubscriptionRowDto | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>('upgrade');
  const [planName, setPlanName] = useState('');
  const [extendDays, setExtendDays] = useState(30);

  const loadSubscriptions = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [listResponse, summaryResponse, analyticsResponse] = await Promise.all([
        getSubscriptions({
          page,
          size,
          q: searchTerm,
          status: statusFilter === 'All' ? undefined : statusFilter
        }),
        getSubscriptionSummary(),
        getSubscriptionAnalytics({ interval: 'DAY' })
      ]);

      setRows(listResponse.data.content);
      setTotalElements(listResponse.data.totalElements);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setSummary(summaryResponse.data);
      setAnalytics(analyticsResponse.data);
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setSummary(emptySummary);
      setAnalytics(null);
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được dữ liệu subscription.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [page, size, searchTerm, statusFilter]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter, planFilter]);

  const filteredRows = useMemo(() => {
    if (planFilter === 'All') {
      return rows;
    }

    return rows.filter(row => row.planName.toLowerCase().includes(planFilter.toLowerCase()));
  }, [rows, planFilter]);

  const chartPoints = analytics?.subscriptionGrowth ?? [];
  const maxChartValue = Math.max(...chartPoints.map(point => Number(point.count ?? 0)), 1);

  const refreshAfterMutation = async (updated?: SubscriptionRowDto) => {
    if (updated) {
      setRows(prev => prev.map(row => (row.id === updated.id ? updated : row)));
    }

    await loadSubscriptions();
  };

  const openDetail = async (row: SubscriptionRowDto) => {
    setActionLoading(true);
    setNotice(null);

    try {
      const response = await getSubscriptionById(String(row.id));
      setDetail(response.data);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được chi tiết subscription.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openAction = (row: SubscriptionRowDto, mode: ActionMode) => {
    setActionTarget(row);
    setActionMode(mode);
    setPlanName(row.planName);
    setExtendDays(30);
  };

  const submitPlanAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actionTarget) {
      return;
    }

    setActionLoading(true);
    setNotice(null);

    try {
      const response = actionMode === 'upgrade'
        ? await upgradeSubscription(String(actionTarget.id), { planName: planName.trim() })
        : actionMode === 'downgrade'
        ? await downgradeSubscription(String(actionTarget.id), { planName: planName.trim() })
        : await extendSubscription(String(actionTarget.id), { days: Math.max(1, extendDays) });

      setActionTarget(null);
      setNotice({
        type: 'success',
        text: actionMode === 'extend' ? 'Đã kéo dài subscription.' : 'Đã cập nhật gói subscription.'
      });
      await refreshAfterMutation(response.data);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không thực hiện được thao tác.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const changeActivation = async (row: SubscriptionRowDto) => {
    setActionLoading(true);
    setNotice(null);

    try {
      const response = isActiveLike(row.status)
        ? await cancelSubscription(String(row.id))
        : await reactivateSubscription(String(row.id));

      setNotice({
        type: 'success',
        text: isActiveLike(row.status) ? 'Đã hủy subscription.' : 'Đã kích hoạt lại subscription.'
      });
      await refreshAfterMutation(response.data);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không đổi được trạng thái subscription.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="subscription-management">
      <section className="subscription-management__metrics">
        <article className="subscription-management__metric-card">
          <div className="subscription-management__metric-icon subscription-management__metric-icon--total">
            <Layers3 />
          </div>
          <div className="subscription-management__metric-body">
            <p>Tổng subscription</p>
            <strong>{formatNumber(summary.total)}</strong>
          </div>
        </article>

        <article className="subscription-management__metric-card">
          <div className="subscription-management__metric-icon subscription-management__metric-icon--active">
            <CheckCircle2 />
          </div>
          <div className="subscription-management__metric-body">
            <p>Đang hoạt động</p>
            <strong>{formatNumber(summary.active)}</strong>
          </div>
          <span className="subscription-management__metric-sub">Trial {formatNumber(summary.trial)}</span>
        </article>

        <article className="subscription-management__metric-card">
          <div className="subscription-management__metric-icon subscription-management__metric-icon--cancelled">
            <XCircle />
          </div>
          <div className="subscription-management__metric-body">
            <p>Đã hủy / lỗi</p>
            <strong>{formatNumber(summary.cancelled + summary.failed)}</strong>
          </div>
          <span className="subscription-management__metric-sub">Hết hạn {formatNumber(summary.expired)}</span>
        </article>
      </section>

      {notice && (
        <div className={`subscription-management__notice subscription-management__notice--${notice.type}`}>
          {notice.text}
        </div>
      )}

      <section className="subscription-management__analytics">
        <div className="subscription-management__chart-card">
          <div className="subscription-management__section-head">
            <div>
              <h2>Phân tích subscription</h2>
              <p>Dữ liệu từ endpoint analytics theo ngày</p>
            </div>
            <BarChart3 />
          </div>
          <div className="subscription-management__chart">
            {chartPoints.length > 0 ? (
              chartPoints.slice(-12).map(point => {
                const value = Number(point.count ?? 0);
                return (
                  <div className="subscription-management__chart-item" key={point.period}>
                    <div
                      className="subscription-management__chart-bar"
                      style={{ height: `${Math.max((value / maxChartValue) * 100, 8)}%` }}
                      title={`${point.period}: ${value}`}
                    />
                    <span>{point.period.slice(5)}</span>
                  </div>
                );
              })
            ) : (
              <div className="subscription-management__chart-empty">Chưa có dữ liệu analytics</div>
            )}
          </div>
        </div>

        <div className="subscription-management__rate-grid">
          <article className="subscription-management__rate-card">
            <div>
              <p>Tỷ lệ chuyển đổi</p>
              <strong>{formatNumber(analytics?.conversionRate ?? 0)}%</strong>
            </div>
            <TrendingUp />
          </article>
          <article className="subscription-management__rate-card subscription-management__rate-card--danger">
            <div>
              <p>Churn rate</p>
              <strong>{formatNumber(analytics?.churnRate ?? 0)}%</strong>
            </div>
            <TrendingDown />
          </article>
          <article className="subscription-management__status-strip">
            <span>Pending {formatNumber(summary.pending)}</span>
            <span>Failed {formatNumber(summary.failed)}</span>
            <span>Expired {formatNumber(summary.expired)}</span>
          </article>
        </div>
      </section>

      <section className="subscription-management__table-card">
        <div className="subscription-management__table-toolbar">
          <div className="subscription-management__table-title">
            <h2>Danh sách subscription</h2>
            <span>{formatNumber(totalElements)}</span>
          </div>
          <div className="subscription-management__filters">
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              {statusOptions.map(status => (
                <option value={status} key={status}>
                  Trạng thái: {status === 'All' ? 'Tất cả' : getStatusLabel(status)}
                </option>
              ))}
            </select>
            <select value={planFilter} onChange={event => setPlanFilter(event.target.value)}>
              {planNameOptions.map(plan => (
                <option value={plan} key={plan}>
                  Gói: {plan === 'All' ? 'Tất cả' : plan}
                </option>
              ))}
            </select>
            <button className="subscription-management__refresh-button" type="button" onClick={loadSubscriptions}>
              <RefreshCw />
              Làm mới
            </button>
          </div>
        </div>

        <div className="subscription-management__table-wrap">
          <table className="subscription-management__table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Gói</th>
                <th>Chu kỳ</th>
                <th>Giá</th>
                <th>Bắt đầu</th>
                <th>Hết hạn</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="subscription-management__empty" colSpan={8}>Đang tải dữ liệu...</td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <button className="subscription-management__person" type="button" onClick={() => openDetail(row)}>
                        <span className="subscription-management__avatar">{getInitials(row.userFullName || row.userEmail)}</span>
                        <span>
                          <strong>{row.userFullName || 'Chưa có tên'}</strong>
                          <small>{row.userEmail}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="subscription-management__plan">{row.planName || '-'}</span>
                      <small className="subscription-management__muted">ID gói {row.planId ?? '-'}</small>
                    </td>
                    <td>{row.billingCycle || '-'}</td>
                    <td className="subscription-management__money">{formatMoney(row.planPrice)}</td>
                    <td className="subscription-management__muted">{formatDate(row.startedAt)}</td>
                    <td className="subscription-management__muted">{formatDate(row.expiresAt)}</td>
                    <td>
                      <span className={`subscription-management__status ${getStatusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      <div className="subscription-management__actions">
                        <button type="button" title="Xem chi tiết" onClick={() => openDetail(row)}>
                          <Eye />
                        </button>
                        <button type="button" title="Nâng cấp gói" onClick={() => openAction(row, 'upgrade')}>
                          <TrendingUp />
                        </button>
                        <button type="button" title="Hạ cấp gói" onClick={() => openAction(row, 'downgrade')}>
                          <TrendingDown />
                        </button>
                        <button type="button" title="Kéo dài thời gian" onClick={() => openAction(row, 'extend')}>
                          <CalendarClock />
                        </button>
                        <button
                          type="button"
                          title={isActiveLike(row.status) ? 'Hủy subscription' : 'Kích hoạt lại'}
                          onClick={() => changeActivation(row)}
                          disabled={actionLoading}
                        >
                          {isActiveLike(row.status) ? <PauseCircle /> : <PlayCircle />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="subscription-management__empty" colSpan={8}>Không có subscription phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="subscription-management__footer">
          <p>Hiển thị {formatNumber(filteredRows.length)} / {formatNumber(totalElements)} subscription</p>
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
        <div className="subscription-management__modal-backdrop">
          <div className="subscription-management__modal">
            <div className="subscription-management__modal-header">
              <h3>Chi tiết subscription</h3>
              <button type="button" onClick={() => setDetail(null)}><X /></button>
            </div>
            <div className="subscription-management__detail-head">
              <span className="subscription-management__avatar subscription-management__avatar--lg">
                {getInitials(detail.userFullName || detail.userEmail)}
              </span>
              <div>
                <strong>{detail.userFullName || 'Chưa có tên'}</strong>
                <p>{detail.userEmail}</p>
              </div>
            </div>
            <div className="subscription-management__detail-grid">
              <div><span>ID subscription</span><strong>{detail.id}</strong></div>
              <div><span>ID user</span><strong>{detail.userId}</strong></div>
              <div><span>Gói</span><strong>{detail.planName}</strong></div>
              <div><span>ID gói</span><strong>{detail.planId}</strong></div>
              <div><span>Chu kỳ</span><strong>{detail.billingCycle || '-'}</strong></div>
              <div><span>Giá</span><strong>{formatMoney(detail.planPrice)}</strong></div>
              <div><span>Bắt đầu</span><strong>{formatDate(detail.startedAt)}</strong></div>
              <div><span>Hết hạn</span><strong>{formatDate(detail.expiresAt)}</strong></div>
              <div><span>Trạng thái</span><strong>{getStatusLabel(detail.status)}</strong></div>
              <div><span>Cập nhật</span><strong>{formatDate(detail.updatedAt)}</strong></div>
            </div>
          </div>
        </div>
      )}

      {actionTarget && (
        <div className="subscription-management__modal-backdrop">
          <div className="subscription-management__modal subscription-management__modal--sm">
            <div className="subscription-management__modal-header">
              <h3>
                {actionMode === 'upgrade'
                  ? 'Nâng cấp gói'
                  : actionMode === 'downgrade'
                  ? 'Hạ cấp gói'
                  : 'Kéo dài subscription'}
              </h3>
              <button type="button" onClick={() => setActionTarget(null)}><X /></button>
            </div>
            <form className="subscription-management__form" onSubmit={submitPlanAction}>
              <div className="subscription-management__warning">
                <AlertTriangle />
                <span>{actionTarget.userEmail}</span>
              </div>
              {actionMode === 'extend' ? (
                <label>
                  Số ngày kéo dài
                  <input
                    min={1}
                    type="number"
                    value={extendDays}
                    onChange={event => setExtendDays(Number(event.target.value))}
                  />
                </label>
              ) : (
                <label>
                  Tên gói mới
                  <input value={planName} onChange={event => setPlanName(event.target.value)} placeholder="VD: Premium" />
                </label>
              )}
              <div className="subscription-management__form-actions">
                <button type="button" onClick={() => setActionTarget(null)}>Hủy</button>
                <button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
