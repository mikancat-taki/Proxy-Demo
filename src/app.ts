import express from "express";
import compression from "compression";
import cors from "cors";
import logger from "./middleware/logger";
import rateLimit from "./middleware/rate-limit";
import sriCsp from "./middleware/sri-csp";
import security from "./middleware/security";
import proxyRouter from "./routes/proxy";

const app = express();

// ミドルウェア
app.use(cors());
app.use(compression());
app.use(logger);
app.use(rateLimit);
app.use(sriCsp);
app.use(security);

// ルート
app.use("/proxy", proxyRouter);

export default app;
