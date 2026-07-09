const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

// 1. Load Environment Variables from .env
const envPath = path.join(__dirname, '.env');
const env = {};
try {
  if (fs.existsSync(envPath)) {
    const dotenvContent = fs.readFileSync(envPath, 'utf8');
    dotenvContent.split('\n').forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) return;
      const index = cleanLine.indexOf('=');
      if (index > 0) {
        const key = cleanLine.substring(0, index).trim();
        let val = cleanLine.substring(index + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    });
  }
} catch (err) {
  console.warn('[WS] Warning: Failed to read .env file, relying on system env.', err);
}

const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[WS] Error: DATABASE_URL is not defined in .env or system environment.');
  process.exit(1);
}

// 2. Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[WS] PostgreSQL Pool Error:', err);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[WS] Failed to connect to PostgreSQL database:', err.message);
  } else {
    console.log('[WS] Connected to PostgreSQL at', res.rows[0].now);
  }
});

// 3. Initialize HTTP Server
const PORT = process.env.WS_PORT || 3005;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('KickSneak Standalone WebSocket Support Chat Server is running\n');
});

// 4. Initialize WebSocket Server
const wss = new WebSocketServer({ server });

// Connections registry
const admins = new Set();
const clients = new Map(); // sessionId -> Set of WebSocket clients

// Keepalive: without this, idle WS connections silently drop (proxies/browsers),
// so messages only appear after a manual refresh. Ping every 25s, drop dead sockets.
const keepAlive = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch { /* socket already closing */ }
  });
}, 25000);
wss.on('close', () => clearInterval(keepAlive));

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query;
  const role = parameters.role || 'client'; // default is client
  const sessionId = parameters.sessionId;
  const userId = parameters.userId;

  ws.role = role;
  ws.sessionId = sessionId;
  ws.userId = userId;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  if (role === 'admin') {
    admins.add(ws);
    console.log(`[WS] Admin connected. Total active admins: ${admins.size}`);
    ws.send(JSON.stringify({ type: 'connected', role: 'admin' }));
  } else {
    if (sessionId) {
      if (!clients.has(sessionId)) {
        clients.set(sessionId, new Set());
      }
      clients.get(sessionId).add(ws);
      console.log(`[WS] Client connected. Session: ${sessionId}. Active clients for session: ${clients.get(sessionId).size}`);
    } else {
      console.log(`[WS] Client connected without session. UserID: ${userId}`);
    }
    ws.send(JSON.stringify({ type: 'connected', role: 'client', sessionId }));
  }

  ws.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.error('[WS] Failed to parse incoming JSON message:', err);
      ws.send(JSON.stringify({ type: 'error', content: 'Invalid JSON format' }));
      return;
    }

    console.log(`[WS] Received event [${msg.type}] from role [${ws.role}]:`, msg);

    if (msg.type === 'message') {
      const sId = msg.sessionId || ws.sessionId;
      const content = msg.content;
      const senderRole = msg.role || (ws.role === 'admin' ? 'admin' : 'user');

      if (!sId || !content) {
        ws.send(JSON.stringify({ type: 'error', content: 'Missing sessionId or content' }));
        return;
      }

      const msgId = crypto.randomUUID();
      const createdAt = new Date();

      try {
        // Persist message to database
        await pool.query(
          `INSERT INTO chat_messages (id, session_id, role, content, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [msgId, sId, senderRole, content, createdAt]
        );
        console.log(`[WS] Saved message ${msgId} to DB for Session ${sId}`);

        const payload = JSON.stringify({
          type: 'message',
          message: {
            id: msgId,
            session_id: sId,
            role: senderRole,
            content: content,
            created_at: createdAt.toISOString()
          }
        });

        // Broadcast to all sockets listening to this session
        if (clients.has(sId)) {
          for (const clientSocket of clients.get(sId)) {
            if (clientSocket.readyState === 1) { // OPEN
              clientSocket.send(payload);
            }
          }
        }

        // Broadcast to all connected admins
        for (const adminSocket of admins) {
          if (adminSocket.readyState === 1) { // OPEN
            adminSocket.send(payload);
          }
        }

      } catch (dbErr) {
        console.error('[WS] Error writing message to PostgreSQL:', dbErr);
        ws.send(JSON.stringify({ type: 'error', content: 'Database save failed' }));
      }

    } else if (msg.type === 'register_session') {
      const sId = msg.sessionId;
      if (!sId) return;

      // Remove from previous session if mapped
      if (ws.sessionId && clients.has(ws.sessionId)) {
        clients.get(ws.sessionId).delete(ws);
      }

      ws.sessionId = sId;
      if (!clients.has(sId)) {
        clients.set(sId, new Set());
      }
      clients.get(sId).add(ws);
      console.log(`[WS] Client bound to Session: ${sId}`);
      ws.send(JSON.stringify({ type: 'registered', sessionId: sId }));

    } else if (msg.type === 'takeover') {
      const sId = msg.sessionId;
      if (!sId) return;

      try {
        await pool.query(
          `UPDATE chat_sessions SET status = 'agent' WHERE id = $1`,
          [sId]
        );
        console.log(`[WS] Session ${sId} status updated to 'agent' (taken over)`);

        const payload = JSON.stringify({
          type: 'status_changed',
          sessionId: sId,
          status: 'agent'
        });

        // Notify client and admins
        if (clients.has(sId)) {
          for (const clientSocket of clients.get(sId)) {
            if (clientSocket.readyState === 1) clientSocket.send(payload);
          }
        }
        for (const adminSocket of admins) {
          if (adminSocket.readyState === 1) adminSocket.send(payload);
        }
      } catch (dbErr) {
        console.error('[WS] Error updating status to agent:', dbErr);
      }

    } else if (msg.type === 'close') {
      const sId = msg.sessionId;
      if (!sId) return;

      try {
        await pool.query(
          `UPDATE chat_sessions SET status = 'closed', closed_at = NOW() WHERE id = $1`,
          [sId]
        );
        console.log(`[WS] Session ${sId} status updated to 'closed'`);

        const payload = JSON.stringify({
          type: 'status_changed',
          sessionId: sId,
          status: 'closed'
        });

        // Notify client and admins
        if (clients.has(sId)) {
          for (const clientSocket of clients.get(sId)) {
            if (clientSocket.readyState === 1) clientSocket.send(payload);
          }
        }
        for (const adminSocket of admins) {
          if (adminSocket.readyState === 1) adminSocket.send(payload);
        }
      } catch (dbErr) {
        console.error('[WS] Error closing session in DB:', dbErr);
      }
    }
  });

  ws.on('close', () => {
    if (ws.role === 'admin') {
      admins.delete(ws);
      console.log(`[WS] Admin disconnected. Remaining active admins: ${admins.size}`);
    } else {
      if (ws.sessionId && clients.has(ws.sessionId)) {
        const set = clients.get(ws.sessionId);
        set.delete(ws);
        if (set.size === 0) {
          clients.delete(ws.sessionId);
        }
        console.log(`[WS] Client disconnected from Session: ${ws.sessionId}`);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Connection error for ${ws.role}:`, err);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[WS] Standalone support WebSocket server listening on port ${PORT}`);
});
