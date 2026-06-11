import React, { useEffect, useState } from 'react';
import {
  Archive,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileClock,
  ListChecks,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Tags,
  X
} from 'lucide-react';
import {
  archiveAdminPlan,
  createAdminPlan,
  createNotificationTemplate,
  exportAuditLogs,
  getAdminPlans,
  getAdminPlanSummary,
  getAuditLogs,
  getAuditLogSummary,
  getCheckIns,
  getCheckInSummary,
  getNotificationLogs,
  getNotificationSummary,
  getNotificationTemplates,
  getSafetyAlerts,
  getSafetyAlertSummary,
  previewNotificationTemplate,
  resendSafetyAlert,
  retryCheckIn,
  retryNotificationLog,
  updateAdminPlan,
  updateCheckInStatus,
  updateNotificationTemplate,
  updateSafetyAlertStatus,
  type AdminPlanRequest,
  type AdminPlanRowDto,
  type AdminPlanSummaryDto,
  type AuditLogRowDto,
  type AuditLogSummaryDto,
  type CheckInRowDto,
  type CheckInSummaryDto,
  type NotificationLogDto,
  type NotificationSummaryDto,
  type NotificationTemplateDto,
  type NotificationTemplateRequest,
  type SafetyAlertRowDto,
  type SafetyAlertSummaryDto
} from '../api/adminApi';
import '../styles/AdminMvpModule.css';

const pageSize = 10;

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('vi-VN');
}

function formatMoney(value: number | null | undefined) {
  return `${formatNumber(value)} đ`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN');
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (['DONE', 'COMPLETED', 'SUCCESS', 'SENT', 'ACKNOWLEDGED', 'ACTIVE'].includes(normalized)) {
    return 'admin-mvp-module__status--success';
  }
  if (['MISSED', 'FAILED', 'ESCALATED'].includes(normalized)) {
    return 'admin-mvp-module__status--danger';
  }
  return 'admin-mvp-module__status--neutral';
}

function ModuleShell({
  icon,
  title,
  subtitle,
  metrics,
  notice,
  onRefresh,
  children
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string; note: string }>;
  notice?: string;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-mvp-module">
      <section className="admin-mvp-module__hero">
        <div className="admin-mvp-module__hero-icon">{icon}</div>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="admin-mvp-module__refresh" type="button" onClick={onRefresh}>
          <RefreshCw />
          Làm mới
        </button>
      </section>

      {notice && <div className="admin-mvp-module__notice">{notice}</div>}

      <section className="admin-mvp-module__metrics">
        {metrics.map((metric) => (
          <article key={metric.label} className="admin-mvp-module__metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </article>
        ))}
      </section>

      {children}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  setPage
}: {
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="admin-mvp-module__pager">
      <button type="button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
        <ChevronLeft />
      </button>
      <span>
        Trang {page + 1} / {Math.max(totalPages, 1)}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
      >
        <ChevronRight />
      </button>
    </div>
  );
}

export function CheckInManagement() {
  const [summary, setSummary] = useState<CheckInSummaryDto | null>(null);
  const [rows, setRows] = useState<CheckInRowDto[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [summaryResponse, listResponse] = await Promise.all([
        getCheckInSummary(),
        getCheckIns({ page, size: pageSize, status })
      ]);
      setSummary(summaryResponse.data);
      setRows(listResponse.data.content);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setNotice('');
    } catch (error) {
      setRows([]);
      setNotice(error instanceof Error ? error.message : 'Không tải được check-in.');
    }
  };

  useEffect(() => {
    load();
  }, [page, status]);

  const metrics = [
    { label: 'Check-in hôm nay', value: formatNumber(summary?.checkInsToday), note: 'Từ /check-ins/summary' },
    { label: 'Scheduled', value: formatNumber(summary?.scheduled), note: 'Tổng lượt đã lên lịch' },
    { label: 'Missed', value: formatNumber(summary?.missed), note: 'Quá hạn hoặc bị bỏ lỡ' },
    { label: 'Success rate', value: `${formatNumber(summary?.successRate)}%`, note: 'Completed / scheduled' }
  ];

  const runAction = async (id: number, action: 'retry' | 'done' | 'missed') => {
    try {
      const response =
        action === 'retry'
          ? await retryCheckIn(String(id))
          : await updateCheckInStatus(String(id), action === 'done' ? 'DONE' : 'MISSED');
      setRows((current) => current.map((row) => (row.id === id ? response.data : row)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không cập nhật được check-in.');
    }
  };

  return (
    <ModuleShell
      icon={<ListChecks />}
      title="Check-in & execution"
      subtitle="Theo dõi lượt check-in, missed flow, escalation và retry execution."
      metrics={metrics}
      notice={notice}
      onRefresh={load}
    >
      <section className="admin-mvp-module__panel">
        <div className="admin-mvp-module__toolbar">
          <h3>Danh sách check-in</h3>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
            <option value="">Tất cả trạng thái</option>
            {['PENDING', 'DONE', 'COMPLETED', 'MISSED', 'ESCALATED', 'SNOOZED'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="admin-mvp-module__table-wrap">
          <table className="admin-mvp-module__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Reminder</th>
                <th>Scheduled</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Escalation</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.userEmail}</td>
                  <td>{row.reminderTitle}</td>
                  <td>{formatDate(row.scheduledTime)}</td>
                  <td>{formatDate(row.responseDeadline)}</td>
                  <td><span className={`admin-mvp-module__status ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.escalationLevel}</td>
                  <td>
                    <div className="admin-mvp-module__actions">
                      <button type="button" onClick={() => runAction(row.id, 'retry')}>Retry</button>
                      <button type="button" onClick={() => runAction(row.id, 'done')}>Done</button>
                      <button type="button" onClick={() => runAction(row.id, 'missed')}>Missed</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}>Chưa có dữ liệu check-in</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </ModuleShell>
  );
}

export function SafetyManagement() {
  const [summary, setSummary] = useState<SafetyAlertSummaryDto | null>(null);
  const [rows, setRows] = useState<SafetyAlertRowDto[]>([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [summaryResponse, listResponse] = await Promise.all([
        getSafetyAlertSummary(),
        getSafetyAlerts({ page, size: pageSize, status })
      ]);
      setSummary(summaryResponse.data);
      setRows(listResponse.data.content);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setNotice('');
    } catch (error) {
      setRows([]);
      setNotice(error instanceof Error ? error.message : 'Không tải được safety alerts.');
    }
  };

  useEffect(() => {
    load();
  }, [page, status]);

  const runAction = async (id: number, action: 'resend' | 'ack' | 'failed') => {
    try {
      const response =
        action === 'resend'
          ? await resendSafetyAlert(String(id))
          : await updateSafetyAlertStatus(String(id), action === 'ack' ? 'ACKNOWLEDGED' : 'FAILED');
      setRows((current) => current.map((row) => (row.id === id ? response.data : row)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không cập nhật được safety alert.');
    }
  };

  const metrics = [
    { label: 'Open alerts', value: formatNumber(summary?.openAlerts), note: 'Đang cần kiểm tra' },
    { label: 'Sent today', value: formatNumber(summary?.sentToday), note: 'Cảnh báo đã gửi hôm nay' },
    { label: 'Failed delivery', value: formatNumber(summary?.failedDelivery), note: 'Thông báo gửi lỗi' },
    { label: 'Avg response', value: `${formatNumber(summary?.avgResponseMinutes)} phút`, note: 'Thời gian phản hồi TB' }
  ];

  return (
    <ModuleShell
      icon={<ShieldAlert />}
      title="Safety & escalation"
      subtitle="Quản lý cảnh báo an toàn, trusted contact, trạng thái gửi và vị trí."
      metrics={metrics}
      notice={notice}
      onRefresh={load}
    >
      <section className="admin-mvp-module__panel">
        <div className="admin-mvp-module__toolbar">
          <h3>Safety alerts</h3>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
            <option value="">Tất cả trạng thái</option>
            {['SENT', 'FAILED', 'ACKNOWLEDGED'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="admin-mvp-module__table-wrap">
          <table className="admin-mvp-module__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Reminder</th>
                <th>Contact</th>
                <th>Method</th>
                <th>Status</th>
                <th>Location</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.userEmail}</td>
                  <td>{row.reminderTitle}</td>
                  <td>{row.trustedContactName}</td>
                  <td>{row.method}</td>
                  <td><span className={`admin-mvp-module__status ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.locationUrl ? <a href={row.locationUrl} target="_blank" rel="noreferrer">Maps</a> : '-'}</td>
                  <td>
                    <div className="admin-mvp-module__actions">
                      <button type="button" onClick={() => runAction(row.id, 'resend')}>Resend</button>
                      <button type="button" onClick={() => runAction(row.id, 'ack')}>Ack</button>
                      <button type="button" onClick={() => runAction(row.id, 'failed')}>Failed</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}>Chưa có safety alert</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </ModuleShell>
  );
}

const emptyPlanDraft: AdminPlanRequest = {
  name: '',
  price: 0,
  billingCycle: 'MONTHLY',
  maxReminders: 0,
  maxTrustedContacts: 0,
  maxDigitalAssets: 0,
  features: '',
  active: true
};

function planToRequest(plan: AdminPlanRowDto): AdminPlanRequest {
  return {
    name: plan.name,
    price: plan.price,
    billingCycle: plan.billingCycle,
    maxReminders: plan.maxReminders,
    maxTrustedContacts: plan.maxTrustedContacts,
    maxDigitalAssets: plan.maxDigitalAssets,
    features: plan.features,
    active: plan.active
  };
}

export function PlanPricingManagement() {
  const [summary, setSummary] = useState<AdminPlanSummaryDto | null>(null);
  const [rows, setRows] = useState<AdminPlanRowDto[]>([]);
  const [draft, setDraft] = useState<AdminPlanRequest>(emptyPlanDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [summaryResponse, listResponse] = await Promise.all([getAdminPlanSummary(), getAdminPlans()]);
      setSummary(summaryResponse.data);
      setRows(listResponse.data);
      setNotice('');
    } catch (error) {
      setRows([]);
      setNotice(error instanceof Error ? error.message : 'Không tải được plans.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = editingId
        ? await updateAdminPlan(String(editingId), draft)
        : await createAdminPlan(draft);
      setRows((current) => {
        if (!editingId) return [response.data, ...current];
        return current.map((row) => (row.id === editingId ? response.data : row));
      });
      setDraft(emptyPlanDraft);
      setEditingId(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không lưu được plan.');
    }
  };

  const metrics = [
    { label: 'Active plans', value: formatNumber(summary?.activePlans), note: 'Gói đang bán' },
    { label: 'Paid users', value: formatNumber(summary?.paidUsers), note: 'User trả phí' },
    { label: 'Top plan', value: summary?.topPlan || '-', note: 'Theo doanh thu/user' },
    { label: 'Draft changes', value: formatNumber(summary?.draftChanges), note: 'Thay đổi chờ publish' }
  ];

  const featurePreview = draft.features
    .split(/\n|,/)
    .map((feature) => feature.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <ModuleShell icon={<Tags />} title="Plan & pricing" subtitle="Quản lý gói, giá và giới hạn tính năng." metrics={metrics} notice={notice} onRefresh={load}>
      <section className="admin-mvp-module__layout admin-mvp-module__layout--plans">
        <article className="admin-mvp-module__panel admin-plan-editor">
          <div className="admin-mvp-module__toolbar">
            <div>
              <h3>{editingId ? 'Sửa gói dịch vụ' : 'Tạo gói dịch vụ'}</h3>
              <p>Thiết lập giá, chu kỳ thanh toán, hạn mức và danh sách quyền lợi.</p>
            </div>
          </div>
          <form className="admin-mvp-module__form admin-plan-editor__form" onSubmit={save}>
            <section className="admin-plan-editor__section">
              <div className="admin-plan-editor__section-title">
                <strong>Thông tin gói</strong>
                <span>Tên hiển thị và trạng thái kinh doanh</span>
              </div>
              <label className="admin-plan-editor__field admin-plan-editor__field--wide">
                <span>Tên gói</span>
                <input placeholder="Ví dụ: PREMIUM, FAMILY" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
              </label>
              <label className="admin-mvp-module__checkbox admin-plan-editor__switch">
                <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
                <span>Đang bán gói này</span>
              </label>
            </section>

            <section className="admin-plan-editor__section">
              <div className="admin-plan-editor__section-title">
                <strong>Giá bán</strong>
                <span>Đơn vị hiển thị hiện tại là VND</span>
              </div>
              <div className="admin-plan-editor__grid">
                <label className="admin-plan-editor__field">
                  <span>Giá gói</span>
                  <input type="number" min="0" step="1000" placeholder="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} />
                </label>
                <label className="admin-plan-editor__field">
                  <span>Chu kỳ</span>
                  <select value={draft.billingCycle} onChange={(event) => setDraft({ ...draft, billingCycle: event.target.value })}>
                    <option value="MONTHLY">Hàng tháng</option>
                    <option value="YEARLY">Hàng năm</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="admin-plan-editor__section">
              <div className="admin-plan-editor__section-title">
                <strong>Giới hạn sử dụng</strong>
                <span>Nhập số lượng tối đa user được dùng trong mỗi gói</span>
              </div>
              <div className="admin-plan-editor__grid admin-plan-editor__grid--limits">
                <label className="admin-plan-editor__field">
                  <span>Reminders</span>
                  <input type="number" min="0" value={draft.maxReminders} onChange={(event) => setDraft({ ...draft, maxReminders: Number(event.target.value) })} />
                </label>
                <label className="admin-plan-editor__field">
                  <span>Trusted contacts</span>
                  <input type="number" min="0" value={draft.maxTrustedContacts} onChange={(event) => setDraft({ ...draft, maxTrustedContacts: Number(event.target.value) })} />
                </label>
                <label className="admin-plan-editor__field">
                  <span>Digital assets</span>
                  <input type="number" min="0" value={draft.maxDigitalAssets} onChange={(event) => setDraft({ ...draft, maxDigitalAssets: Number(event.target.value) })} />
                </label>
              </div>
            </section>

            <section className="admin-plan-editor__section">
              <div className="admin-plan-editor__section-title">
                <strong>Tính năng</strong>
                <span>Mỗi dòng hoặc mỗi dấu phẩy là một quyền lợi</span>
              </div>
              <label className="admin-plan-editor__field admin-plan-editor__field--wide">
                <span>Danh sách quyền lợi</span>
                <textarea placeholder="Ví dụ: Nhắc nhở không giới hạn, Ưu tiên SMS, Lưu tài sản số" value={draft.features} onChange={(event) => setDraft({ ...draft, features: event.target.value })} />
              </label>
            </section>

            <aside className="admin-plan-editor__preview">
              <div>
                <span className={`admin-mvp-module__status ${statusClass(draft.active ? 'ACTIVE' : 'FAILED')}`}>{draft.active ? 'ACTIVE' : 'ARCHIVED'}</span>
                <h4>{draft.name || 'Tên gói'}</h4>
                <strong>{formatMoney(draft.price)}</strong>
                <p>{draft.billingCycle === 'YEARLY' ? 'Thanh toán hàng năm' : 'Thanh toán hàng tháng'}</p>
              </div>
              <div className="admin-plan-editor__preview-limits">
                <span>{formatNumber(draft.maxReminders)} reminders</span>
                <span>{formatNumber(draft.maxTrustedContacts)} contacts</span>
                <span>{formatNumber(draft.maxDigitalAssets)} assets</span>
              </div>
              <ul>
                {(featurePreview.length ? featurePreview : ['Chưa nhập quyền lợi']).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </aside>

            <div className="admin-mvp-module__form-actions admin-plan-editor__actions">
              <button type="submit"><Save /> {editingId ? 'Cập nhật gói' : 'Tạo gói'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyPlanDraft); }}><X /> Hủy chỉnh sửa</button>}
            </div>
          </form>
        </article>
        <article className="admin-mvp-module__panel admin-plan-list">
          <div className="admin-mvp-module__toolbar">
            <div>
              <h3>Danh sách plan</h3>
              <p>Quản lý trạng thái, giá và hạn mức từng gói.</p>
            </div>
          </div>
          <div className="admin-mvp-module__table-wrap">
            <table className="admin-mvp-module__table admin-plan-list__table">
              <thead><tr><th>Plan</th><th>Giá</th><th>Giới hạn</th><th>Tính năng</th><th>Status</th><th>Thao tác</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-plan-list__name">
                        <strong>{row.name}</strong>
                        <span>{row.billingCycle === 'YEARLY' ? 'Hàng năm' : 'Hàng tháng'}</span>
                      </div>
                    </td>
                    <td><strong>{formatMoney(row.price)}</strong></td>
                    <td>
                      <div className="admin-plan-list__limits">
                        <span>{formatNumber(row.maxReminders)} reminders</span>
                        <span>{formatNumber(row.maxTrustedContacts)} contacts</span>
                        <span>{formatNumber(row.maxDigitalAssets)} assets</span>
                      </div>
                    </td>
                    <td className="admin-plan-list__features">{row.features || '-'}</td>
                    <td><span className={`admin-mvp-module__status ${statusClass(row.active ? 'ACTIVE' : 'FAILED')}`}>{row.active ? 'ACTIVE' : 'ARCHIVED'}</span></td>
                    <td>
                      <div className="admin-mvp-module__actions">
                        <button type="button" onClick={() => { setEditingId(row.id); setDraft(planToRequest(row)); }}>Sửa</button>
                        <button type="button" onClick={async () => { const response = await archiveAdminPlan(String(row.id)); setRows((current) => current.map((item) => item.id === row.id ? response.data : item)); }}><Archive /> Archive</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6}>Chưa có plan</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </ModuleShell>
  );
}

const emptyTemplateDraft: NotificationTemplateRequest = {
  eventType: 'REMINDER_DUE',
  channel: 'PUSH',
  locale: 'vi-VN',
  subject: '',
  body: '',
  variables: [],
  active: true
};

function templateToRequest(template: NotificationTemplateDto): NotificationTemplateRequest {
  return {
    eventType: template.eventType,
    channel: template.channel,
    locale: template.locale,
    subject: template.subject,
    body: template.body,
    variables: template.variables,
    active: template.active
  };
}

export function NotificationTemplateManagement() {
  const [summary, setSummary] = useState<NotificationSummaryDto | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplateDto[]>([]);
  const [logs, setLogs] = useState<NotificationLogDto[]>([]);
  const [draft, setDraft] = useState<NotificationTemplateRequest>(emptyTemplateDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [preview, setPreview] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [summaryResponse, templatesResponse, logsResponse] = await Promise.all([
        getNotificationSummary(),
        getNotificationTemplates(),
        getNotificationLogs({ page: 0, size: pageSize })
      ]);
      setSummary(summaryResponse.data);
      setTemplates(templatesResponse.data);
      setLogs(logsResponse.data.content);
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không tải được notifications.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = editingId ? await updateNotificationTemplate(String(editingId), draft) : await createNotificationTemplate(draft);
      setTemplates((current) => editingId ? current.map((item) => item.id === editingId ? response.data : item) : [response.data, ...current]);
      setDraft(emptyTemplateDraft);
      setEditingId(null);
      setPreview('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không lưu được template.');
    }
  };

  const metrics = [
    { label: 'Sent today', value: formatNumber(summary?.sentToday), note: 'Notification đã gửi' },
    { label: 'Failed', value: formatNumber(summary?.failed), note: 'Thông báo lỗi' },
    { label: 'Templates', value: formatNumber(summary?.templates), note: 'Template active' },
    { label: 'Providers', value: formatNumber(summary?.providers), note: 'Channel/provider' }
  ];

  const variablePreview = draft.variables.length ? draft.variables : ['userName', 'reminderTitle', 'locationUrl'];

  return (
    <ModuleShell icon={<BellRing />} title="Notification & templates" subtitle="Quản lý template và log gửi thông báo." metrics={metrics} notice={notice || preview} onRefresh={load}>
      <section className="admin-mvp-module__layout admin-mvp-module__layout--templates">
        <article className="admin-mvp-module__panel admin-template-editor">
          <div className="admin-mvp-module__toolbar">
            <div>
              <h3>{editingId ? 'Sửa template gửi thông báo' : 'Tạo template gửi thông báo'}</h3>
              <p>Thiết lập nội dung theo event, channel và locale. Biến dùng dạng {'{{variableName}}'}.</p>
            </div>
          </div>
          <form className="admin-mvp-module__form admin-template-editor__form" onSubmit={save}>
            <section className="admin-template-editor__section">
              <div className="admin-template-editor__section-title">
                <strong>Phân loại gửi</strong>
                <span>Chọn trigger và kênh gửi tương ứng</span>
              </div>
              <div className="admin-template-editor__grid">
                <label className="admin-template-editor__field">
                  <span>Event type</span>
                  <select value={draft.eventType} onChange={(event) => setDraft({ ...draft, eventType: event.target.value })}>
                    {['REMINDER_DUE', 'SAFETY_ALERT', 'PAYMENT_FAILED', 'SUBSCRIPTION_EXPIRED'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="admin-template-editor__field">
                  <span>Channel</span>
                  <select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })}>
                    {['PUSH', 'EMAIL', 'SMS'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="admin-template-editor__field">
                  <span>Locale</span>
                  <input placeholder="vi-VN" value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value })} />
                </label>
              </div>
            </section>

            <section className="admin-template-editor__section">
              <div className="admin-template-editor__section-title">
                <strong>Nội dung</strong>
                <span>Subject dùng cho email; push/SMS có thể để ngắn</span>
              </div>
              <label className="admin-template-editor__field admin-template-editor__field--wide">
                <span>Subject</span>
                <input placeholder="Ví dụ: Nhắc nhở AfterMe" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
              </label>
              <label className="admin-template-editor__field admin-template-editor__field--wide">
                <span>Body</span>
                <textarea placeholder="Ví dụ: Đã đến giờ cho {{reminderTitle}}." value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
              </label>
            </section>

            <section className="admin-template-editor__section">
              <div className="admin-template-editor__section-title">
                <strong>Biến dữ liệu</strong>
                <span>Nhập cách nhau bằng dấu phẩy, không cần dấu ngoặc nhọn</span>
              </div>
              <label className="admin-template-editor__field admin-template-editor__field--wide">
                <span>Variables</span>
                <input placeholder="userName, reminderTitle, locationUrl" value={draft.variables.join(', ')} onChange={(event) => setDraft({ ...draft, variables: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              </label>
              <div className="admin-template-editor__chips">
                {variablePreview.map((item) => <span key={item}>{'{{'}{item}{'}}'}</span>)}
              </div>
            </section>

            <aside className="admin-template-editor__preview">
              <div className="admin-template-editor__preview-head">
                <span className={`admin-mvp-module__status ${statusClass(draft.active ? 'ACTIVE' : 'FAILED')}`}>{draft.active ? 'ACTIVE' : 'INACTIVE'}</span>
                <span>{draft.channel} · {draft.locale}</span>
              </div>
              <strong>{draft.subject || 'Subject preview'}</strong>
              <p>{draft.body || 'Body preview sẽ hiển thị ở đây khi admin nhập nội dung template.'}</p>
            </aside>

            <label className="admin-mvp-module__checkbox admin-template-editor__switch">
              <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
              <span>Kích hoạt template này</span>
            </label>

            <div className="admin-mvp-module__form-actions admin-template-editor__actions">
              <button type="submit"><Save /> {editingId ? 'Cập nhật template' : 'Tạo template'}</button>
              {editingId && <button type="button" onClick={async () => { const response = await previewNotificationTemplate(String(editingId), { userName: 'Nguyen Van A', reminderTitle: 'Check-in hằng ngày' }); setPreview(`${response.data.subject}: ${response.data.body}`); }}><Eye /> Preview API</button>}
              {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyTemplateDraft); setPreview(''); }}><X /> Hủy</button>}
            </div>
          </form>
        </article>
        <article className="admin-mvp-module__panel admin-template-list">
          <div className="admin-mvp-module__toolbar">
            <div>
              <h3>Templates</h3>
              <p>Chọn một template để chỉnh sửa nội dung và biến.</p>
            </div>
          </div>
          <div className="admin-mvp-module__card-list">
            {templates.map((template) => (
              <button key={template.id} type="button" className="admin-mvp-module__template-card" onClick={() => { setEditingId(template.id); setDraft(templateToRequest(template)); }}>
                <strong>{template.eventType}</strong>
                <span>{template.channel} - {template.locale}</span>
                <p>{template.subject}</p>
                <small>{template.variables.map((variable) => `{{${variable}}}`).join(', ') || 'Không có biến'}</small>
              </button>
            ))}
          </div>
        </article>
      </section>
      <section className="admin-mvp-module__panel">
        <div className="admin-mvp-module__toolbar"><h3>Notification logs</h3></div>
        <div className="admin-mvp-module__table-wrap">
          <table className="admin-mvp-module__table">
            <thead><tr><th>Event</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Provider</th><th>Thao tác</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.eventType}</td>
                  <td>{log.channel}</td>
                  <td>{log.recipient}</td>
                  <td><span className={`admin-mvp-module__status ${statusClass(log.status)}`}>{log.status}</span></td>
                  <td>{log.providerResponse}</td>
                  <td><button type="button" onClick={async () => { const response = await retryNotificationLog(String(log.id)); setLogs((current) => current.map((item) => item.id === log.id ? response.data : item)); }}><Send /> Retry</button></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6}>Chưa có notification log</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </ModuleShell>
  );
}

export function AuditLogManagement() {
  const [summary, setSummary] = useState<AuditLogSummaryDto | null>(null);
  const [rows, setRows] = useState<AuditLogRowDto[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const [summaryResponse, listResponse] = await Promise.all([
        getAuditLogSummary(),
        getAuditLogs({ page, size: pageSize })
      ]);
      setSummary(summaryResponse.data);
      setRows(listResponse.data.content);
      setTotalPages(Math.max(listResponse.data.totalPages, 1));
      setNotice('');
    } catch (error) {
      setRows([]);
      setNotice(error instanceof Error ? error.message : 'Không tải được audit log.');
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const downloadCsv = async () => {
    try {
      const csv = await exportAuditLogs();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-logs.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không export được audit log.');
    }
  };

  const metrics = [
    { label: 'Events today', value: formatNumber(summary?.eventsToday), note: 'Thao tác admin hôm nay' },
    { label: 'Failed actions', value: formatNumber(summary?.failedActions), note: 'Thao tác lỗi' },
    { label: 'Sensitive changes', value: formatNumber(summary?.sensitiveChanges), note: 'Plan, safety, subscription' },
    { label: 'Exports', value: formatNumber(summary?.exports), note: 'Lượt xuất dữ liệu' }
  ];

  return (
    <ModuleShell icon={<FileClock />} title="Audit log" subtitle="Theo dõi thao tác nhạy cảm của admin." metrics={metrics} notice={notice} onRefresh={load}>
      <section className="admin-mvp-module__panel">
        <div className="admin-mvp-module__toolbar">
          <h3>Audit events</h3>
          <button type="button" onClick={downloadCsv}>Export CSV</button>
        </div>
        <div className="admin-mvp-module__table-wrap">
          <table className="admin-mvp-module__table">
            <thead><tr><th>Actor</th><th>Action</th><th>Target</th><th>Status</th><th>Metadata</th><th>Time</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.actor}</td>
                  <td>{row.action}</td>
                  <td>{row.targetType} {row.targetId ?? ''}</td>
                  <td><span className={`admin-mvp-module__status ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td className="admin-mvp-module__metadata">{row.metadata || '-'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6}>Chưa có audit log</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </ModuleShell>
  );
}
