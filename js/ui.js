/* ================== 音效与特效 ================== */
function speak(txt){
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = "en-US"; u.rate = 0.85;
    speechSynthesis.speak(u);
  }catch(e){}
}
function beep(freq, dur){
  try{
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext||window.webkitAudioContext)());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; o.type = "sine";
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }catch(e){}
}
function fx(txt, color, xPct){
  const d = document.createElement("div");
  d.className = "fx"; d.textContent = txt;
  d.style.color = color;
  d.style.left = xPct + "%"; d.style.top = "34%";
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 1000);
}

/* ================== 页面切换 ================== */
function show(id){
  ["setup","battle","result"].forEach(x=>$(x).classList.toggle("hidden", x!==id));
}

/* ================== 班级与战绩渲染 ================== */
/* 班级选择：根据 LocalStorage 中的名单动态渲染 chips */
function renderChips(){
  const box = $("classChips");
  const rs = rosters();
  const names = Object.keys(rs);
  box.innerHTML = "";
  names.forEach(cls=>{
    const chip = document.createElement("div");
    chip.className = "chip" + (cls === S.cls ? " on" : "");
    chip.dataset.cls = cls;
    const cnt = document.createElement("span");
    cnt.className = "cnt";
    cnt.textContent = (rs[cls]||[]).length + " 人";
    const del = document.createElement("span");
    del.className = "clsDel";
    del.textContent = "×";
    del.title = "删除该班名单";
    chip.appendChild(document.createTextNode(cls));
    chip.appendChild(cnt);
    chip.appendChild(del);
    box.appendChild(chip);
  });
  const tip = $("noRosterTip");
  if(tip) tip.style.display = names.length ? "none" : "";
  const ib = $("importRosterBtn");
  if(ib) ib.textContent = names.length ? "导入" : "📥 导入班级名单（TXT）";
}
function renderHistory(){
  const h = loadHis(S.cls);
  const t = $("hisTitle"); if(t) t.textContent = S.cls ? ("📊 " + S.cls + " 战绩") : "📊 战绩";
  renderChips();
  const body = $("hisBody"), clearBtn = $("clearBtn");
  if(!h.matches.length){
    body.innerHTML = "暂无记录";
    clearBtn.classList.add("hidden");
  }else{
    const wins = {};
    h.matches.forEach(m => {
      if(m.s1 > m.s2) wins[m.p1] = (wins[m.p1]||0)+1;
      else if(m.s2 > m.s1) wins[m.p2] = (wins[m.p2]||0)+1;
    });
    const winTop = Object.entries(wins).sort((a,b)=>b[1]-a[1])[0];
    const stTop = Object.entries(h.streaks||{}).sort((a,b)=>b[1]-a[1])[0];
    let html = '<div class="row">'
      + '<div class="stat">总场次 <b>' + h.matches.length + '</b></div>';
    if(winTop) html += '<div class="stat">胜场王 <b>' + esc(winTop[0]) + ' ' + winTop[1] + '胜</b></div>';
    if(stTop) html += '<div class="stat">连击纪录 <b>' + esc(stTop[0]) + ' x' + stTop[1] + '</b></div>';
    html += "</div>";
    html += '<div id="recentList">' + h.matches.slice(-5).reverse().map(m=>{
      const res = m.s1===m.s2 ? "平局" : (m.s1>m.s2 ? esc(m.p1)+" 胜" : esc(m.p2)+" 胜");
      const d = new Date(m.t);
      const tag = (d.getMonth()+1) + "/" + d.getDate();
      return '<div class="recentItem"><span>' + esc(m.p1) + ' ' + m.s1 + ' : ' + m.s2 + ' ' + esc(m.p2)
        + '</span><span class="mini">' + m.unit + " · " + res + " · " + tag + '</span></div>';
    }).join("") + "</div>";
    body.innerHTML = html;
    clearBtn.classList.remove("hidden");
  }
  const rw = reviewWords(S.cls).length;
  let info = "";
  if(redName) info += "擂主已就位：" + esc(redName) + (champFixed ? "（上局败者守擂）" : "") + "。";
  if(rw) info += "🔁 待复现错词 " + rw + " 个，将优先出题（答对即出本）。";
  $("drawInfo").textContent = info || "先抽擂主（红方），再抽挑战者（蓝方）。";

  /* 名单载入状态：直观确认名单已导入、还剩多少人没抽 */
  if(!S.cls){
    $("rosterInfo").textContent = "⚠ 还没有班级名单，请点上方「导入班级名单（TXT）」按钮，从本地 TXT 导入。";
    return;
  }
  const roster = rosters()[S.cls] || [];
  $("rosterInfo").textContent = roster.length
    ? "✅ 名单已载入：" + S.cls + " · 共 " + roster.length + " 人"
    : "⚠ 「" + S.cls + "」名单为空，请重新导入 TXT。";
}

/* ================== 抽人 ================== */
function resetDrawn(){ drawnPool = shuffle(rosters()[S.cls] || []); }
function takeName(exclude){
  if(!rosters()[S.cls] || !rosters()[S.cls].length) return "";
  if(!drawnPool.length) resetDrawn();
  let idx = drawnPool.findIndex(n => n !== exclude);
  if(idx < 0){ resetDrawn(); idx = drawnPool.findIndex(n => n !== exclude); }
  if(idx < 0) return "";   /* 全班只剩对方一人，无法再抽出不同选手 */
  return drawnPool.splice(idx, 1)[0];
}
function animateDraw(boxId, finalName, done){
  const names = rosters()[S.cls] || ["?"];
  const box = $(boxId);
  const shell = box.parentElement;                 /* 抽取中给外框加虚线闪烁 */
  if(shell) shell.classList.add("drawing");
  let ticks = 0;
  const iv = setInterval(()=>{
    box.textContent = names[(Math.random()*names.length)|0];
    if(++ticks > 15){
      clearInterval(iv);
      box.textContent = finalName || "—";
      if(shell) shell.classList.remove("drawing");
      beep(880, .1);
      if(done) done();
    }
  }, 70);
}
function refreshNameBoxes(){
  $("redNameBox").textContent = redName || "待抽取";
  $("blueNameBox").textContent = blueName || "待抽取";
  /* 手输框始终同步当前名字：打开"手输名字"即可直接修改，无需重敲 */
  $("m1").value = redName;
  $("m2").value = blueName;
}

/* ================== 选名弹窗 ================== */
function renderPickGrid(){
  const grid = $("pickGrid");
  const roster = rosters()[S.cls] || [];
  grid.innerHTML = "";
  if(!roster.length){
    grid.innerHTML = '<div class="pickEmpty">当前班级还没有名单，请先导入 TXT 名单</div>';
    return;
  }
  const cur = pickSide === "red" ? redName : blueName;
  roster.forEach(n=>{
    const el = document.createElement("div");
    el.className = "pickName" + (n === cur ? " cur" : "");
    el.textContent = n;
    el.addEventListener("click", ()=>{
      if(pickSide === "red"){ redName = n; champFixed = false; saveChamp(S.cls, n); }
      else { blueName = n; }
      refreshNameBoxes(); renderHistory();
      $("pickModal").classList.add("hidden");
    });
    grid.appendChild(el);
  });
}

/* ================== 词库弹窗与限时 ================== */
function renderLibChips(){
  const box = $("libChips");
  box.innerHTML = "";
  WORD_BANK_FILES.forEach(({file, tag}) => {
    const chip = document.createElement("div");
    chip.className = "libChip" + (tempUnits.includes(tag) ? " on" : "");
    chip.dataset.tag = tag;
    chip.textContent = (LIB_INFO[tag] && LIB_INFO[tag].name) ? LIB_INFO[tag].name : file;
    box.appendChild(chip);
  });
  $("libHint").textContent = tempUnits.length === 0 ? "未选择词库（请至少选一个）"
    : (tempUnits.length === 1 ? "当前单词库" : "当前多词库（已选 " + tempUnits.length + " 个）");
}
function updateLibBtn(){
  const n = S.units.length;
  $("openLibModal").textContent = n ? "📚 已选 " + n + " 个词库" : "📚 选择词库";
}
/* 限时下拉：根据 S.dur 设置 select 选中项 */
function updateDurSelect(){
  $("durSelect").value = String(S.dur);
}

/* ================== 配置恢复 ================== */
function restoreCfg(){
  /* 先按当前班级重置，避免沿用上一个班级的词库/时长 */
  S.units = [];
  S.dur = 120;
  try{
    const c = JSON.parse(localStorage.getItem("vpk_cfg_" + S.cls));
    if(c){
      if(Array.isArray(c.units) && c.units.length) S.units = c.units.filter(t => LIB_INFO[t]);
      if(c.dur) S.dur = c.dur;
    }
  }catch(e){}
  // 默认全选
  if(!S.units.length) S.units = WORD_BANK_FILES.map(x => x.tag);
  S.useChunks = S.units.includes("U2");
  updateDurSelect();
  updateLibBtn();
}
/* 题池提示：随选词库与时长实时更新 */
function planInfo(){
  const p = planFor(S.dur);
  const total = S.useChunks ? p.w + p.c1 + p.c2 + p.c3 : p.w;
  const mins = (S.dur/60).toFixed(1).replace(/\.0$/,"");
  const rg = poolRange();
  const poolN = rg.words + rg.chunks;
  const head = S.useChunks
    ? "开场配比（" + mins + " 分钟）：" + p.w + " 单词 + " + p.c1 + " 词块选义 + " + p.c2 + " 词块配对 + " + p.c3 + " 词块重组 ＝ " + total + " 题"
    : "开场配比（" + mins + " 分钟）：纯单词 " + p.w + " 题（选含词块的词库可加入词块题）";
  $("planInfo").textContent = head + "｜本题池 " + poolN + " 条（"
    + rg.words + " 单词" + (rg.chunks ? " + " + rg.chunks + " 词块" : "") + "），可持续出 " + poolN + " 题不重复";
}
/* 没有指定班级时，自动选 LocalStorage 里第一个班级 */
function autoSelectClass(){
  if(S.cls && rosters()[S.cls]) return;
  const names = Object.keys(rosters());
  S.cls = names[0] || "";
}
