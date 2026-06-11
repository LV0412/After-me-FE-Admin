export type DashboardTab =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'reminders'
  | 'checkins'
  | 'safety'
  | 'finance'
  | 'plans'
  | 'notifications'
  | 'audit'
  | 'settings';

export interface User {
  id: string; // e.g. USR-8902
  name: string;
  email: string;
  avatar: string;
  status: 'Hoạt động' | 'Bị cấm';
  plan: 'Free' | 'Pro' | 'Premium';
  joinDate: string;
}

export interface Reminder {
  id: string; // e.g. RM-9021
  userName: string;
  userAvatar: string;
  title: string;
  expectedTime: string;
  status: 'Sent' | 'Pending' | 'Failed';
}

export interface Transaction {
  id: string; // e.g. TRX-94812
  userName: string;
  userAvatar: string;
  userEmail: string;
  amount: number; // in VND
  paymentGateway: 'Stripe' | 'PayPal';
  status: 'Thành công' | 'Thất bại' | 'Hoàn tiền';
  date: string;
}

export interface AuditLog {
  time: string;
  userName: string;
  userAvatar: string;
  action: string;
  ip: string;
  status: 'Thành công' | 'Thất bại';
}

export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type SubscriptionPlanType = 'FREE' | 'PREMIUM' | 'ENTERPRISE';

export interface Subscription {
  id: number;
  userId: number;
  userEmail: string;
  userFullName?: string;
  planType: SubscriptionPlanType;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  billingCycle?: string;
  nextBillingDate?: string;
}

export interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface SubscriptionDetail extends Subscription {
  cancellationDate?: string | null;
  cancellationReason?: string | null;
  paymentMethod?: PaymentMethod;
  features?: string[];
}

export interface SystemConfig {
  systemName: string;
  timezone: string;
  adminEmail: string;
  defaultLang: string;
  autoBackup: boolean;
  advancedTracking: boolean;
}
