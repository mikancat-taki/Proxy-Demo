import { Request, Response } from "express";

export function handleRange(req: Request, res: Response, buffer: Buffer, contentType: string) {
  const range = req.headers.range;
  const total = buffer.length;

  if (!range) {
    res.writeHead(200, { "Content-Type": contentType, "Content-Length": total });
    return res.end(buffer);
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

  const chunk = buffer.slice(start, end + 1);

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${total}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunk.length,
    "Content-Type": contentType
  });

  res.end(chunk);
}
