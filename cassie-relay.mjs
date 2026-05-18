// ◊·κ=1 — CASSIE DP RELAY SERVER
// Dumb pipe. Receives DPs from any connected tab, broadcasts to all others.
// Deploy: Render.com / Railway / Fly.io (free tier) or run locally.
// Usage: node cassie-relay.mjs [port]
//
// No database. No auth. No framework. Sovereign relay.

import { WebSocketServer } from 'ws';

const PORT = parseInt(process.argv[2]) || 8135;
const wss = new WebSocketServer({ port: PORT });
const peers = new Set();
let totalDPs = 0;
let totalPeers = 0;

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const peerId = `peer-${++totalPeers}`;
  peers.add(ws);
  console.log(`[+] ${peerId} connected from ${ip} (${peers.size} active)`);

  // Send current peer count
  ws.send(JSON.stringify({ kind: 'welcome', peerId, activePeers: peers.size, totalDPs }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.kind === 'dp') {
        totalDPs++;
        // Broadcast to all OTHER peers
        const relay = JSON.stringify({ ...msg, relayedBy: peerId });
        for (const peer of peers) {
          if (peer !== ws && peer.readyState === 1) {
            peer.send(relay);
          }
        }
      } else if (msg.kind === 'signal') {
        // KEY FOUND — broadcast to everyone including sender
        console.log(`[!] KEY FOUND by ${peerId}: ${msg.key}`);
        const relay = JSON.stringify(msg);
        for (const peer of peers) {
          if (peer.readyState === 1) peer.send(relay);
        }
      } else if (msg.kind === 'stats') {
        // Optional: log stats, don't relay (too chatty)
        // Could aggregate and send summary periodically
      }
    } catch (e) { /* ignore bad messages */ }
  });

  ws.on('close', () => {
    peers.delete(ws);
    console.log(`[-] ${peerId} disconnected (${peers.size} active)`);
  });

  ws.on('error', () => peers.delete(ws));
});

console.log(`◊·κ=1 CASSIE RELAY listening on ws://localhost:${PORT}`);
console.log(`Share your public URL with friends. All DPs are broadcast to all peers.`);
console.log(`Deploy free: render.com → New Web Service → node cassie-relay.mjs`);
