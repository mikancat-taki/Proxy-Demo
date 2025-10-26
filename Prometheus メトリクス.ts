import client from "prom-client";
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestCount = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "endpoint", "status"]
});

app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestCount.labels(req.method, req.path, String(res.statusCode)).inc();
  });
  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});
