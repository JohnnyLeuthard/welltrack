import prisma from '../lib/prisma';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true, lastLoginAt: true },
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
  timezone?: string;
  email?: string;
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.email !== undefined && { email: input.email }),
    },
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true, lastLoginAt: true },
  });

  return user;
}
