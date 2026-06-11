import React, { useEffect, useState } from 'react';
import { Subscription, User, Reminder, Transaction, AuditLog, SystemConfig, DashboardTab } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import UserManagement from './components/UserManagement';
import SubscriptionManagement from './components/SubscriptionManagement';
import ReminderTracking from './components/ReminderTracking';
import FinancialAdmin from './components/FinancialAdmin';
import SystemSettings from './components/SystemSettings';
import LoginScreen from './components/LoginScreen';
import {
  AuditLogManagement,
  CheckInManagement,
  NotificationTemplateManagement,
  PlanPricingManagement,
  SafetyManagement
} from './components/AdminMvpModule';
import { X, ShieldAlert, CheckCircle } from 'lucide-react';
import {
  adminSettingsToSystemConfig,
  getActivityLog,
  getAdminSettings,
  getAdminUsers,
  getDashboardOverview,
  getFinanceTransactions,
  getReminders,
  getSubscriptions,
  logoutAdmin,
  type AdminUserRowDto,
  type ActivityLogDto,
  type DashboardOverviewDto,
  type ReminderRowDto,
  type TransactionRowDto,
  type SubscriptionRowDto,
  type SignInResponseDto,
  cancelSubscription as cancelAdminSubscription
} from './api/adminApi';

const fallbackSystemConfig: SystemConfig = {
  systemName: '',
  timezone: '(GMT+07:00) Bangkok, Hanoi, Jakarta',
  adminEmail: '',
  defaultLang: 'Tiếng Việt',
  autoBackup: false,
  advancedTracking: false
};

const adminSessionKeys = [
  'afterme-admin-email',
  'afterme-admin-token',
  'afterme-admin-name',
  'afterme-admin-role'
];

function clearStoredAdminSession() {
  adminSessionKeys.forEach((key) => localStorage.removeItem(key));
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'NA';
}

function formatDateValue(value: string | null | undefined, includeTime = false) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return includeTime ? parsed.toLocaleString('vi-VN') : parsed.toLocaleDateString('vi-VN');
}

function normalizeUserStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized.includes('ban') || normalized.includes('suspend') || normalized.includes('block') ? 'Bị cấm' : 'Hoạt động';
}

function normalizePlan(planName: string | null | undefined) {
  const normalized = (planName || '').toLowerCase();
  if (normalized.includes('premium')) return 'Premium';
  if (normalized.includes('pro')) return 'Pro';
  return 'Free';
}

function normalizeSubscriptionPlanType(planName: string | null | undefined): Subscription['planType'] {
  const normalized = (planName || '').toLowerCase();
  if (normalized.includes('enterprise')) return 'ENTERPRISE';
  if (normalized.includes('premium') || normalized.includes('pro')) return 'PREMIUM';
  return 'FREE';
}

function normalizeReminderStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('archive')) return 'Failed';
  if (normalized.includes('pause')) return 'Pending';
  return 'Sent';
}

function normalizeTransactionStatus(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('refund')) return 'Hoàn tiền';
  if (normalized.includes('fail')) return 'Thất bại';
  return 'Thành công';
}

function mapUserRowToUser(row: AdminUserRowDto): User {
  return {
    id: row.id.toString(),
    name: row.fullName,
    email: row.email,
    avatar: '',
    status: normalizeUserStatus(row.status),
    plan: normalizePlan(row.currentPlanName),
    joinDate: formatDateValue(row.createdAt)
  };
}

function mapReminderRowToReminder(row: ReminderRowDto): Reminder {
  return {
    id: String(row.id),
    userName: row.userEmail,
    userAvatar: getInitials(row.userEmail),
    title: row.title,
    expectedTime: formatDateValue(row.scheduleTime, true),
    status: normalizeReminderStatus(row.status)
  };
}

function mapTransactionRowToTransaction(row: TransactionRowDto): Transaction {
  return {
    id: String(row.id),
    userName: row.userEmail,
    userAvatar: getInitials(row.userEmail),
    userEmail: row.userEmail,
    amount: row.amount,
    paymentGateway: row.provider === 'PayPal' ? 'PayPal' : 'Stripe',
    status: normalizeTransactionStatus(row.status),
    date: formatDateValue(row.paidAt || row.createdAt, true)
  };
}

function mapSubscriptionRowToSubscription(row: SubscriptionRowDto): Subscription {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    userFullName: row.userFullName,
    planType: normalizeSubscriptionPlanType(row.planName),
    planName: row.planName,
    status: row.status as Subscription['status'],
    startDate: row.startedAt,
    endDate: row.expiresAt,
    autoRenew: row.status === 'ACTIVE',
    amount: row.planPrice,
    currency: 'VND',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    billingCycle: row.billingCycle,
    nextBillingDate: row.expiresAt
  };
}

function mapActivityLogToAuditLog(row: ActivityLogDto): AuditLog {
  return {
    time: formatDateValue(row.createdAt, true),
    userName: row.actor,
    userAvatar: getInitials(row.actor),
    action: `${row.action} - ${row.target}`,
    ip: '-',
    status: 'Thành công'
  };
}

export default function App() {
  const [adminEmail, setAdminEmail] = useState(() => {
    const token = localStorage.getItem('afterme-admin-token');
    return token ? localStorage.getItem('afterme-admin-email') || '' : '';
  });
  // Page Navigation State
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Primary Databases
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>(fallbackSystemConfig);
  const [overview, setOverview] = useState<DashboardOverviewDto | null>(null);

  // Notifications state
  const [notificationsCount, setNotificationsCount] = useState(2);
  const [alertToast, setAlertToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  
  // Detail views modals
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredAdminSession();
      setAdminEmail('');
    };

    window.addEventListener('afterme-admin-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('afterme-admin-auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    if (!adminEmail) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [overviewResult, usersResult, subscriptionsResult, remindersResult, transactionsResult, logsResult, settingsResult] = await Promise.allSettled([
          getDashboardOverview(),
          getAdminUsers({ page: 0, size: 100 }),
          getSubscriptions({ page: 0, size: 100 }),
          getReminders({ page: 0, size: 100 }),
          getFinanceTransactions({ page: 0, size: 100 }),
          getActivityLog({ page: 0, size: 100 }),
          getAdminSettings()
        ]);

        if (cancelled) {
          return;
        }

        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value.data);
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value.data.content.map(mapUserRowToUser));
        }

        if (subscriptionsResult.status === 'fulfilled') {
          setSubscriptions(subscriptionsResult.value.data.content.map(mapSubscriptionRowToSubscription));
        }

        if (remindersResult.status === 'fulfilled') {
          setReminders(remindersResult.value.data.content.map(mapReminderRowToReminder));
        }

        if (transactionsResult.status === 'fulfilled') {
          setTransactions(transactionsResult.value.data.content.map(mapTransactionRowToTransaction));
        }

        if (logsResult.status === 'fulfilled') {
          setAuditLogs(logsResult.value.data.content.map(mapActivityLogToAuditLog));
        }

        if (settingsResult.status === 'fulfilled') {
          setConfig(adminSettingsToSystemConfig(settingsResult.value.data, fallbackSystemConfig));
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setReminders([]);
          setTransactions([]);
          setAuditLogs([]);
          setConfig(fallbackSystemConfig);
          setOverview(null);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [adminEmail]);

  const handleLogin = (session: SignInResponseDto) => {
    localStorage.setItem('afterme-admin-email', session.email);
    localStorage.setItem('afterme-admin-token', session.accessToken);
    localStorage.setItem('afterme-admin-name', session.fullName);
    localStorage.setItem('afterme-admin-role', session.role);
    setAdminEmail(session.email);
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      clearStoredAdminSession();
      setAdminEmail('');
      setActiveTab('overview');
      setSearchTerm('');
    }
  };

  if (!adminEmail) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Alert Dialog trigger helper
  const triggerToast = (text: string, type: 'success' | 'info' = 'success') => {
    setAlertToast({ text, type });
    setTimeout(() => setAlertToast(null), 3000);
  };

  // 1. User Handlers
  const handleAddUser = (newU: Omit<User, 'id' | 'joinDate'>) => {
    const fresh: User = {
      ...newU,
      id: `#USR-${Math.floor(8906 + Math.random() * 1000)}`,
      joinDate: new Date().toLocaleDateString('vi-VN')
    };
    setUsers(prev => [fresh, ...prev]);

    // Push audit log
    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Thêm người quản trị '${fresh.name}'`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã thêm thành công người quản trị ${fresh.name}!`);
  };

  const handleUpdateUser = (updatedU: User) => {
    setUsers(prev => prev.map(u => u.id === updatedU.id ? updatedU : u));
    
    // Log change
    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Cập nhật thông tin ID ${updatedU.id}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã cập nhật tài khoản ${updatedU.name}!`);
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    setUsers(prev => prev.filter(u => u.id !== userId));

    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Xóa người dùng ID ${userId}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã gỡ bỏ tài khoản ${userToDelete?.name || userId}!`, 'info');
  };

  const handleCancelSubscription = async (subscriptionId: number) => {
    try {
      const response = await cancelAdminSubscription(String(subscriptionId));
      setSubscriptions(prev => prev.map((subscription) =>
        subscription.id === subscriptionId
          ? mapSubscriptionRowToSubscription(response.data)
          : subscription
      ));
    } catch {
      setSubscriptions(prev => prev.map((subscription) =>
        subscription.id === subscriptionId
          ? { ...subscription, status: 'CANCELLED' }
          : subscription
      ));
    }

    const sub = subscriptions.find((subscription) => subscription.id === subscriptionId);
    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: sub?.userFullName ?? sub?.userEmail ?? 'Người dùng',
      userAvatar: getInitials(sub?.userEmail ?? 'ND'),
      action: `Hủy đăng ký ID ${subscriptionId}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast('Hủy gói đăng ký thành công.', 'info');
  };

  // 3. Reminders triggers
  const handleSendReminderNow = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: 'Sent' } : r));
    const r = reminders.find(rem => rem.id === id);

    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Gửi nhắc nhở khẩn đến ${r?.userName || id}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã gửi thông báo nhắc nhở thành công cho ${r?.userName}!`);
  };

  const handleTriggerNewReminder = (rem: Omit<Reminder, 'id'>) => {
    const fresh: Reminder = {
      ...rem,
      id: `#RM-${Math.floor(9026 + Math.random() * 1000)}`
    };
    setReminders(prev => [fresh, ...prev]);

    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Thiết lập nhắc nhở tự động cho khách ${rem.userName}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã thiết đặt thành công lịch nhắc cho ${rem.userName}!`);
  };

  // 4. Financial Transaction handlers
  const handleUpdateTransactionStatus = (id: string, status: 'Thành công' | 'Thất bại' | 'Hoàn tiền') => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    const t = transactions.find(trx => trx.id === id);

    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Thay đổi trạng thái giao dịch ${id} sang: ${status}`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast(`Đã cập nhật trạng thái thanh toán GD ${id}!`);
  };

  // 5. Config updates
  const handleChangeConfig = (newC: SystemConfig) => {
    setConfig(newC);
    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: 'Cập nhật tham số cấu hình máy chủ',
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast('Lưu lại cấu hình toàn hệ thống.');
  };

  // Direct CSV File Downloading representation
  const handleExportCSV = (reportType: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = `${reportType}.csv`;

    if (reportType === 'user-report') {
      csvContent += "ID,Nguoi Dung,Email,Trang Thai,Goi Dang Ky,Ngay Tham Gia\n";
      users.forEach(u => {
        csvContent += `"${u.id}","${u.name}","${u.email}","${u.status}","${u.plan}","${u.joinDate}"\n`;
      });
    } else if (reportType === 'finance-report') {
      csvContent += "Ma GD,Nguoi Dung,Email,So Tien,Cong Thanh Toan,Trang Thai,Ngay Tao\n";
      transactions.forEach(t => {
        csvContent += `"${t.id}","${t.userName}","${t.userEmail}",${t.amount},"${t.paymentGateway}","${t.status}","${t.date}"\n`;
      });
    } else {
      csvContent += "Thoi Gian,Hanh Dong,Quan Tri Vien,IP,Trang Thai\n";
      auditLogs.forEach(l => {
        csvContent += `"${l.time}","${l.action}","${l.userName}","${l.ip}","${l.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Push new log
    const log: AuditLog = {
      time: new Date().toLocaleString('vi-VN'),
      userName: 'Nguyễn Quản Trị',
      userAvatar: 'NQ',
      action: `Đã xuất báo cáo: ${
        reportType === 'user-report' 
          ? 'Danh sách người dùng' 
          : reportType === 'finance-report' 
          ? 'Tài chính' 
          : 'Nhật ký hệ thống (Audit Trail)'
      }`,
      ip: '192.168.1.45',
      status: 'Thành công'
    };
    setAuditLogs(prev => [log, ...prev]);
    triggerToast('Tải xuống báo cáo thành công!');
  };

  return (
    <div className="app-root">
      {/* Sidebar (Left-positioned) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSearchTerm(''); // Clear lookups on page flips
        }} 
        config={config} 
        onExport={() => handleExportCSV('user-report')}
        onLogout={handleLogout}
      />

      {/* Main Content Area Side layout */}
      <div className="app-main">
        {/* Header (Floating right-aligned top) */}
        <Header 
          activeTab={activeTab} 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          notificationCount={notificationsCount}
          clearNotifications={() => setNotificationsCount(0)}
        />

        {/* Dynamic Inner views router container */}
        <main className="app-container">
          {activeTab === 'overview' && (
            <DashboardOverview 
              overview={overview}
              transactions={transactions}
              setActiveTab={setActiveTab}
              onViewActivityDetails={setSelectedActivity}
            />
          )}

          {activeTab === 'users' && (
            <UserManagement 
              users={users}
              searchTerm={searchTerm}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionManagement 
              subscriptions={subscriptions}
              searchTerm={searchTerm}
              onCancelSubscription={handleCancelSubscription}
            />
          )}

          {activeTab === 'reminders' && (
            <ReminderTracking 
              reminders={reminders}
              searchTerm={searchTerm}
              onSendReminderNow={handleSendReminderNow}
              onTriggerNewReminder={handleTriggerNewReminder}
            />
          )}

          {activeTab === 'checkins' && (
            <CheckInManagement />
          )}

          {activeTab === 'safety' && (
            <SafetyManagement />
          )}

          {activeTab === 'finance' && (
            <FinancialAdmin 
              transactions={transactions}
              searchTerm={searchTerm}
              onUpdateTransactionStatus={handleUpdateTransactionStatus}
            />
          )}

          {activeTab === 'plans' && (
            <PlanPricingManagement />
          )}

          {activeTab === 'notifications' && (
            <NotificationTemplateManagement />
          )}

          {activeTab === 'audit' && (
            <AuditLogManagement />
          )}

          {activeTab === 'settings' && (
            <SystemSettings 
              config={config}
              onChangeConfig={handleChangeConfig}
              auditLogs={auditLogs}
              onExportCSV={handleExportCSV}
            />
          )}
        </main>
      </div>

      {/* FLOATING ACTION ALERTS TOAST */}
      {alertToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-scale-up">
          <div className={`px-5 py-4.5 rounded-2xl shadow-xl flex items-center gap-3 border ${
            alertToast.type === 'success' 
              ? 'bg-emerald-800 border-emerald-900 text-white' 
              : 'bg-[#002046] border-slate-700 text-white'
          }`}>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <p className="text-xs font-bold leading-tight">{alertToast.text}</p>
          </div>
        </div>
      )}

      {/* ACTIVITY DETAILED POPUP MODAL */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 animate-scale-up overflow-hidden">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-700 font-bold" />
                <span>Chi Tiết Giao Dịch</span>
              </span>
              <button 
                onClick={() => setSelectedActivity(null)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                  {selectedActivity.userAvatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{selectedActivity.userName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedActivity.userEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-bold tracking-wider uppercase text-[10px]">Mã Giao Dịch</p>
                  <p className="text-slate-800 font-mono font-bold mt-1">{selectedActivity.id}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold tracking-wider uppercase text-[10px]">Cổng Thanh Toán</p>
                  <p className="text-slate-800 font-bold mt-1">{selectedActivity.paymentGateway}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold tracking-wider uppercase text-[10px]">Giá Trị</p>
                  <p className="text-emerald-800 font-extrabold mt-1">{(selectedActivity.amount || 0).toLocaleString('vi-VN')} đ</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold tracking-wider uppercase text-[10px]">Trạng thái</p>
                  <p className="text-slate-800 font-bold mt-1">{selectedActivity.status}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-bold tracking-wider uppercase text-[10px]">Thời gian giao dịch</p>
                  <p className="text-slate-800 font-semibold mt-1">{selectedActivity.date}</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setSelectedActivity(null)} 
                  className="px-5 py-2.5 bg-[#002046] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
