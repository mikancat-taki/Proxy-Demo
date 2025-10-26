import { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function streamWithRange(url: string, req: Request, res: Response) {
  const range = req.headers.range;
  const headers: any = {};
  if (range) headers.Range = range;

  const response = await fetch(url, { headers });
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  response.body?.pipe(res);
}
