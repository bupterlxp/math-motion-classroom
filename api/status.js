const { DEFAULT_MODEL } = require("../lib/openai");

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "仅支持 GET" });
  return res.status(200).json({ configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || DEFAULT_MODEL });
};
