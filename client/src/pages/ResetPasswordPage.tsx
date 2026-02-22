import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import type { ApiError } from '../types/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
          <h1 className="mb-2 text-xl font-semibold text-gray-800">Invalid reset link</h1>
          <p className="mb-6 text-sm text-gray-500">
            This password reset link is missing or malformed.
          </p>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      navigate('/login', { state: { passwordReset: true } });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined;
        setError(data?.error ?? 'Reset failed. The link may have expired.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-800">
          Set a new password
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Choose a new password for your account.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">Minimum 8 characters</p>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Set new password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
