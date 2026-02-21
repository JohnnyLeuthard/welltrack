import prisma from '../lib/prisma';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  timezone: string;
  createdAt: Date;
}

export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true },
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
}

export function isValidIANATimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<UserProfile> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
    },
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true },
  });

  return user;
}
