# 课堂动势 · Math Motion

一个面向初中数学老师的轻量教学演示工作台。输入教学需求，生成可预览的动画课件，并下载为独立 HTML 文件分享给学生。

## 本地运行

Node 18+ 可以直接启动本地服务。没有 API Key 时会显示内置示例；配置 Key 后，生成按钮会调用 OpenAI Responses API：

```bash
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
npm run dev
```

打开 <http://localhost:4173> 即可体验。

如果只想预览静态页面，也可以运行 `python3 -m http.server 4173`，此时页面会自动显示“静态预览模式”。

## 真实 AI 生成

后端接口位于 `POST /api/generate`，密钥只从服务端的 `OPENAI_API_KEY` 环境变量读取，浏览器永远不会接触密钥。接口会让模型返回结构化的教学信息和一份自包含 HTML，前端在沙箱 iframe 中预览并允许下载。

生产环境可以直接部署到 Vercel：导入仓库，添加 `OPENAI_API_KEY`（可选 `OPENAI_MODEL`、`OPENAI_BASE_URL`），Vercel 会自动识别 `api/generate.js`。如果前端仍托管在 GitHub Pages，可以使用 `?api=https://你的-api-域名` 指定后端地址；后端需将 `ALLOWED_ORIGIN` 设置为 Pages 域名。`OPENAI_BASE_URL` 支持 OpenAI-compatible 代理，填写根域名或带 `/v1` 的地址均可。

## 当前能力

- 正方体展开图的可播放、可拖拽时间轴演示
- 教学目标、课堂流程、课堂提示和教师备注
- 互动小测与即时反馈
- 生成后下载独立 HTML 演示文件
- 分享链接、学生视角、浏览器本地工作空间与登录模拟
- AI 连接状态、生成历史和 API 失败时的清晰降级提示

当前登录和历史课件仍使用浏览器本地存储。接入真实用户系统时，可把 `persistProject()` 替换为数据库 API。Codex 是开发代理；面向最终用户的课件生成使用 OpenAI Responses API，模型可通过 `OPENAI_MODEL` 配置。
