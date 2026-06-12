import React, { useState } from 'react';
import { Search, Bell, HelpCircle, Menu, Settings2, ShieldCheck } from 'lucide-react';
import { DashboardTab } from '../types';
import '../styles/header/Header.css';

interface HeaderProps {
  activeTab: DashboardTab;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  notificationCount: number;
  clearNotifications: () => void;
  onMenuClick: () => void;
}

export default function Header({ 
  activeTab, 
  searchTerm, 
  onSearchChange,
  notificationCount,
  clearNotifications,
  onMenuClick
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getPlaceholderText = () => {
    switch (activeTab) {
      case 'users':
        return 'Tìm kiếm người dùng bằng tên hoặc email...';
      case 'reminders':
        return 'Tìm kiếm nhắc nhở theo tiêu đề hoặc người nhận...';
      case 'finance':
        return 'Tìm kiếm mã giao dịch hoặc email người mua...';
      case 'subscriptions':
        return 'Tìm kiếm tên gói dịch vụ hoặc email...';
      case 'checkins':
        return 'Tìm kiếm check-in theo user, reminder hoặc trạng thái...';
      case 'safety':
        return 'Tìm kiếm safety alert theo user, contact hoặc trạng thái...';
      case 'plans':
        return 'Tìm kiếm plan theo tên, mã gói hoặc feature...';
      case 'notifications':
        return 'Tìm kiếm template, notification log hoặc provider...';
      case 'audit':
        return 'Tìm kiếm audit theo actor, action hoặc target...';
      default:
        return 'Tìm kiếm cài đặt, log, thống kê...';
    }
  };

  return (
    <header className="admin-header">
      <button
        className="admin-header__menu-button"
        type="button"
        aria-label="Mo menu"
        onClick={onMenuClick}
      >
        <Menu />
      </button>

      {/* Search Input Bar */}
      <div className="admin-header__search-shell">
        <div className="admin-header__search-group group">
          <Search className="admin-header__search-icon" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="admin-header__search-input" 
            placeholder={getPlaceholderText()}
          />
          {searchTerm && (
            <button 
              onClick={() => onSearchChange('')}
              className="admin-header__search-clear"
            >
              Hủy
            </button>
          )}
        </div>
      </div>

      {/* Right Action Icons panel */}
      <div className="admin-header__actions">
        {/* Notifications list with trigger */}
        <div className="admin-header__notification-shell">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="admin-header__icon-button admin-header__icon-button--relative"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="admin-header__badge">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="admin-header__notifications-panel">
              <div className="admin-header__notifications-head">
                <span className="admin-header__notifications-title">Thông báo hệ thống</span>
                <button 
                  onClick={() => {
                    clearNotifications();
                    setShowNotifications(false);
                  }}
                  className="admin-header__notifications-clear"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="admin-header__notifications-list">
                {notificationCount > 0 ? (
                  <>
                    <div className="admin-header__notification-item">
                      <p className="admin-header__notification-item-title">Cập nhật tài chính mới</p>
                      <p className="admin-header__notification-item-text">Một gói đăng ký Premium vừa được thanh toán thành công.</p>
                    </div>
                    <div className="admin-header__notification-item">
                      <p className="admin-header__notification-item-title">Cảnh báo nhắc nhở thất bại</p>
                      <p className="admin-header__notification-item-text">Nhắc nhở `#RM-9023` gửi đến người dùng Lê Duy bị lỗi.</p>
                    </div>
                  </>
                ) : (
                  <div className="admin-header__notifications-empty">
                    Không có thông báo mới nào
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Support tooltips or controls */}
        <button className="admin-header__icon-button">
          <HelpCircle className="w-5 h-5" />
        </button>

        <button className="admin-header__icon-button">
          <Settings2 className="w-5 h-5" />
        </button>

        <div className="admin-header__divider"></div>

        {/* Active Application Role badge & profile info */}
        <div className="admin-header__role-shell">
          <div className="admin-header__role-badge">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="admin-header__role-text">Active Server</span>
          </div>
        </div>
      </div>
    </header>
  );
}
