import { SystemConfig } from '../types';

type QueryValue = string | number | boolean | undefined | null;

export interface BaseResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface SignInResponseDto {
  userId: number;
  email: string;
  fullName: string;
  role: string;
  accessToken: string;
  message: string;
}

export interface PagedResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DashboardCardsDto {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  activeSubscriptions: number;
  mrr: number;
  revenueToday: number;
  revenueThisMonth: number;
  failedPayments: number;
  remindersSentToday: number;
}

export interface TimeSeriesPointDto {
  period: string;
  count?: number;
  amount?: number;
  rate?: number;
}

export interface DashboardOverviewDto {
  cards: DashboardCardsDto;
  userGrowth: TimeSeriesPointDto[];
  subscriptionGrowth: TimeSeriesPointDto[];
  revenueTrend: TimeSeriesPointDto[];
  churnTrend: TimeSeriesPointDto[];
}

export interface SubscriptionDto {
  id: number | null;
  planName: string;
  status: string;
  startDate: string;
  endDate: string | null;
  amount: number;
  autoRenew: boolean;
}

export interface NotificationPreferenceDto {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

export interface AccountDetailsDto {
  verificationStatus: string;
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
}

export interface AdminUserRowDto {
  id: number;
  email: string;
  fullName: string;
  tonePreference: string;
  status: string;
  role: string;
  currentPlanName: string | null;
  planExpiresAt: string | null;
  createdAt: string;
}

export interface AdminUserDetailDto {
  user: AdminUserRowDto;
  subscriptionCount: number;
  reminderCount: number;
  totalRevenue: number;
}

export interface AdminUserSummaryDto {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  premiumUsers: number;
}

export interface PagedContentResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SubscriptionRowDto {
  id: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  planId: number;
  planName: string;
  billingCycle: string;
  planPrice: number;
  startedAt: string;
  expiresAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDetailDto extends SubscriptionRowDto {
  userFullName?: string;
  cancellationDate?: string | null;
  cancellationReason?: string | null;
  paymentMethod?: {
    id: number;
    type: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  features?: string[];
}

export interface SubscriptionSummaryDto {
  total: number;
  active: number;
  trial: number;
  expired: number;
  cancelled: number;
  pending: number;
  failed: number;
}

export interface SubscriptionAnalyticsPointDto {
  date: string;
  newSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  activeSubscriptions: number;
  mrrValue: number;
  totalRevenue: number;
}

export interface SubscriptionAnalyticsSummaryDto {
  totalNewSubscriptions: number;
  totalCancelledSubscriptions: number;
  totalExpiredSubscriptions: number;
  netGrowth: number;
  totalRevenueGenerated: number;
  avgMRRGrowth: number;
}

export interface SubscriptionAnalyticsDto {
  subscriptionGrowth: TimeSeriesPointDto[];
  conversionRate: number;
  churnRate: number;
}

export interface SubscriptionUpgradeRequest {
  planId?: number;
  planName?: string;
}

export interface SubscriptionDowngradeRequest {
  planId?: number;
  planName?: string;
}

export interface SubscriptionExtendRequest {
  days: number;
}

export type SubscriptionCancelRequest = Record<string, never>;

export type SubscriptionReactivateRequest = Record<string, never>;

export interface SubscriptionActionResultDto {
  id: number;
  userId: number;
  previousPlan?: string;
  newPlan?: string;
  amount?: number;
  prorationCredit?: number;
  refundAmount?: number;
  status: string;
  startDate?: string;
  endDate?: string;
  upgradedAt?: string;
  downgradedAt?: string;
  extendedAt?: string;
  cancelledAt?: string;
  reactivatedAt?: string;
  nextBillingDate?: string;
  previousStatus?: string;
  previousEndDate?: string;
  newEndDate?: string;
  extensionMonths?: number;
  additionalCost?: number;
  reason?: string;
  discount?: number;
  refundType?: string;
}

export interface ReminderRowDto {
  id: number;
  userId: number;
  userEmail: string;
  title: string;
  scheduleTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderSummaryDto {
  totalReminders: number;
  activeReminders: number;
  sentToday: number;
  successRate: number;
}

export interface ReminderExecutionStatsDto {
  totalInstances: number;
  scheduledToday: number;
  sentToday: number;
  successful: number;
  missed: number;
  escalated: number;
  successRate: number;
}

export interface FinanceSummaryDto {
  revenueToday: number;
  revenueMtd: number;
  revenueYtd: number;
  mrr: number;
  arr: number;
}

export interface RevenueByPlanDto {
  planId: number;
  planName: string;
  revenue: number;
  transactions: number;
}

export interface TransactionRowDto {
  id: number;
  userId: number;
  userEmail: string;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  transactionRef: string;
  paidAt: string | null;
  createdAt: string;
}

export interface TransactionSummaryDto {
  total: number;
  success: number;
  failed: number;
  pending: number;
  refunded: number;
  successfulRevenue: number;
}

export interface AdminSettingsDto {
  values: Record<string, unknown>;
}

export interface ReportOverviewDto {
  dashboard: DashboardCardsDto;
  users: AdminUserSummaryDto;
  subscriptions: SubscriptionSummaryDto;
  reminders: ReminderSummaryDto;
  finance: FinanceSummaryDto;
}

export interface ActivityLogDto {
  id: number;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(path, API_BASE_URL || window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function requestJson<T>(path: string, init?: RequestInit, query?: Record<string, QueryValue>): Promise<BaseResponse<T>> {
  const accessToken = localStorage.getItem('afterme-admin-token');
  const response = await fetch(buildUrl(path, query), {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {})
    },
    credentials: 'include',
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as BaseResponse<T>;

  if (payload && typeof payload.success === 'boolean' && payload.success === false) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

async function requestText(path: string, init?: RequestInit, query?: Record<string, QueryValue>): Promise<string> {
  const response = await fetch(buildUrl(path, query), init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}

function normalizeSettingsSource(values: AdminSettingsDto | null | undefined) {
  if (!values) {
    return {};
  }

  const nestedValues = values.values;
  if (nestedValues && typeof nestedValues === 'object' && !Array.isArray(nestedValues)) {
    return nestedValues as Record<string, unknown>;
  }

  return values as unknown as Record<string, unknown>;
}

export function adminSettingsToSystemConfig(values: AdminSettingsDto | null | undefined, fallback: SystemConfig): SystemConfig {
  const source = normalizeSettingsSource(values);

  return {
    systemName: String(source.systemName ?? fallback.systemName),
    timezone: String(source.timezone ?? fallback.timezone),
    adminEmail: String(source.adminEmail ?? fallback.adminEmail),
    defaultLang: String(source.defaultLang ?? fallback.defaultLang),
    autoBackup: Boolean(source.autoBackup ?? fallback.autoBackup),
    advancedTracking: Boolean(source.advancedTracking ?? fallback.advancedTracking)
  };
}

export function systemConfigToAdminSettings(config: SystemConfig): AdminSettingsDto {
  return {
    values: {
      systemName: config.systemName,
      timezone: config.timezone,
      adminEmail: config.adminEmail,
      defaultLang: config.defaultLang,
      autoBackup: config.autoBackup,
      advancedTracking: config.advancedTracking
    }
  };
}

export function getAdminSettings() {
  return requestJson<AdminSettingsDto>('/api/admin/settings');
}

export function updateAdminSettings(settings: AdminSettingsDto) {
  return requestJson<AdminSettingsDto>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings)
  });
}

export function exportAdminReports(query?: Record<string, QueryValue>) {
  return requestText('/api/admin/reports/export', undefined, query);
}

export function getDashboardOverview(query?: Record<string, QueryValue>) {
  return requestJson<DashboardOverviewDto>('/api/admin/dashboard/overview', undefined, query);
}

export function getDashboardOverviewCards() {
  return requestJson<DashboardCardsDto>('/api/admin/dashboard/overview/cards');
}

export function getAdminUsers(query?: Record<string, QueryValue>) {
  return requestJson<PagedContentResponseDto<AdminUserRowDto>>('/api/admin/users', undefined, query);
}

export function getAdminUserById(id: string) {
  return requestJson<AdminUserDetailDto>(`/api/admin/users/${id}`);
}

export function getAdminUsersSummary() {
  return requestJson<AdminUserSummaryDto>('/api/admin/users/summary');
}

export function updateAdminUser(id: string, body: Record<string, unknown>) {
  return requestJson<AdminUserRowDto>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export function updateAdminUserStatus(id: string, body: Record<string, unknown>) {
  return requestJson<AdminUserRowDto>(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export function resetAdminUserSubscription(id: string) {
  return requestJson<AdminUserRowDto>(`/api/admin/users/${id}/subscription/reset`, {
    method: 'POST'
  });
}

/**
 * GET /api/admin/subscriptions - list subscriptions (paged)
 */
export function getSubscriptions(query?: Record<string, QueryValue>) {
  return requestJson<PagedResponseDto<SubscriptionRowDto>>('/api/admin/subscriptions', undefined, query);
}

export function getSubscriptionById(id: string) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}`);
}

export function getSubscriptionSummary() {
  return requestJson<SubscriptionSummaryDto>('/api/admin/subscriptions/summary');
}

export function getSubscriptionAnalytics(query?: Record<string, QueryValue>) {
  return requestJson<SubscriptionAnalyticsDto>('/api/admin/subscriptions/analytics', undefined, query);
}

export function upgradeSubscription(id: string, body: SubscriptionUpgradeRequest) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}/upgrade`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function downgradeSubscription(id: string, body: SubscriptionDowngradeRequest) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}/downgrade`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function extendSubscription(id: string, body: SubscriptionExtendRequest) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}/extend`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function cancelSubscription(id: string, body?: SubscriptionCancelRequest) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}/cancel`, {
    method: 'POST',
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

export function signInAdmin(email: string, password: string) {
  return requestJson<SignInResponseDto>('/api/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function reactivateSubscription(id: string, body?: SubscriptionReactivateRequest) {
  return requestJson<SubscriptionRowDto>(`/api/admin/subscriptions/${id}/reactivate`, {
    method: 'POST',
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

export function getReminders(query?: Record<string, QueryValue>) {
  return requestJson<PagedResponseDto<ReminderRowDto>>('/api/admin/reminders', undefined, query);
}

export function getReminderById(id: string) {
  return requestJson<ReminderRowDto>(`/api/admin/reminders/${id}`);
}

export function getReminderSummary() {
  return requestJson<ReminderSummaryDto>('/api/admin/reminders/summary');
}

export function getReminderTimeseries(query?: Record<string, QueryValue>) {
  return requestJson<TimeSeriesPointDto[]>('/api/admin/reminders/timeseries', undefined, query);
}

export function getReminderExecutionStats(query?: Record<string, QueryValue>) {
  return requestJson<ReminderExecutionStatsDto>('/api/admin/reminders/execution-stats', undefined, query);
}

export function updateReminderStatus(id: string, body: Record<string, unknown>) {
  return requestJson<ReminderRowDto>(`/api/admin/reminders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

export function getFinanceSummary() {
  return requestJson<FinanceSummaryDto>('/api/admin/finance/summary');
}

export function getFinanceRevenueTimeseries(query?: Record<string, QueryValue>) {
  return requestJson<TimeSeriesPointDto[]>('/api/admin/finance/revenue/timeseries', undefined, query);
}

export function getFinanceRevenueByPlan(query?: Record<string, QueryValue>) {
  return requestJson<RevenueByPlanDto[]>('/api/admin/finance/revenue/by-plan', undefined, query);
}

export function getFinanceTransactions(query?: Record<string, QueryValue>) {
  return requestJson<PagedResponseDto<TransactionRowDto>>('/api/admin/finance/transactions', undefined, query);
}

export function getFinanceTransactionById(id: string) {
  return requestJson<TransactionRowDto>(`/api/admin/finance/transactions/${id}`);
}

export function getFinanceTransactionSummary(query?: Record<string, QueryValue>) {
  return requestJson<TransactionSummaryDto>('/api/admin/finance/transactions/summary', undefined, query);
}

export function getReportOverview() {
  return requestJson<ReportOverviewDto>('/api/admin/reports/overview');
}

export function getActivityLog(query?: Record<string, QueryValue>) {
  return requestJson<PagedResponseDto<ActivityLogDto>>('/api/admin/reports/activity-log', undefined, query);
}
