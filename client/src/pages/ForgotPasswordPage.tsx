import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import type { ApiError } from '../types/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiError | undefined;
        setError(data?.error ?? 'Something went wrong. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-2xl">
              ✓
            </span>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-800">Check your email</h1>
          <p className="mb-6 text-sm text-gray-500">
            If <span className="font-medium text-gray-700">{email}</span> is associated with an
            account, you'll receive a password reset link shortly.
          </p>
          <Link
            to="/login"
            className="text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-8 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-800">
          Forgot your password?
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
            />
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
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
