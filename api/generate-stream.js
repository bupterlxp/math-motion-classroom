const { streamLesson, DEFAULT_MODEL } = require("../lib/openai");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "仅支持 POST" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "请输入教学需求" });
  if (prompt.length > 4000) return res.status(413).json({ error: "教学需求不能超过 4000 字" });
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  send(res, { type: "ready", model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
  try {
    const lesson = await streamLesson(prompt, body, (event) => send(res, event));
    send(res, { type: "complete", lesson, model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
  } catch (error) {
    send(res, { type: "error", error: error.message || "生成失败", code: error.code || "GENERATION_ERROR" });
  }
  return res.end();
};
