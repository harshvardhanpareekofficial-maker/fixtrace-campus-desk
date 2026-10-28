import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json'};
const port = Number(process.env.PORT || 4178);
createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const file = extname(path) ? path : resolve(root, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':`${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control':'no-store'}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`FIXTRACE local preview: http://127.0.0.1:${port}`));
