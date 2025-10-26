import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { writeHead } from "node:http";

export function createProxyRouter() {
  const router = express.Router();

  router.get("/", async (req: Request, res: Response) => {
    const target = req.query.url?.toString();
    if (!target) return res.status(400).json({ error: "url parameter required" });

    const range = req.headers["range"];
    const headers = { Range: range as string };

    const response = await fetch(target, { headers });
    res.status(response.status);

    for (const [k, v] of response.headers.entries()) {
      res.setHeader(k, v);
    }

    response.body.pipe(res);
  });

  return router;
}
