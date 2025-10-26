import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args)
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests, please try again later."
});
app.use(limiter);
