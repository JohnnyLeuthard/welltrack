import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useIdleLogout } from '../hooks/useIdleLogout';
import api from '../services/api';
import type { UserProfile } from '../types/api';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const navLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/history', label: 'History' },
  { to: '/trends', label: 'Trends' },
  { to: '/settings', label: 'Settings' },
  { to: '/help', label: 'Help' },
  { to: '/contact', label: 'Contact' },
];

export default function AppLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get<UserProfile>('/api/users/me')
      .then((r) => setAvatarUrl(r.data.avatarUrl))
      .catch(() => undefined);
  }, [isAuthenticated]);

  const handleIdleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { state: { idleLogout: true }, replace: true });
  }, [logout, navigate]);

  useIdleLogout(handleIdleLogout, IDLE_TIMEOUT_MS);

  const displayLabel = user?.displayName ?? user?.email;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar — desktop only */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6 py-5">
          <span className="text-lg font-semibold text-teal-600">WellTrack</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-teal-50 dark:bg-teal-900/30 font-medium text-teal-700 dark:text-teal-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-sm font-medium text-teal-700 dark:text-teal-300">
                {(displayLabel ?? '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.displayName ?? user?.email}
              </p>
              {user?.displayName && (
                <p className="truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — extra bottom padding on mobile to clear the bottom nav */}
      <main className="flex-1 overflow-auto pb-16 sm:pb-0">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile only */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sm:hidden">
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center justify-center py-2 text-xs transition-colors',
                isActive ? 'font-medium text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
