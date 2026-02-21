import { createHash, randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { sendPasswordResetEmail } from './email.service';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signAccessToken(userId: string, email: string): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ userId, email }, secret, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(userId: string): string {
  const secret = process.env['JWT_REFRESH_SECRET'];
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  // jti (JWT ID) ensures uniqueness even when issued in the same second
  return jwt.sign({ userId, jti: randomUUID() }, secret, { expiresIn: REFRESH_TOKEN_TTL });
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResult {
  user: { id: string; email: string; displayName: string | null };
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refreshTokens(incomingToken: string): Promise<RefreshResult> {
  const secret = process.env['JWT_REFRESH_SECRET'];
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');

  // 1. Verify JWT signature and expiry
  let payload: { userId: string };
  try {
    payload = jwt.verify(incomingToken, secret) as { userId: string };
  } catch {
    const err = new Error('Invalid or expired refresh token');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  // 2. Check the token exists in the DB and hasn't expired
  const stored = await prisma.refreshToken.findUnique({ where: { token: incomingToken } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token: incomingToken } });
    const err = new Error('Invalid or expired refresh token');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  // 3. Look up the user to embed email in the new access token
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    await prisma.refreshToken.delete({ where: { token: incomingToken } });
    const err = new Error('Invalid or expired refresh token');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  // 4. Rotate: delete old token, issue new ones
  await prisma.refreshToken.delete({ where: { token: incomingToken } });

  const accessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, displayName: true, passwordHash: true },
  });

  if (!user) {
    const err = new Error('Invalid email or password');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    (err as Error & { status: number }).status = 401;
    throw err;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    accessToken,
    refreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  // Silently ignore tokens that don't exist — logout is idempotent
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface ForgotPasswordInput {
  email: string;
  /** Base URL used to build the reset link, e.g. "https://app.example.com" */
  appBaseUrl: string;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always return without error — never reveal whether the email is registered
  if (!user) return;

  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  // Generate a cryptographically random token and hash it for storage
  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${input.appBaseUrl}/reset-password?token=${rawToken}`;
  sendPasswordResetEmail(user.email, resetUrl);
}

export interface ResetPasswordInput {
  /** The raw token from the reset URL query string */
  token: string;
  newPassword: string;
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const hashedToken = createHash('sha256').update(input.token).digest('hex');

  const record = await prisma.passwordResetToken.findUnique({ where: { token: hashedToken } });

  if (!record || record.used || record.expiresAt < new Date()) {
    const err = new Error('Invalid or expired password reset token');
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  // Update password, mark token used, and revoke all refresh tokens in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const err = new Error('Email already in use');
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      displayName: input.displayName ?? null,
    },
    select: { id: true, email: true, displayName: true },
  });

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { user, accessToken, refreshToken };
}
