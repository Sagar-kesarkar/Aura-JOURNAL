import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Extend Express Request type to attach authenticated user info
export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Lazy initialization of Firebase Admin SDK
let firebaseAdminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseAdminApp = existingApps[0]!;
    return firebaseAdminApp;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  let projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  if (isProduction) {
    if (!projectId) {
      throw new Error(
        'GOOGLE_CLOUD_PROJECT environment variable is required in production and could not be determined. Please configure GOOGLE_CLOUD_PROJECT.'
      );
    }
  } else {
    // Development preview / test mode: derive from valid firebase-applet-config.json if unset in environment
    if (!projectId) {
      try {
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const configRaw = fs.readFileSync(configPath, 'utf8');
          const parsed = JSON.parse(configRaw);
          if (parsed && typeof parsed.projectId === 'string' && parsed.projectId.trim()) {
            projectId = parsed.projectId.trim();
            console.log(`[AUTH] Project ID derived from valid firebase-applet-config.json: ${projectId}`);
          }
        }
      } catch (e) {
        console.warn('[AUTH] Could not read firebase-applet-config.json for projectId');
      }
    }

    if (!projectId) {
      throw new Error(
        'Google Cloud Project ID could not be determined. Please set the GOOGLE_CLOUD_PROJECT environment variable or supply a valid firebase-applet-config.json.'
      );
    }
  }

  firebaseAdminApp = initializeApp({
    projectId,
  });

  return firebaseAdminApp;
}

/**
 * Authentication Middleware
 * Enforces valid Firebase ID token in Authorization header.
 * Derives user identity strictly from the verified cryptographically signed token.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Missing or malformed authorization token',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Empty authorization token',
    });
    return;
  }

  // Handle unit test / emulator tokens when explicitly running in test mode
  if (process.env.NODE_ENV === 'test' && token.startsWith('mock-token-')) {
    const mockUid = token.replace('mock-token-', '');
    if (mockUid === 'invalid') {
      res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
      return;
    }
    req.user = {
      uid: mockUid,
      email: `${mockUid}@example.com`,
    };
    next();
    return;
  }

  try {
    const app = getFirebaseAdminApp();
    const adminAuth = getAuth(app);
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken || !decodedToken.uid) {
      res.status(401).json({
        error: 'Unauthorized: Token does not contain a valid user identity',
      });
      return;
    }

    // Bind authenticated identity strictly from verified token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };

    next();
  } catch (error: any) {
    // Never leak token verification details or raw error traces
    const isExpired = error?.code === 'auth/id-token-expired';
    res.status(401).json({
      error: isExpired
        ? 'Unauthorized: Authentication token has expired'
        : 'Unauthorized: Invalid authentication token',
    });
  }
}
