const crypto = require('crypto');
const resourceName = GetCurrentResourceName();

function loadConfig() {
  const raw = LoadResourceFile(resourceName, 'config.json');
  if (!raw) {
    print('[zonelycorefivem] config.json not found. Using fallback defaults.');
    return {
      apiKey: '',
      allowedOrigins: [],
      ipWhitelist: [],
      timeSkewSec: 120,
      whitelist: [],
      logCommands: true,
      maxPerMinute: 60
    };
  }
  try {
    const cfg = JSON.parse(raw);
    if (!cfg.maxPerMinute) cfg.maxPerMinute = 60;
    if (cfg.timeSkewSec === undefined) cfg.timeSkewSec = 120;
    return cfg;
  } catch (e) {
    print('[zonelycorefivem] config.json parse error: ' + e.message);
    return {
      apiKey: '',
      allowedOrigins: [],
      ipWhitelist: [],
      timeSkewSec: 120,
      whitelist: [],
      logCommands: true,
      maxPerMinute: 60
    };
  }
}
let Config = loadConfig();

function nowSec() { return Math.floor(Date.now() / 1000); }

const rate = new Map();
function rateLimited(addr) {
  const key = (addr || '').split(':')[0];
  const now = Date.now();
  const item = rate.get(key) || { t: 0, c: 0 };
  if (now - item.t > 60_000) { item.t = now; item.c = 0; }
  item.c++;
  rate.set(key, item);
  return item.c > (Config.maxPerMinute || 60);
}

function ok(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.send(JSON.stringify(obj));
}
function bad(res, code, msg) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.send(JSON.stringify({ status: 'error', message: msg }));
}

function originAllowed(req) {
  if (!Array.isArray(Config.allowedOrigins) || Config.allowedOrigins.length === 0) return true;
  const h = (req.headers['origin'] || req.headers['referer'] || '').toLowerCase();
  return Config.allowedOrigins.some(o => h.startsWith(o.toLowerCase()));
}

function ipAllowed(req) {
  if (!Array.isArray(Config.ipWhitelist) || Config.ipWhitelist.length === 0) return true;
  const ip = (req.address || '').split(':')[0];
  return Config.ipWhitelist.includes(ip);
}

function checkHmac(token, timestamp, command, hmac) {
  if (!token || !hmac) return false;
  const data = `${token}|${timestamp}|${command}`;
  const digest = crypto.createHmac('sha256', token).update(data).digest('hex');
  const a = Buffer.from(digest, 'hex');
  const b = Buffer.from(hmac, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function inWhitelist(cmd) {
  if (!Array.isArray(Config.whitelist) || Config.whitelist.length === 0) return true;
  const base = cmd.trim().replace(/^\//, '').split(/\s+/)[0].toLowerCase();
  return Config.whitelist.some(w => String(w).toLowerCase() === base);
}

SetHttpHandler(function (req, res) {
  try {
    if (req.path === '/zcf/ping') {
      ok(res, { status: 'ok', ts: nowSec() });
      return;
    }
    if (req.path !== '/zcf/exec') { bad(res, 404, 'Not Found'); return; }
    if (req.method !== 'POST') { bad(res, 405, 'Method Not Allowed'); return; }
    if (rateLimited(req.address || '')) { bad(res, 429, 'Too Many Requests'); return; }
    if (!originAllowed(req)) { bad(res, 403, 'Origin not allowed'); return; }
    if (!ipAllowed(req)) { bad(res, 403, 'IP not allowed'); return; }

    let body = '';
    req.setDataHandler(function (chunk) {
      if (!chunk) return;
      body += chunk;
      if (body.length > 2048) {
        bad(res, 413, 'Payload too large');
      }
    });

    req.setDataHandler(function () {
      let payload;
      try { payload = JSON.parse(body || '{}'); } catch (e) { bad(res, 400, 'Invalid JSON'); return; }

      const token = String(payload.token || '');
      const timestamp = parseInt(payload.timestamp || 0, 10);
      const command = String(payload.command || '');
      const hmac = String(payload.hmac || '');

      if (!token || !command) { bad(res, 400, 'Missing fields'); return; }
      if (Config.apiKey && token !== Config.apiKey) { bad(res, 401, 'Unauthorized'); return; }
      if (timestamp && Math.abs(nowSec() - timestamp) > (Config.timeSkewSec || 120)) { bad(res, 401, 'Stale timestamp'); return; }
      if (hmac && !checkHmac(token, timestamp, command, hmac)) { bad(res, 401, 'Bad signature'); return; }
      if (!inWhitelist(command)) { bad(res, 403, 'Command not whitelisted'); return; }

      const cmd = command.trim().replace(/^\//, '');
      if (!cmd) { bad(res, 400, 'Empty command'); return; }

      if (Config.logCommands) {
        print(`[zonelycorefivem] ${req.address || ''} -> ${cmd}`);
      }

      try {
        ExecuteCommand(cmd);
        ok(res, { status: 'ok' });
      } catch (e) {
        bad(res, 500, 'Execution error');
      }
    });
  } catch (e) {
    bad(res, 500, 'Internal error');
  }
});

AddEventHandler('onResourceStart', (res) => {
  if (res === resourceName) {
    print('[zonelycorefivem] Ready. POST /zcf/exec with your signed payload.');
  }
});
AddEventHandler('onResourceStop', (res) => {
  if (res === resourceName) {
    print('[zonelycorefivem] Stopped.');
  }
});
