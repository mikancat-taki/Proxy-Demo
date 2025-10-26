import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import WebSocket, { WebSocketServer } from 'ws';
import { streamWithRange } from '../utils/range-handler';

export const proxyRouter = Router();

// HTTP プロキシ + Range 対応
proxyRouter.get('/', async (req: Request, res: Response) => {
  const target = req.query.url as string;
  if (!target) return res.status(400).send('url required');

  // Range 対応
  await streamWithRange(target, req, res);
});

// WebSocket 中継
export const setupWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
      // 単純に全クライアントにブロードキャスト
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(msg.toString());
      });
    });
  });
};
