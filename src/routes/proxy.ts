import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

export const proxyRouter = Router();

proxyRouter.get('/', async (req: Request, res: Response) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send('url required');

  const response = await fetch(target);
  response.body?.pipe(res);
});
