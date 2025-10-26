import { Request, Response, NextFunction } from "express";

export default function sriCsp(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'");
  next();
}
