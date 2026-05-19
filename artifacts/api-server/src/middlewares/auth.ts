import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const sessions = new Map<string, { userId: number; expiresAt: number }>();

export function createSession(userId: number): string {
  const token = `token_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessions.set(token, { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.authUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  next();
}
