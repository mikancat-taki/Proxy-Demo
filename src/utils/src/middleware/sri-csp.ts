import { Request, Response, NextFunction } from 'express';

export function sriCspMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  res.send = function (body: any) {
    if (typeof body === 'string') {
      // 例: <script src="..."> の SRI 付与
      body = body.replace(
        /<script\s+src="([^"]+)"><\/script>/g,
        (_, src) => `<script src="${src}" integrity="sha384-..." crossorigin="anonymous"></script>`
      );
      // CSP ヘッダ設定
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'sha384-...' ");
    }
    return originalSend.call(this, body);
  };
  next();
}
