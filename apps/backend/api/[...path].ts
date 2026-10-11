import type { Request, Response } from 'express';
import app from '../src/index.js';

export default function handler(req: Request, res: Response) {
  // Vercel can pass the dynamic function path without the `/api` prefix.
  // Express mounts the application routes under `/api` and `/api/v1`.
  if (req.url && req.url !== '/' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
