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
let timelineValue = 0;
let playing = false;
let playTimer = null;
let generated = false;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function setTimeline(value) {
  timelineValue = clamp(value, 0, 1);
  const percent = `${timelineValue * 100}%`;
  timelineProgress.style.width = percent;
  timelineThumb.style.left = percent;
  const seconds = Math.round(timelineValue * 12);
  timeReadout.textContent = `00:${String(seconds).padStart(2, "0")} / 00:12`;
  cubeNet.classList.toggle("is-net", timelineValue > .78);
  cubeNet.style.transform = timelineValue > .78 ? "rotateX(0deg) rotateY(0deg) rotateZ(0deg) translate(-44px, -1px)" : `rotateX(${-21 + timelineValue * 21}deg) rotateY(${-33 + timelineValue * 33}deg) rotateZ(${1 - timelineValue}deg)`;
  if (timelineValue > .2 && timelineValue < .79) {
    cubeNet.classList.remove("is-net");
  }
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
$$('.suggestion-chip').forEach((chip) => chip.addEventListener("click", () => {
  promptInput.value = chip.dataset.prompt;
  promptInput.focus();
  showToast("已填入教学需求，可以继续修改");
}));

function updateTitleFromPrompt() {
  const value = promptInput.value;
  let title = "自定义数学演示";
  if (/三角形|内角/.test(value)) title = "三角形内角和";
  else if (/函数|坐标/.test(value)) title = "一次函数的图象";
  else if (/勾股/.test(value)) title = "勾股定理面积拼图";
  else if (/正方体|展开/.test(value)) title = "正方体的展开图";
  $("#topTitle").textContent = title;
  const lessonTitle = $(".lesson-intro h3");
  const lessonSub = $(".lesson-intro p");
  if (lessonTitle) lessonTitle.textContent = title;
  if (lessonSub) lessonSub.textContent = title === "正方体的展开图" ? "从立体到平面 · 7 年级上册" : "概念动画 · AI 教学设计";
  return title;
}

function generatedHtml(title, prompt) {
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

function downloadHtml() {
  const title = updateTitleFromPrompt();
  const html = generatedHtml(title, promptInput.value || "请生成一个初中数学动画演示");
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

generateBtn.addEventListener("click", () => {
  if (generated) { downloadHtml(); return; }
  if (!promptInput.value.trim()) { promptInput.focus(); showToast("先描述你想演示的数学概念"); return; }
  generateBtn.classList.add("is-loading");
  animationStage.classList.add("is-generating");
  generateBtn.innerHTML = '<span class="sparkle">✦</span><span>正在生成…</span><span class="arrow">·</span>';
  setTimeout(() => {
    generated = true;
    updateTitleFromPrompt();
    generateBtn.classList.remove("is-loading");
    animationStage.classList.remove("is-generating");
    generateBtn.innerHTML = '<span class="sparkle">↓</span><span>下载 HTML</span><span class="arrow">→</span>';
    showToast("演示已生成，点击按钮即可下载 HTML");
  }, 1600);
});

$("#previewFullBtn").addEventListener("click", () => $("#fullPreview").classList.add("open"));
$("#previewCanvasBtn").addEventListener("click", () => $("#fullPreview").classList.add("open"));
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
$$('.lesson-step').forEach((step) => step.addEventListener("click", () => {
  $$('.lesson-step').forEach((item) => item.classList.toggle("active", item === step));
  const target = Number(step.dataset.step);
  setTimeline([0, .36, .73][target - 1] || 0);
}));
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

setTimeline(0);
