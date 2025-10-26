import logger from "./logger";
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({ method: req.method, path: req.path, status: res.statusCode, duration }, "http");
  });
  next();
});
