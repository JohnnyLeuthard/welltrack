import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/history', label: 'History' },
  { to: '/trends', label: 'Trends' },
  { to: '/settings', label: 'Settings' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

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
          <p className="mb-0.5 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
            {user?.displayName ?? user?.email}
          </p>
          {user?.displayName && (
            <p className="mb-3 truncate text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
          )}
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
