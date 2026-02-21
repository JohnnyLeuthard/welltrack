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
