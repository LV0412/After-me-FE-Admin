import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Send,
  X
} from 'lucide-react';
import {
  getReminderById,
  getReminderExecutionStats,
  getReminders,
  getReminderSummary,
  getReminderTimeseries,
  type ReminderExecutionStatsDto,
  type ReminderRowDto,
  type ReminderSummaryDto,
  type TimeSeriesPointDto,
  updateReminderStatus
} from '../api/adminApi';
import { Reminder } from '../types';
import { groupTimeSeries, intervalOptions, type IntervalValue } from '../utils/timeSeries';
import '../styles/ReminderTracking.css';

interface ReminderTrackingProps {
  reminders?: Reminder[];
  searchTerm: string;
  onSendReminderNow?: (reminderId: string) => void;
  onTriggerNewReminder?: (reminder: Omit<Reminder, 'id'>) => void;
}

const statusOptions = ['All', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

const emptySummary: ReminderSummaryDto = {
  totalReminders: 0,
  activeReminders: 0,
  sentToday: 0,
  successRate: 0
};

const emptyExecutionStats: ReminderExecutionStatsDto = {
  totalInstances: 0,
  scheduledToday: 0,
  sentToday: 0,
  successful: 0,
  missed: 0,
  escalated: 0,
  successRate: 0
};

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('vi-VN').format(Number(value ?? 0));
}

function formatPercent(value: number | null | undefined) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value ?? 0))}%`;
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
    .toUpperCase() || 'RM';
}

function getStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE') return 'Hoạt động';
  if (normalized === 'PAUSED') return 'Tạm dừng';
  if (normalized === 'ARCHIVED') return 'Lưu trữ';
  return status || '-';
}

function getStatusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE') return 'reminder-tracking__status--active';
  if (normalized === 'PAUSED') return 'reminder-tracking__status--paused';
  return 'reminder-tracking__status--archived';
}

export default function ReminderTracking({ searchTerm }: ReminderTrackingProps) {
  const [rows, setRows] = useState<ReminderRowDto[]>([]);
  const [summary, setSummary] = useState<ReminderSummaryDto>(emptySummary);
  const [executionStats, setExecutionStats] = useState<ReminderExecutionStatsDto>(emptyExecutionStats);
  const [timeseries, setTimeseries] = useState<TimeSeriesPointDto[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detail, setDetail] = useState<ReminderRowDto | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [chartInterval, setChartInterval] = useState<IntervalValue>('DAY');

  const loadReminders = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [listResponse, summaryResponse, timeseriesResponse, executionResponse] = await Promise.all([
        getReminders({
          page,
          size,
          q: searchTerm,
          status: statusFilter === 'All' ? undefined : statusFilter
        }),
        getReminderSummary(),
        getReminderTimeseries({ interval: chartInterval }),
        getReminderExecutionStats()
      ]);

      setRows(listResponse.data.content);
      setTotalElements(listResponse.data.totalElements);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setSummary(summaryResponse.data);
      setTimeseries(timeseriesResponse.data);
      setExecutionStats(executionResponse.data);
    } catch (error) {
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
      setSummary(emptySummary);
      setTimeseries([]);
      setExecutionStats(emptyExecutionStats);
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được dữ liệu reminder.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [page, size, searchTerm, statusFilter, chartInterval]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

  const chartPoints = useMemo(() => groupTimeSeries(timeseries, chartInterval), [timeseries, chartInterval]);
  const maxChartValue = Math.max(...chartPoints.map(point => Number(point.count ?? 0)), 1);

  const visibleRows = useMemo(() => rows, [rows]);

  const openDetail = async (row: ReminderRowDto) => {
    setActionLoading(true);
    setNotice(null);

    try {
      const response = await getReminderById(String(row.id));
      setDetail(response.data);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được chi tiết reminder.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const changeStatus = async (row: ReminderRowDto, status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED') => {
    setActionLoading(true);
    setNotice(null);

    try {
      const response = await updateReminderStatus(String(row.id), { status });
      setRows(prev => prev.map(item => (item.id === row.id ? response.data : item)));
      setNotice({ type: 'success', text: `Đã cập nhật reminder sang ${getStatusLabel(status)}.` });
      await loadReminders();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không cập nhật được trạng thái reminder.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="reminder-tracking">
      <section className="reminder-tracking__metrics">
        <article className="reminder-tracking__metric-card">
          <div className="reminder-tracking__metric-icon reminder-tracking__metric-icon--total">
            <Bell />
          </div>
          <div>
            <p>Tổng nhắc nhở</p>
            <strong>{formatNumber(summary.totalReminders)}</strong>
          </div>
        </article>

        <article className="reminder-tracking__metric-card">
          <div className="reminder-tracking__metric-icon reminder-tracking__metric-icon--active">
            <Activity />
          </div>
          <div>
            <p>Đang hoạt động</p>
            <strong>{formatNumber(summary.activeReminders)}</strong>
          </div>
        </article>

        <article className="reminder-tracking__metric-card">
          <div className="reminder-tracking__metric-icon reminder-tracking__metric-icon--sent">
            <Send />
          </div>
          <div>
            <p>Đã gửi hôm nay</p>
            <strong>{formatNumber(summary.sentToday)}</strong>
          </div>
        </article>

        <article className="reminder-tracking__metric-card">
          <div className="reminder-tracking__metric-icon reminder-tracking__metric-icon--success">
            <CheckCircle2 />
          </div>
          <div>
            <p>Tỷ lệ thành công</p>
            <strong>{formatPercent(summary.successRate)}</strong>
          </div>
        </article>
      </section>

      {notice && (
        <div className={`reminder-tracking__notice reminder-tracking__notice--${notice.type}`}>
          {notice.text}
        </div>
      )}

      <section className="reminder-tracking__analytics">
        <div className="reminder-tracking__chart-card">
          <div className="reminder-tracking__section-head">
            <div>
              <h2>Timeseries reminder</h2>
              <p>Số reminder được tạo theo ngày từ endpoint timeseries</p>
            </div>
            <div className="reminder-tracking__chart-actions">
              <select value={chartInterval} onChange={event => setChartInterval(event.target.value as IntervalValue)}>
                {intervalOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Clock />
            </div>
          </div>
          <div className="reminder-tracking__chart">
            {chartPoints.length > 0 ? (
              chartPoints.map(point => {
                const value = Number(point.count ?? 0);
                return (
                  <div className="reminder-tracking__chart-item" key={point.period}>
                    <span className="reminder-tracking__chart-tooltip">
                      {point.period}: {formatNumber(value)}
                    </span>
                    <div
                      className="reminder-tracking__chart-bar"
                      style={{ height: `${Math.max((value / maxChartValue) * 100, 8)}%` }}
                    />
                  </div>
                );
              })
            ) : (
              <div className="reminder-tracking__chart-empty">Chưa có dữ liệu timeseries</div>
            )}
          </div>
        </div>

        <div className="reminder-tracking__execution-grid">
          <article className="reminder-tracking__execution-card">
            <span>Instances</span>
            <strong>{formatNumber(executionStats.totalInstances)}</strong>
          </article>
          <article className="reminder-tracking__execution-card">
            <span>Lịch hôm nay</span>
            <strong>{formatNumber(executionStats.scheduledToday)}</strong>
          </article>
          <article className="reminder-tracking__execution-card">
            <span>Successful</span>
            <strong>{formatNumber(executionStats.successful)}</strong>
          </article>
          <article className="reminder-tracking__execution-card reminder-tracking__execution-card--warn">
            <span>Missed / Escalated</span>
            <strong>{formatNumber(executionStats.missed + executionStats.escalated)}</strong>
          </article>
        </div>
      </section>

      <section className="reminder-tracking__table-card">
        <div className="reminder-tracking__table-toolbar">
          <div className="reminder-tracking__table-title">
            <h2>Danh sách reminder</h2>
            <span>{formatNumber(totalElements)}</span>
          </div>
          <div className="reminder-tracking__filters">
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              {statusOptions.map(status => (
                <option value={status} key={status}>
                  Trạng thái: {status === 'All' ? 'Tất cả' : getStatusLabel(status)}
                </option>
              ))}
            </select>
            <button className="reminder-tracking__refresh-button" type="button" onClick={loadReminders}>
              <RefreshCw />
              Làm mới
            </button>
          </div>
        </div>

        <div className="reminder-tracking__table-wrap">
          <table className="reminder-tracking__table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Tiêu đề</th>
                <th>Lịch gửi</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="reminder-tracking__empty" colSpan={6}>Đang tải dữ liệu...</td>
                </tr>
              ) : visibleRows.length > 0 ? (
                visibleRows.map(row => (
                  <tr key={row.id}>
                    <td>
                      <button className="reminder-tracking__person" type="button" onClick={() => openDetail(row)}>
                        <span className="reminder-tracking__avatar">{getInitials(row.userEmail)}</span>
                        <span>
                          <strong>{row.userEmail}</strong>
                          <small>User ID {row.userId}</small>
                        </span>
                      </button>
                    </td>
                    <td className="reminder-tracking__title-cell">{row.title || '-'}</td>
                    <td className="reminder-tracking__muted">{formatDate(row.scheduleTime, true)}</td>
                    <td>
                      <span className={`reminder-tracking__status ${getStatusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    </td>
                    <td className="reminder-tracking__muted">{formatDate(row.createdAt)}</td>
                    <td>
                      <div className="reminder-tracking__actions">
                        <button type="button" title="Xem chi tiết" onClick={() => openDetail(row)}>
                          <Eye />
                        </button>
                        <button
                          type="button"
                          title="Kích hoạt"
                          disabled={actionLoading || row.status === 'ACTIVE'}
                          onClick={() => changeStatus(row, 'ACTIVE')}
                        >
                          <PlayCircle />
                        </button>
                        <button
                          type="button"
                          title="Tạm dừng"
                          disabled={actionLoading || row.status === 'PAUSED'}
                          onClick={() => changeStatus(row, 'PAUSED')}
                        >
                          <PauseCircle />
                        </button>
                        <button
                          type="button"
                          title="Lưu trữ"
                          disabled={actionLoading || row.status === 'ARCHIVED'}
                          onClick={() => changeStatus(row, 'ARCHIVED')}
                        >
                          <Archive />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="reminder-tracking__empty" colSpan={6}>Không có reminder phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="reminder-tracking__footer">
          <p>Hiển thị {formatNumber(visibleRows.length)} / {formatNumber(totalElements)} reminder</p>
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
        <div className="reminder-tracking__modal-backdrop">
          <div className="reminder-tracking__modal">
            <div className="reminder-tracking__modal-header">
              <h3>Chi tiết reminder</h3>
              <button type="button" onClick={() => setDetail(null)}><X /></button>
            </div>
            <div className="reminder-tracking__detail-head">
              <span className="reminder-tracking__avatar reminder-tracking__avatar--lg">
                {getInitials(detail.userEmail)}
              </span>
              <div>
                <strong>{detail.title || 'Reminder'}</strong>
                <p>{detail.userEmail}</p>
              </div>
            </div>
            <div className="reminder-tracking__detail-grid">
              <div><span>ID reminder</span><strong>{detail.id}</strong></div>
              <div><span>ID user</span><strong>{detail.userId}</strong></div>
              <div><span>Email</span><strong>{detail.userEmail}</strong></div>
              <div><span>Trạng thái</span><strong>{getStatusLabel(detail.status)}</strong></div>
              <div><span>Lịch gửi</span><strong>{formatDate(detail.scheduleTime, true)}</strong></div>
              <div><span>Ngày tạo</span><strong>{formatDate(detail.createdAt, true)}</strong></div>
              <div><span>Cập nhật</span><strong>{formatDate(detail.updatedAt, true)}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
