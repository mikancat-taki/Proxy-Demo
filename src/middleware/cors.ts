import { Request, Response, NextFunction } from "express";

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
}
