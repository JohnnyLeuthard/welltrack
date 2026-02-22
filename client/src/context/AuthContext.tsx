import { createContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import api, { setAccessToken } from '../services/api';
import type { AuthUser, AuthResponse, RefreshResponse } from '../types/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE'; payload: AuthUser }
  | { type: 'DONE_LOADING' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
    case 'RESTORE':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'DONE_LOADING':
      return { ...state, isLoading: false };
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function storeTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens(): void {
  setAccessToken(null);
  localStorage.removeItem('refreshToken');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On mount: attempt to restore session from stored refresh token
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      dispatch({ type: 'DONE_LOADING' });
      return;
    }

    api
      .post<RefreshResponse>('/api/auth/refresh', { refreshToken: storedRefreshToken })
      .then(({ data }) => {
        storeTokens(data.accessToken, data.refreshToken);
        // Fetch user profile after restoring token
        return api.get<{ id: string; email: string; displayName: string | null }>(
          '/api/users/me',
        );
      })
      .then(({ data }) => {
        dispatch({ type: 'RESTORE', payload: data });
      })
      .catch(() => {
        clearTokens();
        dispatch({ type: 'DONE_LOADING' });
      });
  }, []);

  async function register(email: string, password: string, displayName?: string): Promise<void> {
    const { data } = await api.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      displayName,
    });
    storeTokens(data.accessToken, data.refreshToken);
    dispatch({ type: 'LOGIN', payload: data.user });
  }

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
    storeTokens(data.accessToken, data.refreshToken);
    dispatch({ type: 'LOGIN', payload: data.user });
  }

  async function logout(): Promise<void> {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    clearTokens();
    dispatch({ type: 'LOGOUT' });
    // Fire-and-forget: invalidate on the server
    if (storedRefreshToken) {
      api
        .post('/api/auth/logout', { refreshToken: storedRefreshToken })
        .catch(() => undefined);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

