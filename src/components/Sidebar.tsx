import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Bell, 
  DollarSign, 
  Settings, 
  Download 
} from 'lucide-react';
import { DashboardTab, SystemConfig } from '../types';
import '../styles/sidebar/Sidebar.css';

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  config: SystemConfig;
  onExport: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, config, onExport }: SidebarProps) {
  const menuItems = [
    { id: 'overview' as DashboardTab, name: 'Tổng quan', icon: LayoutDashboard },
    { id: 'users' as DashboardTab, name: 'Người dùng', icon: Users },
    { id: 'subscriptions' as DashboardTab, name: 'Gói đăng ký', icon: Layers },
    { id: 'reminders' as DashboardTab, name: 'Nhắc nhở', icon: Bell },
    { id: 'finance' as DashboardTab, name: 'Tài chính', icon: DollarSign },
    { id: 'settings' as DashboardTab, name: 'Cài đặt & Báo cáo', icon: Settings },
  ];

  return (
    <aside id="sidebar" className="sidebar">
      {/* Brand Header */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          A
        </div>
        <div>
          <h1 className="sidebar__title" title={config.systemName}>
            Admin Panel
          </h1>
          <p className="sidebar__subtitle">
            Hệ thống quản trị
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar__nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar__nav-item ${
                isActive
                  ? 'sidebar__nav-item--active'
                  : 'sidebar__nav-item--inactive'
              }`}
            >
              <Icon className={`sidebar__nav-icon ${isActive ? 'sidebar__nav-icon--active' : 'sidebar__nav-icon--inactive'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Controls & User Card */}
      <div className="sidebar__footer">
        <button 
          onClick={onExport}
          className="sidebar__export-button"
        >
          <Download className="w-4 h-4" />
          <span>Xuất báo cáo</span>
        </button>

        <div className="sidebar__user-card">
          <img 
            alt="Super Admin Avatar" 
            className="sidebar__avatar"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
          />
          <div className="overflow-hidden">
            <p className="sidebar__user-name">Admin User</p>
            <p className="sidebar__user-role">Quản trị viên cấp cao</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
