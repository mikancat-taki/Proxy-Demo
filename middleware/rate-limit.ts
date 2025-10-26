import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = new Redis();

export default rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 1000,
  max: 60
});
