import { Request, Response, NextFunction } from "express";

const BLOCKED_IPS = (process.env.BLOCKED_IPS || "").split(",");
const RISK_DOMAINS = ["phishing.com", "malware.site"];

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  if (BLOCKED_IPS.includes(req.ip)) {
    return res.status(403).json({ error: "Forbidden IP" });
  }
  const url = req.query.url?.toString() || "";
  if (RISK_DOMAINS.some(d => url.includes(d))) {
    return res.status(451).json({ error: "Blocked risky domain" });
  }
  next();
}
