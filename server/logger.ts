import { Request, Response, NextFunction } from 'express';

export function privacyPreservingLogger(req: Request, res: Response, next: NextFunction) {
  const reqId = Math.random().toString(36).substring(2, 10);
  const startTime = Date.now();
  
  // Attach reqId to request
  (req as any).reqId = reqId;

  // Log incoming request metadata only (NO bodies, NO tokens, NO query secrets)
  const path = req.path;
  const method = req.method;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    // Privacy-preserving log: method, path, status, duration only
    console.log(`[REQ ${reqId}] ${method} ${path} -> ${statusCode} (${duration}ms)`);
  });

  next();
}
