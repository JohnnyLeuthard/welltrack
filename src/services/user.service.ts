import crypto from 'crypto';
import prisma from '../lib/prisma';
import { AuditAction, recordAuditEvent } from './audit.service';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  pronouns: string | null;
  phoneNumber: string | null;
  timezone: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  weeklyDigestOptIn: boolean;
}

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  pronouns: true,
  phoneNumber: true,
  timezone: true,
  createdAt: true,
  lastLoginAt: true,
  weeklyDigestOptIn: true,
} as const;

export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) {
    const err = new Error('User not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  return user;
}

export interface UpdateMeInput {
  displayName?: string | null;
  pronouns?: string | null;
  phoneNumber?: string | null;
  timezone?: string;
  email?: string;
  weeklyDigestOptIn?: boolean;
}

export function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function deleteMe(userId: string): Promise<void> {
  // Cascade deletes (all logs, tokens, custom symptoms/habits) are handled by FK onDelete: Cascade
  await prisma.user.delete({ where: { id: userId } });
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<UserProfile> {
  if (input.email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing && existing.id !== userId) {
      const err = new Error('Email already in use');
      (err as Error & { status: number }).status = 409;
      throw err;
    }
  }

  // When opting in to the weekly digest, generate a unique unsubscribe token if not already set
  let digestTokenUpdate: { weeklyDigestToken?: string } = {};
  if (input.weeklyDigestOptIn === true) {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyDigestToken: true },
    });
    if (!current?.weeklyDigestToken) {
      digestTokenUpdate = { weeklyDigestToken: crypto.randomBytes(32).toString('hex') };
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.pronouns !== undefined && { pronouns: input.pronouns }),
      ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.weeklyDigestOptIn !== undefined && { weeklyDigestOptIn: input.weeklyDigestOptIn }),
      ...digestTokenUpdate,
    },
    select: USER_SELECT,
  });

  if (input.email !== undefined) {
    await recordAuditEvent(userId, AuditAction.email_change);
  }

  return user;
}

/** One-click unsubscribe from weekly digest via token in email link. */
export async function unsubscribeWeeklyDigest(token: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { weeklyDigestToken: token } });
  if (!user) {
    const err = new Error('Invalid or expired unsubscribe link');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { weeklyDigestOptIn: false },
  });
}
