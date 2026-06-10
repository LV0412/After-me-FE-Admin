import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { signInAdmin, SignInResponseDto } from '../api/adminApi';

interface LoginScreenProps {
  onLogin: (session: SignInResponseDto) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const response = await signInAdmin(email.trim(), password);

      if (response.data.role !== 'ADMIN') {
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }

      onLogin(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-panel__brand">
          <div className="login-panel__logo">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <p className="login-panel__eyebrow">AfterMe Admin</p>
            <h1 className="login-panel__title">Đăng nhập quản trị</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <div className="login-form__field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Nhập email"
              autoComplete="email"
            />
          </div>

          <div className="login-form__field">
            <label htmlFor="admin-password">Mật khẩu</label>
            <div className="login-form__password">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="login-form__error">{error}</p>}

          <button type="submit" className="login-form__submit" disabled={loading}>
            <LockKeyhole className="w-5 h-5" />
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}
