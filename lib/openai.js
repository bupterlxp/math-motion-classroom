const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";

function responsesEndpoint() {
  const configured = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  return configured.endsWith("/v1") ? `${configured}/responses` : `${configured}/v1/responses`;
}

const lessonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    grade: { type: "string" },
    summary: { type: "string" },
    objective: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          duration: { type: "string" }
        },
        required: ["title", "description", "duration"]
      }
    },
    html: { type: "string" }
  },
  required: ["title", "grade", "summary", "objective", "steps", "html"]
};

const systemPrompt = `你是“课堂动势”的资深初中数学教研员和前端动画工程师。你的工作是把老师的一句话需求变成一份可直接打开的互动数学课件。

请严格遵守：
1. 面向中国 7-9 年级学生，先建立直观观察，再给出数学规律，最后设计可验证的互动或小测。
2. html 必须是完整、独立、可离线打开的 HTML 字符串，禁止依赖 CDN、网络图片、外部字体或 npm。只使用内联 CSS 和 JavaScript，使用 SVG、Canvas、CSS 2D/3D 制作动画。
3. html 中必须有清晰的课题标题、动画主体、播放/暂停按钮、进度或滑块、一步一步的讲解、一个能自动判断的互动题。界面要响应式，触控和键盘都可用。
4. 数学结论要准确。动画应服务于一个明确概念，不要只做装饰。给关键步骤加简短中文提示。
5. 不要使用 iframe、外部请求、表单提交、localStorage、eval 或危险脚本。html 会被放入沙箱 iframe 预览。
6. 可以充分展开教学与交互设计，不要为了压缩字符牺牲数学准确性、动画步骤或练习质量。
7. 只返回符合指定 JSON schema 的对象，不要用 markdown 代码围栏包裹 html。`;

function extractResponseText(payload) {
  if (typeof payload.output_text === "string" && payload.output_text) return payload.output_text;
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function cleanJson(text) {
  const value = String(text || "").trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : value;
}

function validateLesson(lesson) {
  if (!lesson || typeof lesson !== "object") throw new Error("模型没有返回课件对象");
  if (typeof lesson.html !== "string" || lesson.html.length < 200) throw new Error("模型返回的课件 HTML 不完整");
  if (!/^<!doctype html|^<html[\s>]/i.test(lesson.html.trim())) throw new Error("模型返回的不是完整 HTML");
  if (!Array.isArray(lesson.steps) || lesson.steps.length < 2) throw new Error("模型返回的课堂步骤不足");
  return {
    title: String(lesson.title || "AI 数学演示").slice(0, 80),
    grade: String(lesson.grade || "7-9 年级").slice(0, 40),
    summary: String(lesson.summary || "互动数学演示").slice(0, 240),
    objective: String(lesson.objective || "理解并应用本节数学概念。").slice(0, 300),
    steps: lesson.steps.slice(0, 6).map((step, index) => ({
      title: String(step.title || `课堂步骤 ${index + 1}`).slice(0, 40),
      description: String(step.description || "观察动画并说出你的发现。").slice(0, 120),
      duration: String(step.duration || "1:00").slice(0, 10)
    })),
    html: lesson.html
  };
}

function requestBody(prompt, options = {}, stream = false) {
  const userPrompt = `老师的教学需求：\n${prompt}\n\n补充设置：年级=${options.grade || "七至九年级"}，课时=${options.duration || "40 分钟"}。`;
  return {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    input: [
      { role: "system", content: [{ type: "input_text", text: systemPrompt }] },
      { role: "user", content: [{ type: "input_text", text: userPrompt }] }
    ],
    text: { format: { type: "json_schema", name: "math_lesson", strict: true, schema: lessonSchema } },
    reasoning: { effort: "high" },
    max_output_tokens: 24000,
    ...(stream ? { stream: true } : {})
  };
}

function parseLessonText(rawText) {
  const raw = cleanJson(rawText);
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("模型返回的 JSON 无法解析"); }
  return validateLesson(parsed);
}

async function responseError(response) {
  const rawBody = await response.text();
  let payload;
  try { payload = JSON.parse(rawBody); } catch {
    const error = new Error(`AI 网关返回了无效响应（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  const message = payload?.error?.message || `OpenAI 请求失败（${response.status}）`;
  const error = new Error(message);
  error.status = response.status;
  throw error;
}

async function generateLesson(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY 未配置");
    error.code = "MISSING_API_KEY";
    throw error;
  }
  const response = await fetch(responsesEndpoint(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(prompt, options)),
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(180000) : undefined
  });
  if (!response.ok) return responseError(response);
  let payload;
  try { payload = await response.json(); } catch { throw new Error("AI 网关返回了无效 JSON"); }
  return parseLessonText(extractResponseText(payload));
}

async function streamLesson(prompt, options = {}, onEvent = () => {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY 未配置");
    error.code = "MISSING_API_KEY";
    throw error;
  }
  const response = await fetch(responsesEndpoint(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(requestBody(prompt, options, true)),
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(180000) : undefined
  });
  if (!response.ok) return responseError(response);
  if (!response.body) throw new Error("AI 网关未返回流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rawText = "";
  const consume = (chunk) => {
    buffer += chunk;
    const events = buffer.split(/\n\n/);
    buffer = events.pop() || "";
    for (const event of events) {
      const dataLine = event.split(/\n/).find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const data = dataLine.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "response.output_text.delta" && typeof parsed.delta === "string") {
          rawText += parsed.delta;
          onEvent({ type: "delta", delta: parsed.delta, length: rawText.length });
        }
      } catch { /* ignore keep-alive or partial event */ }
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }
  consume(decoder.decode());
  return parseLessonText(rawText);
}

module.exports = { DEFAULT_MODEL, generateLesson, streamLesson };
