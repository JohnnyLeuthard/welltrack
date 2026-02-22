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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
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
                    ? 'bg-teal-50 font-medium text-teal-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4">
          <p className="mb-0.5 truncate text-sm font-medium text-gray-700">
            {user?.displayName ?? user?.email}
          </p>
          {user?.displayName && (
            <p className="mb-3 truncate text-xs text-gray-400">{user.email}</p>
          )}
          <button
            onClick={() => void logout()}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
