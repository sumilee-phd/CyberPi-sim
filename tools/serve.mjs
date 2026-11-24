import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.CYBERPI_PORT || 8791);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.glb':'model/gltf-binary', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad path'); return; }
  if (pathname === '/__health') { res.writeHead(200, {'Content-Type':types['.json']}); res.end(JSON.stringify({ok:true,project:'cyberpi-3d-source'})); return; }
  if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
  fs.stat(filename, (err,stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('File not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Content-Length':stat.size, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filename).pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`CyberPi preview: http://127.0.0.1:${port}`));
server.on('error', err => { console.error(err.message); process.exitCode=1; });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit()));
