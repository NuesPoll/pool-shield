// Local server: node server.js  ->  http://localhost:3000   (needs Node 18+)
const http = require("http"), fs = require("fs"), path = require("path");
const handler = require("./api/scan");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const root = path.join(__dirname, "public");
http.createServer((req, res) => {
  let u;
  try { u = new URL(req.url, "http://localhost"); } catch { res.statusCode = 400; return res.end("Bad request"); }
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (u.pathname === "/api/scan") {
    req.query = Object.fromEntries(u.searchParams);
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    return handler(req, res);
  }
  let f = path.join(root, u.pathname === "/" ? "index.html" : u.pathname);
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("content-type", types[path.extname(f)] || "text/plain");
  fs.createReadStream(f).pipe(res);
}).listen(3000, () => console.log("Pool Shield running at http://localhost:3000"));
