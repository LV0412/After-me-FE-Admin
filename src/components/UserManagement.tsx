import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle,
  Edit,
  Gem,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  X
} from 'lucide-react';
import {
  AdminUserDetailDto,
  AdminUserCreateRequest,
  AdminUserRowDto,
  AdminUserSummaryDto,
  UserResponseDto,
  createAdminUser,
  getAdminUserById,
  getAdminUsers,
  getAdminUsersSummary,
  resetAdminUserSubscription,
  updateAdminUser,
  updateAdminUserStatus
} from '../api/adminApi';
import { User } from '../types';
import '../styles/UserManagement.css';

type UserStatusFilter = 'All' | 'ACTIVE' | 'PENDING' | 'SUSPENDED';
type UserPlanFilter = 'All' | 'Free' | 'Pro' | 'Premium';

interface UserManagementProps {
  searchTerm?: string;
  onUpdateUser?: (user: User) => void;
}

const emptySummary: AdminUserSummaryDto = {
  totalUsers: 0,
  activeUsers: 0,
  pendingUsers: 0,
  suspendedUsers: 0,
  premiumUsers: 0
};

const statusLabel: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  PENDING: 'Chờ duyệt',
  SUSPENDED: 'Bị cấm'
};

const roleOptions = ['ADMIN', 'CUSTOMER', 'CONSULTANT'];
const toneOptions = ['GENTLE', 'NORMAL', 'AGGRESSIVE'];

const emptyCreateUserDraft: AdminUserCreateRequest = {
  email: '',
  passwordHash: '',
  fullName: '',
  tonePreference: 'NORMAL',
  status: 'ACTIVE',
  role: 'CUSTOMER'
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa có';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN');
}

function formatCurrency(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;
}

function initials(name: string | null | undefined, email: string) {
  const source = (name || email || 'U').trim();
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function planLabel(planName: string | null | undefined): UserPlanFilter {
  const normalized = (planName || '').toLowerCase();
  if (normalized.includes('premium')) return 'Premium';
  if (normalized.includes('pro')) return 'Pro';
  return 'Free';
}

function planIcon(plan: UserPlanFilter) {
  if (plan === 'Premium') return <Gem className="user-management__plan-icon user-management__plan-icon--premium" />;
  if (plan === 'Pro') return <Award className="user-management__plan-icon user-management__plan-icon--pro" />;
  return null;
}

function toLocalUser(row: AdminUserRowDto): User {
  const plan = planLabel(row.currentPlanName);
  return {
    id: String(row.id),
    name: row.fullName || row.email,
    email: row.email,
    avatar: '',
    status: row.status === 'SUSPENDED' ? 'Bị cấm' : 'Hoạt động',
    plan: plan === 'All' ? 'Free' : plan,
    joinDate: formatDate(row.createdAt)
  };
}

function createdUserToAdminRow(user: UserResponseDto): AdminUserRowDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    tonePreference: user.tonePreference,
    status: user.status,
    role: user.role,
    currentPlanName: null,
    planExpiresAt: null,
    createdAt: user.createdAt
  };
}

export default function UserManagement({ searchTerm = '', onUpdateUser }: UserManagementProps) {
  const [rows, setRows] = useState<AdminUserRowDto[]>([]);
  const [summary, setSummary] = useState<AdminUserSummaryDto>(emptySummary);
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('All');
  const [planFilter, setPlanFilter] = useState<UserPlanFilter>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUserRowDto | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createDraft, setCreateDraft] = useState<AdminUserCreateRequest>(emptyCreateUserDraft);
  const [detailData, setDetailData] = useState<AdminUserDetailDto | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query: Record<string, string | number> = { page, size };
      if (searchTerm) query.q = searchTerm;
      if (statusFilter !== 'All') query.status = statusFilter;

      const response = await getAdminUsers(query);
      setRows(response.data.content ?? []);
      setTotalElements(response.data.totalElements ?? 0);
      setTotalPages(response.data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [page, size, searchTerm, statusFilter]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await getAdminUsersSummary();
      setSummary(response.data ?? emptySummary);
    } catch {
      setSummary(emptySummary);
    }
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadUsers();
    loadSummary();
  }, [loadUsers, loadSummary]);

  const visibleRows = useMemo(() => {
    if (planFilter === 'All') return rows;
    return rows.filter((row) => planLabel(row.currentPlanName) === planFilter);
  }, [rows, planFilter]);

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;

    try {
      const response = await updateAdminUser(String(editingUser.id), {
        email: editingUser.email,
        fullName: editingUser.fullName,
        tonePreference: editingUser.tonePreference,
        status: editingUser.status,
        role: editingUser.role
      });
      setRows((current) => current.map((row) => (row.id === editingUser.id ? response.data : row)));
      onUpdateUser?.(toLocalUser(response.data));
      setEditingUser(null);
      setNotice('Đã cập nhật thông tin người dùng.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật người dùng thất bại');
    }
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const created = await createAdminUser(createDraft);
      const row = createdUserToAdminRow(created);
      setRows((current) => [row, ...current]);
      setTotalElements((current) => current + 1);
      await loadSummary();
      onUpdateUser?.(toLocalUser(row));
      setCreateDraft(emptyCreateUserDraft);
      setCreatingUser(false);
      setNotice('Đã tạo người dùng mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo người dùng thất bại');
    }
  };

  const changeStatus = async (row: AdminUserRowDto) => {
    const nextStatus = row.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';

    try {
      const response = await updateAdminUserStatus(String(row.id), { status: nextStatus });
      setRows((current) => current.map((item) => (item.id === row.id ? response.data : item)));
      await loadSummary();
      setNotice(nextStatus === 'SUSPENDED' ? 'Đã cấm người dùng.' : 'Đã mở lại người dùng.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đổi trạng thái thất bại');
    }
  };

  const resetSubscription = async (row: AdminUserRowDto) => {
    try {
      const response = await resetAdminUserSubscription(String(row.id));
      setRows((current) => current.map((item) => (item.id === row.id ? response.data : item)));
      await loadSummary();
      setNotice('Đã reset subscription của người dùng.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset subscription thất bại');
    }
  };

  const openDetail = async (row: AdminUserRowDto) => {
    try {
      const response = await getAdminUserById(String(row.id));
      setDetailData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được chi tiết người dùng');
    }
  };

  return (
    <div className="user-management">
      <section className="user-management__metrics">
        <article className="user-management__metric-card">
          <div className="user-management__metric-icon user-management__metric-icon--users">
            <Users />
          </div>
          <div className="user-management__metric-body">
            <p>Tổng người dùng</p>
            <strong>{summary.totalUsers.toLocaleString('vi-VN')}</strong>
          </div>
          <span className="user-management__metric-change user-management__metric-change--up">+12%</span>
        </article>

        <article className="user-management__metric-card">
          <div className="user-management__metric-icon user-management__metric-icon--new">
            <UserPlus />
          </div>
          <div className="user-management__metric-body">
            <p>Người dùng chờ duyệt</p>
            <strong>{summary.pendingUsers.toLocaleString('vi-VN')}</strong>
          </div>
          <span className="user-management__metric-change user-management__metric-change--up">+5%</span>
        </article>

        <article className="user-management__metric-card">
          <div className="user-management__metric-icon user-management__metric-icon--blocked">
            <UserMinus />
          </div>
          <div className="user-management__metric-body">
            <p>Người dùng bị cấm</p>
            <strong>{summary.suspendedUsers.toLocaleString('vi-VN')}</strong>
          </div>
          <span className="user-management__metric-change user-management__metric-change--down">-2%</span>
        </article>
      </section>

      {(error || notice) && (
        <div className={`user-management__notice ${error ? 'user-management__notice--error' : 'user-management__notice--success'}`}>
          {error || notice}
        </div>
      )}

      <section className="user-management__table-card">
        <div className="user-management__table-toolbar">
          <div className="user-management__table-title">
            <h2>Danh sách người dùng</h2>
            <span>Toàn bộ</span>
          </div>

          <div className="user-management__filters">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as UserStatusFilter)}>
              <option value="All">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="SUSPENDED">Bị cấm</option>
            </select>

            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value as UserPlanFilter)}>
              <option value="All">Gói: Tất cả</option>
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Premium">Premium</option>
            </select>

            <button type="button" className="user-management__add-button" onClick={() => setCreatingUser(true)}>
              <Plus />
              <span>Thêm người quản trị</span>
            </button>
          </div>
        </div>

        <div className="user-management__table-wrap">
          <table className="user-management__table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Vai trò</th>
                <th>Gói đăng ký</th>
                <th>Ngày tham gia</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="user-management__empty">Đang tải dữ liệu...</td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="user-management__empty">Không tìm thấy người dùng nào trùng khớp</td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const plan = planLabel(row.currentPlanName);

                  return (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="user-management__person" onClick={() => openDetail(row)}>
                          <span className="user-management__avatar">{initials(row.fullName, row.email)}</span>
                          <span>{row.fullName || 'Chưa đặt tên'}</span>
                        </button>
                      </td>
                      <td className="user-management__email">{row.email}</td>
                      <td>
                        <span className={`user-management__status user-management__status--${row.status.toLowerCase()}`}>
                          {statusLabel[row.status] || row.status}
                        </span>
                      </td>
                      <td className="user-management__role">{row.role}</td>
                      <td>
                        <span className="user-management__plan">
                          {planIcon(plan)}
                          {plan}
                        </span>
                      </td>
                      <td className="user-management__date">{formatDate(row.createdAt)}</td>
                      <td>
                        <div className="user-management__actions">
                          <button onClick={() => setEditingUser(row)} title="Sửa"><Edit /></button>
                          <button onClick={() => changeStatus(row)} title={row.status === 'SUSPENDED' ? 'Mở lại người dùng' : 'Cấm người dùng'}>
                            {row.status === 'SUSPENDED' ? <UserCheck /> : <UserX />}
                          </button>
                          <button onClick={() => resetSubscription(row)} title="Reset subscription"><RotateCcw /></button>
                          <button onClick={() => openDetail(row)} title="Chi tiết"><CheckCircle /></button>
                          <button disabled title="Backend chưa có endpoint xóa user"><Trash2 /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="user-management__footer">
          <p>Hiển thị {visibleRows.length} trên {totalElements.toLocaleString('vi-VN')} người dùng</p>
          <div>
            <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Trước</button>
            <span>Trang {totalPages === 0 ? 0 : page + 1}/{totalPages}</span>
            <button onClick={() => setPage((current) => Math.min(Math.max(totalPages - 1, 0), current + 1))} disabled={totalPages === 0 || page >= totalPages - 1}>Sau</button>
          </div>
        </div>
      </section>

      {editingUser && (
        <div className="user-management__modal-backdrop">
          <div className="user-management__modal user-management__modal--sm">
            <div className="user-management__modal-header">
              <h3>Cập nhật người dùng</h3>
              <button onClick={() => setEditingUser(null)}><X /></button>
            </div>

            <form onSubmit={submitEdit} className="user-management__form">
              <label>
                Họ và tên
                <input value={editingUser.fullName || ''} onChange={(event) => setEditingUser({ ...editingUser, fullName: event.target.value })} required />
              </label>

              <label>
                Email
                <input type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} required />
              </label>

              <div className="user-management__form-grid">
                <label>
                  Trạng thái
                  <select value={editingUser.status} onChange={(event) => setEditingUser({ ...editingUser, status: event.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  Vai trò
                  <select value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value })}>
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
              </div>

              <label>
                Tone preference
                <select value={editingUser.tonePreference} onChange={(event) => setEditingUser({ ...editingUser, tonePreference: event.target.value })}>
                  {toneOptions.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                </select>
              </label>

              <div className="user-management__form-actions">
                <button type="button" onClick={() => setEditingUser(null)}>Hủy</button>
                <button type="submit">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creatingUser && (
        <div className="user-management__modal-backdrop">
          <div className="user-management__modal user-management__modal--sm">
            <div className="user-management__modal-header">
              <h3>Thêm người dùng</h3>
              <button onClick={() => setCreatingUser(false)}><X /></button>
            </div>

            <form onSubmit={submitCreate} className="user-management__form">
              <label>
                Họ và tên
                <input value={createDraft.fullName} onChange={(event) => setCreateDraft({ ...createDraft, fullName: event.target.value })} required />
              </label>

              <label>
                Email
                <input type="email" value={createDraft.email} onChange={(event) => setCreateDraft({ ...createDraft, email: event.target.value })} required />
              </label>

              <label>
                Mật khẩu
                <input type="password" value={createDraft.passwordHash} onChange={(event) => setCreateDraft({ ...createDraft, passwordHash: event.target.value })} minLength={8} required />
              </label>

              <div className="user-management__form-grid">
                <label>
                  Trạng thái
                  <select value={createDraft.status} onChange={(event) => setCreateDraft({ ...createDraft, status: event.target.value })}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </label>

                <label>
                  Vai trò
                  <select value={createDraft.role} onChange={(event) => setCreateDraft({ ...createDraft, role: event.target.value })}>
                    {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
              </div>

              <label>
                Tone preference
                <select value={createDraft.tonePreference} onChange={(event) => setCreateDraft({ ...createDraft, tonePreference: event.target.value })}>
                  {toneOptions.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
                </select>
              </label>

              <div className="user-management__form-actions">
                <button type="button" onClick={() => setCreatingUser(false)}>Hủy</button>
                <button type="submit">Tạo người dùng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailData && (
        <div className="user-management__modal-backdrop">
          <div className="user-management__modal">
            <div className="user-management__modal-header">
              <h3>Chi tiết người dùng</h3>
              <button onClick={() => setDetailData(null)}><X /></button>
            </div>

            <div className="user-management__detail-head">
              <span className="user-management__avatar user-management__avatar--lg">{initials(detailData.user.fullName, detailData.user.email)}</span>
              <div>
                <strong>{detailData.user.fullName || 'Chưa đặt tên'}</strong>
                <p>{detailData.user.email}</p>
              </div>
            </div>

            <div className="user-management__detail-grid">
              <div><span>Vai trò</span><strong>{detailData.user.role}</strong></div>
              <div><span>Trạng thái</span><strong>{statusLabel[detailData.user.status] || detailData.user.status}</strong></div>
              <div><span>Tone</span><strong>{detailData.user.tonePreference}</strong></div>
              <div><span>Gói hiện tại</span><strong>{detailData.user.currentPlanName || 'Free'}</strong></div>
              <div><span>Hết hạn gói</span><strong>{formatDate(detailData.user.planExpiresAt)}</strong></div>
              <div><span>Số subscription</span><strong>{detailData.subscriptionCount}</strong></div>
              <div><span>Số reminder</span><strong>{detailData.reminderCount}</strong></div>
              <div><span>Tổng doanh thu</span><strong>{formatCurrency(detailData.totalRevenue)}</strong></div>
              <div><span>Ngày tạo</span><strong>{formatDate(detailData.user.createdAt)}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
