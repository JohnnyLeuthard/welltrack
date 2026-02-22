import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold text-gray-800">
        Welcome{user?.displayName ? `, ${user.displayName}` : ''}!
      </h1>
      <p className="text-gray-500">Dashboard — coming soon</p>
      <button
        onClick={() => void logout()}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700"
      >
        Sign out
      </button>
    </div>
  );
}
