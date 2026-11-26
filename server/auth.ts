import crypto from 'crypto';
import type {Request, Response, NextFunction} from 'express';
import type {UserAccount} from '../src/types/terraexchange.js';

// Runtime-only fallback signing secret if SESSION_SECRET is not configured in Secrets.
const RUNTIME_SIGNING_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

interface TokenPayload {
  uid: string;
  bid: string;
  exp: number;
}

export function issueSessionToken(user: UserAccount): string {
  const payload: TokenPayload = {
    uid: user.id,
    bid: user.businessId,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', RUNTIME_SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', RUNTIME_SIGNING_SECRET)
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  authUser?: UserAccount;
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function createAuthMiddleware(getUserById: (id: string) => UserAccount | undefined) {
  return {
    optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
      const token = extractBearerToken(req);
      if (token) {
        const payload = verifySessionToken(token);
        if (payload) {
          const user = getUserById(payload.uid);
          if (user) req.authUser = user;
        }
      }
      next();
    },

    requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
      const token = extractBearerToken(req);
      if (!token) {
        res.status(401).json({error: 'Authentication required. Please sign in.'});
        return;
      }
      const payload = verifySessionToken(token);
      if (!payload) {
        res.status(401).json({error: 'Session expired or invalid. Please sign in again.'});
        return;
      }
      const user = getUserById(payload.uid);
      if (!user) {
        res.status(401).json({error: 'Account no longer active.'});
        return;
      }
      req.authUser = user;
      next();
    },

    requireTradeDesk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
      if (!req.authUser || (!req.authUser.isTradeDeskStaff && !req.authUser.isPlatformAdmin)) {
        res.status(403).json({
          error: 'Access restricted to authorised TerraExchange Trade Desk staff.',
        });
        return;
      }
      next();
    },

    requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
      if (!req.authUser || !req.authUser.isPlatformAdmin) {
        res.status(403).json({
          error: 'Access restricted to authorised TerraExchange platform administrators.',
        });
        return;
      }
      next();
    },
  };
}
