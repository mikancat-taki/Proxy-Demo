import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 20, // 1分に20リクエスト
  message: "Too many requests from this IP, please try again later."
});
