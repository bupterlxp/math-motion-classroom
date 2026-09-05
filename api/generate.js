const { generateLesson, DEFAULT_MODEL } = require("../lib/openai");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "仅支持 POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return res.status(400).json({ error: "请输入教学需求" });
    if (prompt.length > 4000) return res.status(413).json({ error: "教学需求不能超过 4000 字" });
    const lesson = await generateLesson(prompt, body);
    return res.status(200).json({ ...lesson, model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
  } catch (error) {
    const status = error.status === 429 ? 429 : error.code === "MISSING_API_KEY" ? 503 : 500;
    return res.status(status).json({ error: error.message || "生成失败" });
  }
};
