const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const promptInput = $("#promptInput");
const generateBtn = $("#generateBtn");
const cubeNet = $("#cubeNet");
const animationStage = $("#animationStage");
const timelineTrack = $("#timelineTrack");
const timelineProgress = $("#timelineProgress");
const timelineThumb = $("#timelineThumb");
const timeReadout = $("#timeReadout");
const playBtn = $("#playBtn");
const toast = $("#toast");
const aiPreviewFrame = $("#aiPreviewFrame");
const cubeCanvas = $("#cubeCanvas");
const fullCubeCanvas = $("#fullCubeCanvas");
const publicApiBase = window.location.hostname.endsWith("github.io") ? "https://mathteacher-lake.vercel.app" : "";
const API_BASE = (new URLSearchParams(window.location.search).get("api") || window.MATH_MOTION_API_BASE || publicApiBase).replace(/\/$/, "");
let timelineValue = 0;
let playing = false;
let playTimer = null;
let generated = false;
let currentGeneratedHtml = "";
let currentLesson = null;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

const cubeColors = ["#ff9b8b", "#ff806d", "#ffb3a3", "#ffd968", "#a9dfc8", "#ecc44e"];
const cubeLabels = ["⑤", "②", "③", "①", "⑥", "④"];
const cubeNetPositions = {
  back: [[220, 10], [282, 10], [282, 72], [220, 72]],
  top: [[220, 72], [282, 72], [282, 134], [220, 134]],
  front: [[220, 134], [282, 134], [282, 196], [220, 196]],
  bottom: [[220, 196], [282, 196], [282, 258], [220, 258]],
  left: [[158, 134], [220, 134], [220, 196], [158, 196]],
  right: [[282, 134], [344, 134], [344, 196], [282, 196]]
};
const cubeSolidPositions = {
  back: [[155, 69], [265, 35], [375, 69], [265, 104]],
  top: [[220, 104], [290, 69], [375, 69], [332, 104]],
  front: [[220, 104], [332, 104], [332, 216], [220, 216]],
  bottom: [[220, 216], [332, 216], [375, 181], [290, 249]],
  left: [[220, 104], [155, 69], [155, 181], [220, 216]],
  right: [[332, 104], [375, 69], [375, 181], [332, 216]]
};

function interpolatePoints(from, to, amount) {
  return from.map((point, index) => [point[0] + (to[index][0] - point[0]) * amount, point[1] + (to[index][1] - point[1]) * amount]);
}

function drawPolygon(ctx, points, fill, stroke = "#2f5360", alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.35;
  ctx.stroke();
  ctx.restore();
}

function drawCubeOn(canvas, value = 0) {
  const cubeContext = canvas?.getContext("2d");
  if (!cubeContext || !canvas) return;
  const width = canvas.clientWidth || 620;
  const height = canvas.clientHeight || 298;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  cubeContext.setTransform(dpr * width / 620, 0, 0, dpr * height / 298, 0, 0);
  cubeContext.clearRect(0, 0, 620, 298);
  const ease = value * value * (3 - 2 * value);
  const names = ["back", "left", "bottom", "front", "right", "top"];
  const indexes = { back: 0, front: 1, right: 2, top: 3, bottom: 4, left: 5 };
  const faces = names.map((name) => ({ name, points: interpolatePoints(cubeSolidPositions[name], cubeNetPositions[name], ease), index: indexes[name] }));
  cubeContext.save();
  cubeContext.fillStyle = "rgba(48, 88, 84, .13)";
  cubeContext.filter = "blur(10px)";
  cubeContext.beginPath();
  cubeContext.ellipse(267, 246, 125 - ease * 35, 16 - ease * 5, 0, 0, Math.PI * 2);
  cubeContext.fill();
  cubeContext.restore();
  faces.forEach(({ name, points, index }) => drawPolygon(cubeContext, points, cubeColors[index], "#315260", name === "back" ? .45 + ease * .55 : 1));
  faces.forEach(({ name, points }) => {
    const center = points.reduce((total, point) => [total[0] + point[0] / 4, total[1] + point[1] / 4], [0, 0]);
    cubeContext.fillStyle = "rgba(34,58,69,.7)";
    cubeContext.font = "500 13px DM Mono, monospace";
    cubeContext.textAlign = "center";
    cubeContext.fillText(cubeLabels[indexes[name]], center[0], center[1] + 4);
    cubeContext.beginPath();
    cubeContext.arc(center[0] - 15, center[1] + 18, 2.5, 0, Math.PI * 2);
    cubeContext.fillStyle = "rgba(255,255,255,.7)";
    cubeContext.fill();
  });
  if (ease > .08 && ease < .94) {
    cubeContext.save();
    cubeContext.setLineDash([3, 4]);
    cubeContext.strokeStyle = "rgba(255,108,89,.75)";
    cubeContext.lineWidth = 1;
    cubeContext.beginPath();
    cubeContext.moveTo(220, 134); cubeContext.lineTo(282, 134); cubeContext.moveTo(220, 196); cubeContext.lineTo(282, 196);
    cubeContext.stroke();
    cubeContext.restore();
  }
  cubeContext.fillStyle = "#71858a";
  cubeContext.font = "10px Noto Sans SC, sans-serif";
  cubeContext.textAlign = "center";
  cubeContext.fillText(ease > .78 ? "展开图 · 六个面连成一个平面图形" : ease > .12 ? "沿着边缘翻折，注意相邻面的关系" : "正方体 · 六个全等的正方形", 267, 287);
}

function drawCube(value = 0) {
  drawCubeOn(cubeCanvas, value);
  drawCubeOn(fullCubeCanvas, value);
}

function setTimeline(value) {
  timelineValue = clamp(value, 0, 1);
  const percent = `${timelineValue * 100}%`;
  timelineProgress.style.width = percent;
  timelineThumb.style.left = percent;
  const fullProgress = $("#fullPreview .full-progress span");
  if (fullProgress) fullProgress.style.width = percent;
  const seconds = Math.round(timelineValue * 12);
  timeReadout.textContent = `00:${String(seconds).padStart(2, "0")} / 00:12`;
  cubeNet.classList.toggle("is-net", timelineValue > .78);
  cubeNet.style.transform = timelineValue > .78 ? "rotateX(0deg) rotateY(0deg) rotateZ(0deg) translate(-44px, -1px)" : `rotateX(${-21 + timelineValue * 21}deg) rotateY(${-33 + timelineValue * 33}deg) rotateZ(${1 - timelineValue}deg)`;
  if (timelineValue > .2 && timelineValue < .79) {
    cubeNet.classList.remove("is-net");
  }
  drawCube(timelineValue);
}

function togglePlaying(force) {
  playing = typeof force === "boolean" ? force : !playing;
  playBtn.querySelector(".play-icon").textContent = playing ? "Ⅱ" : "▶";
  if (playing) {
    if (timelineValue >= 1) setTimeline(0);
    clearInterval(playTimer);
    playTimer = setInterval(() => {
      const next = timelineValue + 1 / 120;
      if (next >= 1) { setTimeline(1); togglePlaying(false); } else setTimeline(next);
    }, 100);
  } else {
    clearInterval(playTimer);
    playTimer = null;
  }
}

playBtn.addEventListener("click", () => togglePlaying());
$("#resetAnimation").addEventListener("click", () => { togglePlaying(false); setTimeline(0); });
timelineTrack.addEventListener("pointerdown", (event) => {
  const updateFromPointer = (moveEvent) => {
    const rect = timelineTrack.getBoundingClientRect();
    setTimeline((moveEvent.clientX - rect.left) / rect.width);
  };
  updateFromPointer(event);
  const move = (moveEvent) => updateFromPointer(moveEvent);
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
});

$("#zoomIn").addEventListener("click", () => {
  const current = Number($("#zoomValue").textContent.replace("%", ""));
  const next = clamp(current + 10, 80, 130);
  $("#zoomValue").textContent = `${next}%`;
  animationStage.style.transform = `scale(${next / 100})`;
});
$("#zoomOut").addEventListener("click", () => {
  const current = Number($("#zoomValue").textContent.replace("%", ""));
  const next = clamp(current - 10, 80, 130);
  $("#zoomValue").textContent = `${next}%`;
  animationStage.style.transform = `scale(${next / 100})`;
});

$("#studentToggle").addEventListener("click", (event) => {
  event.currentTarget.classList.toggle("active");
  showToast(event.currentTarget.classList.contains("active") ? "已切换到学生视角" : "已切换到教师视角");
});
$("#clearPrompt").addEventListener("click", () => { promptInput.value = ""; promptInput.focus(); });
function markPromptDirty() {
  if (!generated) return;
  generated = false;
  currentLesson = null;
  currentGeneratedHtml = "";
  animationStage.classList.remove("has-ai-preview");
  generateBtn.innerHTML = '<span class="sparkle">✦</span><span>生成演示</span><span class="arrow">→</span>';
}
promptInput.addEventListener("input", () => { markPromptDirty(); updateTitleFromPrompt(); });
$$('.suggestion-chip').forEach((chip) => chip.addEventListener("click", () => {
  promptInput.value = chip.dataset.prompt;
  markPromptDirty();
  updateTitleFromPrompt();
  promptInput.focus();
  showToast("已填入教学需求，可以继续修改");
}));

function updateTitleFromPrompt(preferredTitle = "") {
  const value = promptInput.value;
  let title = preferredTitle || "自定义数学演示";
  if (!preferredTitle && /三角形|内角/.test(value)) title = "三角形内角和";
  else if (!preferredTitle && /函数|坐标/.test(value)) title = "一次函数的图象";
  else if (!preferredTitle && /勾股/.test(value)) title = "勾股定理面积拼图";
  else if (!preferredTitle && /正方体|展开/.test(value)) title = "正方体的展开图";
  $("#topTitle").textContent = title;
  const lessonTitle = $(".lesson-intro h3");
  const lessonSub = $(".lesson-intro p");
  if (lessonTitle) lessonTitle.textContent = title;
  if (lessonSub) lessonSub.textContent = title === "正方体的展开图" ? "从立体到平面 · 7 年级上册" : "概念动画 · AI 教学设计";
  return title;
}

function fallbackCubeHtml(title, prompt) {
  const safeTitle = title.replace(/[<>]/g, "");
  const safePrompt = prompt.replace(/[<>]/g, "");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} · 课堂动势</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#24394b;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif;min-height:100vh;display:grid;place-items:center}.page{width:min(980px,100%);padding:55px 7vw;display:grid;grid-template-columns:.8fr 1.2fr;gap:40px;align-items:center}.eyebrow{color:#ffd964;font-size:11px;letter-spacing:2px}.copy h1{font-size:clamp(32px,5vw,58px);line-height:1.1;margin:18px 0}.copy h1 em{color:#ff806b;font-style:normal}.copy p{color:#adbdc2;line-height:1.8;font-size:14px;max-width:280px}.scene{height:350px;display:grid;place-items:center;perspective:900px}.cube{--s:108px;width:calc(var(--s)*3);height:calc(var(--s)*3);position:relative;transform-style:preserve-3d;transform:rotateX(-21deg) rotateY(-33deg);transition:transform 1s}.face{width:var(--s);height:var(--s);position:absolute;border:1px solid #25384c;display:grid;place-items:center;color:#25384c;font-size:15px}.front{left:var(--s);top:var(--s);background:#ff8372;transform:translateZ(calc(var(--s)/2))}.back{left:var(--s);top:var(--s);background:#ef6b5a;transform:rotateY(180deg) translateZ(calc(var(--s)/2))}.right{left:calc(var(--s)*2);top:var(--s);background:#ffb09f;transform-origin:left;transform:rotateY(90deg) translateZ(calc(var(--s)/2))}.left{left:0;top:var(--s);background:#ff9d8d;transform-origin:right;transform:rotateY(-90deg) translateZ(calc(var(--s)/2))}.top{left:var(--s);top:0;background:#ffd968;transform-origin:bottom;transform:rotateX(90deg) translateZ(calc(var(--s)/2))}.bottom{left:var(--s);top:calc(var(--s)*2);background:#edc34a;transform-origin:top;transform:rotateX(-90deg) translateZ(calc(var(--s)/2))}.cube.net{transform:rotateX(0) rotateY(0)}.cube.net .front,.cube.net .back,.cube.net .right,.cube.net .left,.cube.net .top,.cube.net .bottom{transform:none}.cube.net .back{top:calc(var(--s)*-2)}.cube.net .right{left:calc(var(--s)*2)}.cube.net .left{left:0}.cube.net .top{top:0}.cube.net .bottom{top:calc(var(--s)*2)}.controls{display:flex;gap:9px;align-items:center;justify-content:center}.controls button{border:1px solid #69808a;border-radius:5px;padding:9px 14px;background:#314b5c;color:#fff;cursor:pointer}.track{width:180px;height:5px;border-radius:5px;background:#607781;cursor:pointer}.track span{display:block;width:7%;height:100%;background:#ff6c59;border-radius:5px}.hint{color:#8ea6ab;text-align:center;font-size:12px;margin-top:20px}.prompt{grid-column:1/-1;color:#8ea6ab;font-size:11px;border-top:1px solid #405967;padding-top:18px}
@media(max-width:650px){.page{grid-template-columns:1fr;padding:35px 26px}.scene{height:270px}.cube{--s:76px}.copy h1{font-size:39px}}
</style></head><body><main class="page"><div class="copy"><div class="eyebrow">课堂动势 · 学生预览</div><h1>${safeTitle.replace("的", "的<br>")}</h1><p>拖动进度条，观察一个立体如何展开成平面。完成后想一想：还有别的展开方式吗？</p></div><div><div class="scene"><div class="cube" id="cube"><div class="face top">①</div><div class="face front">②</div><div class="face right">③</div><div class="face back">④</div><div class="face left">⑤</div><div class="face bottom">⑥</div></div></div><div class="controls"><button id="play">▶ 播放</button><div class="track" id="track"><span id="bar"></span></div><span id="readout">0%</span></div><div class="hint">先观察，再预测，最后验证</div></div><div class="prompt">本次课堂需求：${safePrompt}</div></main><script>
const cube=document.getElementById('cube'),bar=document.getElementById('bar'),track=document.getElementById('track'),readout=document.getElementById('readout'),play=document.getElementById('play');let v=0,timer;function set(vv){v=Math.max(0,Math.min(1,vv));bar.style.width=(v*100)+'%';readout.textContent=Math.round(v*100)+'%';cube.classList.toggle('net',v>.78);cube.style.transform=v>.78?'rotateX(0) rotateY(0)': 'rotateX('+(-21+v*21)+'deg) rotateY('+(-33+v*33)+'deg)'}function run(){clearInterval(timer);play.textContent='Ⅱ 暂停';timer=setInterval(()=>{v+=.012;if(v>=1){set(1);clearInterval(timer);play.textContent='▶ 播放'}else set(v)},100)}play.onclick=()=>{if(v>=1){v=0;set(v)}run()};track.onclick=e=>{const r=track.getBoundingClientRect();set((e.clientX-r.left)/r.width)};set(0)
</script></body></html>`;
}

function fallbackConceptHtml(title, prompt, kind) {
  const safeTitle = title.replace(/[<>]/g, "");
  const safePrompt = prompt.replace(/[<>]/g, "");
  const concepts = {
    triangle: {
      eyebrow: "平面几何 · 观察与拼合",
      intro: "把三个角拼成一条直线，内角和就藏在这条直线上。",
      visual: `<svg viewBox="0 0 520 300" aria-label="三角形三个内角拼合"><path class="tri-edge" d="M130 230 L260 54 L390 230 Z"/><path class="angle angle-a" d="M154 229 A32 32 0 0 1 149 204"/><path class="angle angle-b" d="M370 229 A32 32 0 0 0 375 204"/><path class="angle angle-c" d="M238 84 A32 32 0 0 1 282 84"/><text class="label label-a" x="145" y="210">A</text><text class="label label-b" x="368" y="210">B</text><text class="label label-c" x="257" y="94">C</text><g class="joined"><path d="M150 258 L370 258"/><path d="M150 258 l10 -6 v12 z"/><path d="M370 258 l-10 -6 v12 z"/><text x="208" y="283">A + B + C = 180°</text></g></svg>`,
      controls: `<button id="action">▶ 拼合三个角</button><input id="slider" type="range" min="0" max="100" value="0" aria-label="拼合进度"><span id="readout">0%</span>`,
      script: `const svg=document.querySelector('svg'),action=document.getElementById('action'),slider=document.getElementById('slider'),readout=document.getElementById('readout');function set(v){slider.value=v;readout.textContent=v+'%';svg.classList.toggle('joined-on',v>72)}slider.oninput=()=>set(slider.value);action.onclick=()=>{set(100);action.textContent='↻ 再演示'};set(0);`
    },
    function: {
      eyebrow: "函数图象 · 动态关系",
      intro: "拖动斜率滑块，观察 y = kx + 1 中 k 如何改变直线的倾斜程度。",
      visual: `<svg viewBox="0 0 520 300" aria-label="一次函数坐标图"><g class="grid-lines"><path d="M80 38 V255 M140 38 V255 M200 38 V255 M260 38 V255 M320 38 V255 M380 38 V255 M440 38 V255 M50 65 H470 M50 125 H470 M50 185 H470 M50 245 H470"/></g><path class="axis" d="M50 245 H470 M260 270 V30"/><path class="func-line" id="funcLine" d="M80 206 L440 86"/><text class="eq" id="equation" x="330" y="62">y = 2x + 1</text><text class="axis-label" x="453" y="265">x</text><text class="axis-label" x="270" y="34">y</text></svg>`,
      controls: `<label class="range-label">斜率 k</label><input id="slider" type="range" min="-3" max="3" step="0.5" value="2" aria-label="斜率"><span id="readout">k = 2</span>`,
      script: `const line=document.getElementById('funcLine'),slider=document.getElementById('slider'),readout=document.getElementById('readout'),equation=document.getElementById('equation');function set(){const k=Number(slider.value),y1=165-k*24,y2=165+k*24;line.setAttribute('d','M100 '+Math.max(48,Math.min(240,y1))+' L420 '+Math.max(48,Math.min(240,y2)));readout.textContent='k = '+k;equation.textContent='y = '+k+'x + 1'}slider.oninput=set;set();`
    },
    pythagorean: {
      eyebrow: "空间与面积 · 勾股定理",
      intro: "把直角三角形两条直角边上的正方形，拼成斜边上的大正方形。",
      visual: `<svg viewBox="0 0 520 300" aria-label="勾股定理面积拼图"><path class="right-triangle" d="M170 230 L170 90 L390 230 Z"/><path class="square square-a" d="M170 90 L80 90 L80 230 L170 230 Z"/><path class="square square-b" d="M170 230 L390 230 L390 450 L170 450 Z"/><path class="square square-c" d="M390 230 L530 90 L390 -50 L250 90 Z"/><text x="100" y="165">a²</text><text x="260" y="272">b²</text><text x="359" y="107">c²</text><text class="sum" x="208" y="55">a² + b² = c²</text></svg>`,
      controls: `<button id="action">▶ 开始拼图</button><input id="slider" type="range" min="0" max="100" value="0" aria-label="拼图进度"><span id="readout">0%</span>`,
      script: `const svg=document.querySelector('svg'),action=document.getElementById('action'),slider=document.getElementById('slider'),readout=document.getElementById('readout');function set(v){slider.value=v;readout.textContent=v+'%';svg.style.setProperty('--progress',v/100)}slider.oninput=()=>set(slider.value);action.onclick=()=>{set(100);action.textContent='↻ 再演示'};set(0);`
    }
  };
  const concept = concepts[kind] || concepts.triangle;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} · 课堂动势</title><style>
*{box-sizing:border-box}body{margin:0;background:#24394b;color:#fff;font-family:Arial,"Microsoft YaHei",sans-serif;min-height:100vh;display:grid;place-items:center}.page{width:min(1000px,100%);padding:44px 6vw;display:grid;grid-template-columns:.72fr 1.28fr;gap:35px;align-items:center}.eyebrow{color:#ffd964;letter-spacing:2px;font-size:11px}.copy h1{font-size:clamp(34px,5vw,58px);line-height:1.13;margin:17px 0}.copy h1 em{color:#ff806b;font-style:normal}.copy p{max-width:265px;color:#afbec3;font-size:14px;line-height:1.8}.visual{min-width:0}.visual svg{width:100%;max-height:340px;overflow:visible}.tri-edge,.right-triangle{fill:#ff806b;fill-opacity:.22;stroke:#ff9b8b;stroke-width:3}.angle{fill:none;stroke:#ffd964;stroke-width:4;stroke-linecap:round}.label{fill:#ffd964;font-weight:bold;font-size:16px}.joined{opacity:0;transform:translateY(25px);transform-origin:center;transition:.7s}.joined path:first-child{stroke:#a9e2c7;stroke-width:3}.joined path:nth-child(2){fill:#a9e2c7}.joined text{fill:#a9e2c7;font-size:17px;font-weight:bold}.joined-on .tri-edge,.joined-on .angle{opacity:.2}.joined-on .joined{opacity:1;transform:translateY(0)}.grid-lines path{stroke:#4d6975;stroke-width:1}.axis{stroke:#bbcbc9;stroke-width:2}.func-line{stroke:#ff806b;stroke-width:5;stroke-linecap:round;transition:.35s}.eq,.sum{fill:#ffd964;font-size:17px;font-weight:bold}.axis-label{fill:#aabcc0;font-size:13px}.right-triangle{fill:#ff806b;fill-opacity:.27}.square{fill:#a9e2c7;fill-opacity:.17;stroke:#a9e2c7;stroke-width:2;transform-origin:center;transition:.8s}.square-a{transform:translate(90px,0) rotate(-9deg) scale(calc(.86 + var(--progress,0)*.14))}.square-b{transform:translate(0,-34px) rotate(5deg) scale(calc(.86 + var(--progress,0)*.14))}.square-c{fill:#ffd964;fill-opacity:.22;transform:scale(calc(.76 + var(--progress,0)*.24))}.right-triangle{transform:translateX(calc(var(--progress,0)*4px));transition:.8s}.sum{opacity:calc(.25 + var(--progress,0)*.75);transition:.8s}.controls{display:flex;align-items:center;gap:10px;margin:12px auto 0;max-width:470px}.controls button{border:1px solid #718993;border-radius:5px;padding:9px 13px;background:#314b5c;color:#fff;cursor:pointer;white-space:nowrap}.controls button:hover{background:#3e5c6c}.controls input{flex:1;accent-color:#ff6c59}.controls span,.range-label{color:#aabcc0;font:12px Arial}.prompt{grid-column:1/-1;border-top:1px solid #405967;padding-top:15px;color:#8fa7ad;font-size:11px}@media(max-width:700px){.page{grid-template-columns:1fr;padding:30px 23px}.visual svg{max-height:270px}.copy h1{font-size:40px}}
</style></head><body><main class="page"><div class="copy"><div class="eyebrow">${concept.eyebrow}</div><h1>${safeTitle}</h1><p>${concept.intro}</p></div><div class="visual">${concept.visual}<div class="controls">${concept.controls}</div><p style="color:#8fa7ad;text-align:center;font-size:12px;margin:18px 0 0">先预测，再拖动验证你的想法</p></div><div class="prompt">本次课堂需求：${safePrompt}</div></main><script>${concept.script}</script></body></html>`;
}

function fallbackGeneratedHtml(title, prompt) {
  if (/三角形|内角/.test(prompt)) return fallbackConceptHtml(title, prompt, "triangle");
  if (/函数|坐标/.test(prompt)) return fallbackConceptHtml(title, prompt, "function");
  if (/勾股/.test(prompt)) return fallbackConceptHtml(title, prompt, "pythagorean");
  return fallbackCubeHtml(title, prompt);
}

function downloadHtml(html = currentGeneratedHtml || fallbackGeneratedHtml(updateTitleFromPrompt(), promptInput.value || "请生成一个初中数学动画演示")) {
  const title = currentLesson?.title || updateTitleFromPrompt();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.replace(/\s+/g, "-")}-课堂动势.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  localStorage.setItem("math-motion-last", JSON.stringify({ title, prompt: promptInput.value, at: new Date().toISOString() }));
  showToast("HTML 已下载，可以直接发给学生打开");
}

async function requestAiLesson(prompt) {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, grade: "七至九年级", duration: "40 分钟" })
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* server returned no JSON */ }
  if (!response.ok) throw new Error(payload.error || `生成服务不可用（${response.status}）`);
  if (!payload.html || typeof payload.html !== "string") throw new Error("生成服务没有返回 HTML");
  return payload;
}

async function requestAiLessonStream(prompt, onEvent) {
  const response = await fetch(`${API_BASE}/api/generate-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ prompt, grade: "七至九年级", duration: "40 分钟" })
  });
  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch { /* server may return a plain error */ }
    throw new Error(payload.error || `流式生成服务不可用（${response.status}）`);
  }
  if (!response.body) throw new Error("浏览器不支持实时生成");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = null;
  const consume = (chunk) => {
    buffer += chunk;
    const events = buffer.split(/\n\n/);
    buffer = events.pop() || "";
    events.forEach((eventText) => {
      const line = eventText.split(/\n/).find((line) => line.startsWith("data:"));
      if (!line) return;
      try {
        const event = JSON.parse(line.slice(5).trim());
        onEvent(event);
        if (event.type === "complete") completed = event.lesson;
        if (event.type === "error") throw new Error(event.error || "实时生成失败");
      } catch (error) {
        if (error instanceof Error && error.message !== "Unexpected end of JSON input") throw error;
      }
    });
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }
  consume(decoder.decode());
  if (!completed) throw new Error("实时生成未返回完整课件");
  return completed;
}

function setGenerationPhase(activeName, streamText) {
  const order = ["intent", "scene", "activity", "html"];
  const activeIndex = order.indexOf(activeName);
  $$('.generation-phase').forEach((phase) => {
    const index = order.indexOf(phase.dataset.phase);
    phase.classList.toggle("done", index < activeIndex);
    phase.classList.toggle("active", index === activeIndex);
    const status = phase.querySelector("i");
    if (status) status.textContent = index < activeIndex ? "已完成" : index === activeIndex ? "进行中" : "等待";
  });
  if (streamText) $("#generationStreamText").textContent = streamText;
}

function updateGenerationProgress(event) {
  if (event.type === "ready") {
    $("#generationTitle").textContent = `正在用 ${event.model || "AI"} 设计这节课…`;
    setGenerationPhase("intent", "正在建立知识点关系…");
    return;
  }
  if (event.type !== "delta") return;
  const length = event.length || 0;
  const phase = length > 3600 ? "html" : length > 1800 ? "activity" : length > 600 ? "scene" : "intent";
  const copy = { intent: "教学目标已接收，正在提炼关键规律…", scene: "正在把数学关系变成可视化场景…", activity: "正在编写学生可以操作的互动题…", html: "正在编译并检查可下载 HTML…" };
  setGenerationPhase(phase, copy[phase]);
  $("#generationCharCount").textContent = `${length.toLocaleString("zh-CN")} 字符`;
}

function showLessonResult(lesson, source) {
  currentLesson = lesson;
  currentGeneratedHtml = lesson.html;
  generated = true;
  updateTitleFromPrompt(lesson.title);
  aiPreviewFrame.srcdoc = lesson.html;
  animationStage.classList.add("has-ai-preview");
  const objective = $(".objective-box p");
  if (objective && lesson.objective) objective.textContent = lesson.objective;
  const summary = $(".lesson-intro p");
  if (summary) summary.textContent = `${lesson.summary || "互动数学演示"} · ${lesson.grade || "7-9 年级"}`;
  const steps = $(".lesson-steps");
  if (steps && Array.isArray(lesson.steps)) {
    steps.innerHTML = "";
    lesson.steps.slice(0, 6).forEach((step, index) => {
      const node = document.createElement("div");
      node.className = `lesson-step${index === 0 ? " active" : ""}`;
      node.dataset.step = String(index + 1);
      node.innerHTML = `<span class="step-index">${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.description)}</p></div><span class="step-time">${escapeHtml(step.duration)}</span>`;
      steps.appendChild(node);
    });
    bindLessonSteps();
  }
  persistProject(lesson.title, promptInput.value, source);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character]));
}

function persistProject(title, prompt, source) {
  const key = "math-motion-projects";
  const projects = JSON.parse(localStorage.getItem(key) || "[]");
  const item = { title, prompt, source, at: new Date().toISOString() };
  const next = [item, ...projects.filter((project) => project.title !== title)].slice(0, 8);
  localStorage.setItem(key, JSON.stringify(next));
  const recent = $(".recent-list");
  if (recent) {
    const existing = recent.querySelector(".recent-item.current");
    if (existing) existing.remove();
    const node = document.createElement("button");
    node.className = "recent-item current";
    node.dataset.prompt = prompt;
    node.innerHTML = `<span class="file-badge coral">◇</span><span><strong>${escapeHtml(title)}</strong><small>刚刚 · ${source === "ai" ? "AI 已生成" : "内置演示"}</small></span>`;
    recent.prepend(node);
  }
}

function bindLessonSteps() {
  $$('.lesson-step').forEach((step) => step.addEventListener("click", () => {
    $$('.lesson-step').forEach((item) => item.classList.toggle("active", item === step));
    const target = Number(step.dataset.step);
    setTimeline([0, .36, .73][target - 1] || 0);
  }));
}

function loadSavedProjects() {
  const projects = JSON.parse(localStorage.getItem("math-motion-projects") || "[]");
  const recent = $(".recent-list");
  if (!recent || !projects.length) return;
  projects.slice(0, 4).reverse().forEach((project) => {
    if (recent.querySelector(`[data-project-title="${CSS.escape(project.title)}"]`)) return;
    const node = document.createElement("button");
    node.className = "recent-item";
    node.dataset.prompt = project.prompt || "";
    node.dataset.projectTitle = project.title;
    node.innerHTML = `<span class="file-badge ${project.source === "ai" ? "mint" : "coral"}">${project.source === "ai" ? "✦" : "◇"}</span><span><strong>${escapeHtml(project.title)}</strong><small>${project.source === "ai" ? "AI 生成" : "内置演示"}</small></span>`;
    recent.prepend(node);
  });
}

$(".recent-list").addEventListener("click", (event) => {
  const item = event.target.closest(".recent-item");
  if (!item || !item.dataset.prompt) return;
  promptInput.value = item.dataset.prompt;
  generated = false;
  currentLesson = null;
  currentGeneratedHtml = "";
  animationStage.classList.remove("has-ai-preview");
  generateBtn.innerHTML = '<span class="sparkle">✦</span><span>生成演示</span><span class="arrow">→</span>';
  updateTitleFromPrompt(item.dataset.projectTitle || "");
  showToast(`已打开“${item.dataset.projectTitle || "课件"}”`);
});

async function generateLesson() {
  if (generated) { downloadHtml(); return; }
  if (!promptInput.value.trim()) { promptInput.focus(); showToast("先描述你想演示的数学概念"); return; }
  generateBtn.classList.add("is-loading");
  animationStage.classList.add("is-generating");
  $("#generationTitle").textContent = "正在连接 AI 教学设计器…";
  $("#generationCharCount").textContent = "0 字符";
  setGenerationPhase("intent", "正在建立知识点关系…");
  generateBtn.innerHTML = '<span class="sparkle">✦</span><span>正在生成…</span><span class="arrow">·</span>';
  try {
    let lesson;
    try {
      lesson = await requestAiLessonStream(promptInput.value.trim(), updateGenerationProgress);
    } catch (streamError) {
      // Older deployments may not have the stream function yet; preserve generation by retrying JSON mode.
      if (/不可用|不支持|404/.test(streamError.message)) lesson = await requestAiLesson(promptInput.value.trim());
      else throw streamError;
    }
    showLessonResult(lesson, "ai");
    showToast(`AI 已生成“${lesson.title}”，可预览或下载`);
  } catch (error) {
    const title = updateTitleFromPrompt();
    const fallback = { title, grade: "七至九年级", summary: "内置交互演示", objective: "先观察动画，再用自己的话说出变化规律。", steps: [{ title: "先观察", description: "看看动画中的对象从哪里开始变化。", duration: "0:30" }, { title: "再操作", description: "拖动时间轴，验证你的预测。", duration: "1:20" }, { title: "找规律", description: "用数学语言描述你看到的关系。", duration: "2:10" }], html: fallbackGeneratedHtml(title, promptInput.value) };
    currentGeneratedHtml = fallback.html;
    generated = true;
    animationStage.classList.remove("has-ai-preview");
    persistProject(title, promptInput.value, "fallback");
    showToast(`${error.message}，已切换到内置演示，可继续体验`);
  } finally {
    generateBtn.classList.remove("is-loading");
    animationStage.classList.remove("is-generating");
    generateBtn.innerHTML = '<span class="sparkle">↓</span><span>下载 HTML</span><span class="arrow">→</span>';
  }
}
generateBtn.addEventListener("click", generateLesson);

function openFullPreview() {
  $("#fullPreview").classList.add("open");
  requestAnimationFrame(() => drawCube(timelineValue));
}
$("#previewFullBtn").addEventListener("click", openFullPreview);
$("#previewCanvasBtn").addEventListener("click", openFullPreview);
$("#closePreview").addEventListener("click", () => $("#fullPreview").classList.remove("open"));
$("#fullPreview").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.classList.remove("open"); });
$("#fullPlay").addEventListener("click", () => { $("#fullPreview").classList.remove("open"); togglePlaying(true); showToast("动画已在画布中播放"); });

$("#shareBtn").addEventListener("click", () => $("#shareModal").classList.add("open"));
$("#closeShare").addEventListener("click", () => $("#shareModal").classList.remove("open"));
$("#doneShare").addEventListener("click", () => $("#shareModal").classList.remove("open"));
$("#shareModal").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.classList.remove("open"); });
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); } catch { const temp = document.createElement("textarea"); temp.value = text; document.body.appendChild(temp); temp.select(); document.execCommand("copy"); temp.remove(); }
  showToast("链接已复制");
}
$("#copyShareLink").addEventListener("click", () => copyText($("#shareLink").value));
$("#copyLinkBtn").addEventListener("click", () => copyText($("#shareLink").value));

$$('.lesson-tab').forEach((tab) => tab.addEventListener("click", () => {
  $$('.lesson-tab').forEach((item) => item.classList.toggle("active", item === tab));
  ["lesson", "quiz", "notes"].forEach((name) => $(`#${name}Tab`).classList.toggle("hidden", name !== tab.dataset.tab));
}));
bindLessonSteps();
$("#addStep").addEventListener("click", (event) => {
  const count = $$('.lesson-step').length + 1;
  const node = document.createElement("div");
  node.className = "lesson-step";
  node.dataset.step = String(count);
  node.innerHTML = `<span class="step-index">0${count}</span><div><strong>说一说</strong><p>用自己的话描述你看到的变化。</p></div><span class="step-time">3:00</span>`;
  node.addEventListener("click", () => { $$('.lesson-step').forEach((item) => item.classList.toggle("active", item === node)); });
  $(".lesson-steps").appendChild(node);
  showToast("已添加课堂步骤");
});
$("#editSteps").addEventListener("click", () => showToast("课堂步骤已进入编辑状态"));
$$('.tip-close, .caption-close').forEach((button) => button.addEventListener("click", () => button.parentElement?.remove()));
$$('.quiz-option').forEach((option) => option.addEventListener("click", () => {
  $$('.quiz-option').forEach((item) => item.classList.remove("selected", "correct", "wrong"));
  option.classList.add("selected");
  const feedback = $("#quizFeedback");
  const next = $("#nextQuestion");
  if (option.dataset.answer === "a") { option.classList.add("correct"); feedback.textContent = "答对了！中心面周围的四个面可以顺利合拢。"; feedback.classList.remove("error"); }
  else { option.classList.add("wrong"); feedback.textContent = "再想想：折叠后有两个面会重叠。"; feedback.classList.add("error"); }
  next.disabled = false; next.classList.add("enabled"); next.innerHTML = '下一题 <span>→</span>';
}));
$("#nextQuestion").addEventListener("click", () => { showToast("下一题正在准备中，先回到动画找找规律吧"); $("#lessonTab").classList.remove("hidden"); $("#quizTab").classList.add("hidden"); $$('.lesson-tab').forEach((item) => item.classList.toggle("active", item.dataset.tab === "lesson")); });

$("#saveNote").addEventListener("click", () => { localStorage.setItem("math-motion-note", $("#notesArea").value); showToast("备注已保存"); });
$("#profileButton").addEventListener("click", () => $("#accountModal").classList.add("open"));
$("#profileButton").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#accountModal").classList.add("open"); } });
$("#closeAccount").addEventListener("click", () => $("#accountModal").classList.remove("open"));
$("#accountModal").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.classList.remove("open"); });
$("#loginBtn").addEventListener("click", () => { localStorage.setItem("math-motion-user", $("#accountEmail").value); $("#accountModal").classList.remove("open"); showToast("已登录，工作空间同步开启"); });
$$('.nav-item').forEach((item) => item.addEventListener("click", () => {
  $$('.nav-item').forEach((nav) => nav.classList.toggle("active", nav === item));
  if (item.dataset.view !== "new") showToast(`${item.textContent.trim()} 模块将在你的课件生成后显示内容`);
}));

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") generateBtn.click();
  if (event.key === "Escape") $$('.modal-backdrop.open').forEach((modal) => modal.classList.remove("open"));
});

async function checkApiStatus() {
  const chip = $("#apiStatusChip");
  const statusText = $("#apiStatusText");
  const modeText = $("#apiModeText");
  try {
    const response = await fetch(`${API_BASE}/api/status`, { headers: { Accept: "application/json" } });
    const status = await response.json();
    if (status.configured) {
      statusText.textContent = `AI 已连接 · ${status.model || "Responses API"}`;
      modeText.textContent = "AI 生成已开启";
      chip.classList.remove("offline");
    } else {
      statusText.textContent = "AI 未配置 · 可体验内置演示";
      modeText.textContent = "内置演示模式";
      chip.classList.add("offline");
    }
  } catch {
    statusText.textContent = "AI 服务未连接 · 可体验内置演示";
    modeText.textContent = "静态预览模式";
    chip.classList.add("offline");
  }
}

const savedNote = localStorage.getItem("math-motion-note");
if (savedNote && $("#notesArea")) $("#notesArea").value = savedNote;
loadSavedProjects();
checkApiStatus();
setTimeline(0);
window.addEventListener("resize", () => drawCube(timelineValue));
