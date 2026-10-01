import http from 'http';
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', port, url: req.url, env: process.env.NODE_ENV }));
}).listen(parseInt(port), '0.0.0.0', () => {
  console.log(`✅ Minimal test server running on 0.0.0.0:${port}`);
});
