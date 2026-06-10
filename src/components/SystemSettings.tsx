import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { AuditLog, SystemConfig } from '../types';
import {
  exportAdminReports,
  getActivityLog,
  getAdminSettings,
  getReportOverview,
  type ActivityLogDto,
  type AdminSettingsDto,
  type ReportOverviewDto,
  updateAdminSettings
} from '../api/adminApi';
import '../styles/SystemSettings.css';

interface SystemSettingsProps {
  config: SystemConfig;
  onChangeConfig: (newConfig: SystemConfig) => void;
  auditLogs: AuditLog[];
  onExportCSV: (reportName: string) => void;
}

type ExportType = 'users' | 'subscriptions' | 'transactions' | 'reminders';

const emptyOverview: ReportOverviewDto = {
  dashboard: {
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
  users: {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    suspendedUsers: 0,
    premiumUsers: 0
  },
  subscriptions: {
    total: 0,
    active: 0,
    trial: 0,
    expired: 0,
    cancelled: 0,
    pending: 0,
    failed: 0
  },
  reminders: {
    totalReminders: 0,
    activeReminders: 0,
    sentToday: 0,
    successRate: 0
  },
  finance: {
    revenueToday: 0,
    revenueMtd: 0,
    revenueYtd: 0,
    mrr: 0,
    arr: 0
  }
};

function getInitials(value: string) {
  return value
    .replace(/[._:-]+/g, ' ')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AL';
}

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

  return parsed.toLocaleString('vi-VN');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SystemSettings(_: SystemSettingsProps) {
  const [settingsValues, setSettingsValues] = useState<Record<string, unknown>>({
    timezone: '',
    currency: 'VND',
    csvExportEnabled: true,
    auditLogEnabled: false
  });
  const [overview, setOverview] = useState<ReportOverviewDto>(emptyOverview);
  const [activityLogs, setActivityLogs] = useState<ActivityLogDto[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSystemData = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const [settingsResponse, overviewResponse, logsResponse] = await Promise.all([
        getAdminSettings(),
        getReportOverview(),
        getActivityLog({ page, size })
      ]);

      setSettingsValues(settingsResponse.data.values ?? {});
      setOverview(overviewResponse.data);
      setActivityLogs(logsResponse.data.content);
      setTotalElements(logsResponse.data.totalElements);
      setTotalPages(Math.max(logsResponse.data.totalPages, 1));
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không tải được dữ liệu settings/reports.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemData();
  }, [page, size]);

  const updateValue = (key: string, value: unknown) => {
    setSettingsValues(current => ({ ...current, [key]: value }));
  };

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const payload: AdminSettingsDto = { values: settingsValues };
      const response = await updateAdminSettings(payload);
      setSettingsValues(response.data.values ?? {});
      setNotice({ type: 'success', text: 'Đã cập nhật cấu hình admin.' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Không lưu được cấu hình admin.'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: ExportType) => {
    setExporting(type);
    setNotice(null);

    try {
      const csv = await exportAdminReports({ type });
      downloadCsv(csv, `admin-${type}.csv`);
      setNotice({ type: 'success', text: `Đã xuất CSV ${type}.` });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : `Không xuất được CSV ${type}.`
      });
    } finally {
      setExporting(null);
    }
  };

  const csvEnabled = Boolean(settingsValues.csvExportEnabled);
  const auditEnabled = Boolean(settingsValues.auditLogEnabled);

  return (
    <div className="system-settings">
      <section className="system-settings__grid">
        <article className="system-settings__panel system-settings__panel--wide">
          <div className="system-settings__head">
            <Settings />
            <div>
              <h2>Cấu hình admin</h2>
              <p>Dữ liệu từ `GET /api/admin/settings`, lưu bằng `PATCH /api/admin/settings`</p>
            </div>
          </div>

          {notice && (
            <div className={`system-settings__notice system-settings__notice--${notice.type}`}>
              {notice.type === 'error' ? <ShieldAlert /> : <Check />}
              <span>{notice.text}</span>
            </div>
          )}

          <form className="system-settings__form" onSubmit={saveSettings}>
            <div className="system-settings__form-grid">
              <label>
                Timezone
                <input
                  value={String(settingsValues.timezone ?? '')}
                  onChange={event => updateValue('timezone', event.target.value)}
                  placeholder="Asia/Ho_Chi_Minh"
                />
              </label>
              <label>
                Currency
                <input
                  value={String(settingsValues.currency ?? '')}
                  onChange={event => updateValue('currency', event.target.value)}
                  placeholder="VND"
                />
              </label>
            </div>

            <div className="system-settings__toggles">
              <label>
                <input
                  type="checkbox"
                  checked={csvEnabled}
                  onChange={event => updateValue('csvExportEnabled', event.target.checked)}
                />
                <span>
                  <strong>Cho phép xuất CSV</strong>
                  <small>Mapping với `csvExportEnabled` trong AdminSettingsDto.values</small>
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={auditEnabled}
                  onChange={event => updateValue('auditLogEnabled', event.target.checked)}
                />
                <span>
                  <strong>Bật audit log</strong>
                  <small>Mapping với `auditLogEnabled` trong AdminSettingsDto.values</small>
                </span>
              </label>
            </div>

            <div className="system-settings__form-actions">
              <button type="button" onClick={loadSystemData} disabled={loading}>
                <RefreshCw />
                Làm mới
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </form>
        </article>

        <article className="system-settings__panel">
          <div className="system-settings__head">
            <Database />
            <div>
              <h2>Xuất báo cáo</h2>
              <p>BE hỗ trợ type: users, subscriptions, transactions, reminders</p>
            </div>
          </div>

          <div className="system-settings__exports">
            {([
              ['users', 'Người dùng', FileSpreadsheet],
              ['subscriptions', 'Subscriptions', FileSpreadsheet],
              ['transactions', 'Giao dịch', FileText],
              ['reminders', 'Nhắc nhở', FileText]
            ] as const).map(([type, label, Icon]) => (
              <button key={type} type="button" onClick={() => exportReport(type)} disabled={exporting === type || !csvEnabled}>
                <span>
                  <Icon />
                  {label}
                </span>
                <Download />
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="system-settings__overview">
        <article><span>Total users</span><strong>{formatNumber(overview.users.totalUsers)}</strong></article>
        <article><span>Active subscriptions</span><strong>{formatNumber(overview.subscriptions.active)}</strong></article>
        <article><span>Reminder success</span><strong>{formatNumber(overview.reminders.successRate)}%</strong></article>
        <article><span>Revenue today</span><strong>{formatMoney(overview.finance.revenueToday)}</strong></article>
        <article><span>MRR</span><strong>{formatMoney(overview.finance.mrr)}</strong></article>
      </section>

      <section className="system-settings__table-card">
        <div className="system-settings__table-head">
          <div>
            <h2>Activity log</h2>
            <p>Dữ liệu từ `GET /api/admin/reports/activity-log`</p>
          </div>
          <button type="button" onClick={loadSystemData}>
            <RefreshCw />
            Làm mới
          </button>
        </div>

        <div className="system-settings__table-wrap">
          <table className="system-settings__table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="system-settings__empty" colSpan={4}>Đang tải dữ liệu...</td>
                </tr>
              ) : activityLogs.length > 0 ? (
                activityLogs.map(log => (
                  <tr key={`${log.target}-${log.id}`}>
                    <td>
                      <div className="system-settings__actor">
                        <span>{getInitials(log.actor)}</span>
                        <strong>{log.actor}</strong>
                      </div>
                    </td>
                    <td>{log.action}</td>
                    <td className="system-settings__muted">{log.target}</td>
                    <td className="system-settings__muted">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="system-settings__empty" colSpan={4}>Chưa có activity log</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="system-settings__footer">
          <p>Hiển thị {formatNumber(activityLogs.length)} / {formatNumber(totalElements)} log</p>
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
    </div>
  );
}
