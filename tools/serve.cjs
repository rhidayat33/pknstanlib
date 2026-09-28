// Local preview only: never binds to the public network.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
const server = http.createServer((request, response) => {
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  } catch { response.writeHead(400).end(); return; }
  if (!filename.startsWith(root + path.sep) || !types[path.extname(filename)]) { response.writeHead(404).end(); return; }
  fs.readFile(filename, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)], 'Cache-Control': 'no-store' });
    response.end(data);
  });
});
server.listen(4173, '127.0.0.1', () => console.log('Dashboard: http://127.0.0.1:4173'));
