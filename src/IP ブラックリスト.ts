// middleware/ipBlock.ts
import { Request, Response, NextFunction } from "express";
import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);

export async function ipBlock(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress;
  const banned = await redis.sismember("blacklist:ips", ip);
  if (banned) {
    return res.status(403).send("Forbidden");
  }
  next();
}
