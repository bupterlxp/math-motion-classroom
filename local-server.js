const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}
loadDotEnv();
const { generateLesson, DEFAULT_MODEL } = require("./lib/openai");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

function headers(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function json(res, status, value) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(value)); }

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 200000) reject(new Error("请求内容过大")); });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("请求 JSON 无效")); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  headers(res);
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/status" && req.method === "GET") return json(res, 200, { configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
  if (url.pathname === "/api/generate" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json(res, 400, { error: "请输入教学需求" });
      if (prompt.length > 4000) return json(res, 413, { error: "教学需求不能超过 4000 字" });
      const lesson = await generateLesson(prompt, body);
      return json(res, 200, { ...lesson, model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
    } catch (error) {
      const status = error.code === "MISSING_API_KEY" ? 503 : error.status === 429 ? 429 : 500;
      return json(res, status, { error: error.message || "生成失败" });
    }
  }
  if (req.method !== "GET") return json(res, 405, { error: "Method Not Allowed" });
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return json(res, 404, { error: "Not Found" });
  res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => console.log(`Math Motion running at http://localhost:${port} (${process.env.OPENAI_API_KEY ? "AI ready" : "demo mode"})`));
