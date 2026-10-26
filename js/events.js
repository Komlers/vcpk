/* ================== 抽人 ================== */
$("redBox").addEventListener("click", ()=>{
  const name = takeName(blueName);
  if(!name){ $("drawInfo").textContent = "名单人数不足，无法抽取红方（请先导入或在名单中增加学生）。"; return; }
  animateDraw("redNameBox", name, ()=>{ redName = name; champFixed = false; renderHistory(); });
});
$("blueBox").addEventListener("click", ()=>{
  const name = takeName(redName);
  if(!name){ $("drawInfo").textContent = "名单人数不足，无法抽取蓝方（请先导入或在名单中增加学生）。"; return; }
  animateDraw("blueNameBox", name, ()=>{ blueName = name; renderHistory(); });
});
$("manualBtn").addEventListener("click", ()=>{
  manualMode = !manualMode;
  $("manualRow").classList.toggle("hidden", !manualMode);
  $("manualBtn").textContent = manualMode ? "收起" : "输入";
  refreshNameBoxes();   /* 打开手输时，把手输框预填为当前名字 */
});
$("m1").addEventListener("input", e=>{ const raw = e.target.value.trim(); redName = resolveGhostName(raw); $("redNameBox").textContent = dispName(redName) || "待抽取"; champFixed=false; renderHistory(); });
$("m2").addEventListener("input", e=>{ const raw = e.target.value.trim(); blueName = resolveGhostName(raw); $("blueNameBox").textContent = dispName(blueName) || "待抽取"; renderHistory(); });

/* ================== 选名弹窗 ================== */
$("pickBtn").addEventListener("click", ()=>{
  pickSide = "red";
  document.querySelectorAll(".pickTab").forEach(t=>{
    t.classList.toggle("on", t.dataset.side === "red");
    t.classList.toggle("red-on", t.dataset.side === "red");
    t.classList.remove("blue-on");
  });
  renderPickGrid();
  $("pickModal").classList.remove("hidden");
});
document.querySelectorAll(".pickTab").forEach(t=>{
  t.addEventListener("click", ()=>{
    pickSide = t.dataset.side;
    document.querySelectorAll(".pickTab").forEach(x=>{
      const on = x.dataset.side === pickSide;
      x.classList.toggle("on", on);
      x.classList.toggle("red-on", on && pickSide === "red");
      x.classList.toggle("blue-on", on && pickSide === "blue");
    });
    renderPickGrid();
  });
});
$("pickCancel").addEventListener("click", ()=>$("pickModal").classList.add("hidden"));
$("pickModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("pickModal").classList.add("hidden");
});

/* ================== 班级切换 / 删除 ================== */
$("classChips").addEventListener("click", e=>{
  const chip = e.target.closest(".chip");
  if(!chip) return;
  const cls = chip.dataset.cls;
  if(e.target.closest(".clsDel")){
    if(!confirm("确定删除班级「" + cls + "」的名单？其对战历史、擂主和配置也会一并清除。")) return;
    const rs = rosters();
    delete rs[cls];
    saveRosters(rs);
    try{
      localStorage.removeItem(hisKey(cls));
      localStorage.removeItem(champKey(cls));
      localStorage.removeItem("vpk_cfg_" + cls);
    }catch(err){}
    if(S.cls === cls){ S.cls = ""; redName = ""; blueName = ""; champFixed = false; }
    autoSelectClass();
    resetDrawn(); refreshNameBoxes(); restoreCfg(); renderHistory();
    return;
  }
  document.querySelectorAll("#classChips .chip").forEach(x=>x.classList.remove("on"));
  chip.classList.add("on");
  S.cls = cls;
  redName = ""; blueName = "";
  redName = loadChamp(S.cls);
  champFixed = !!redName;
  resetDrawn(); refreshNameBoxes(); restoreCfg(); renderHistory();
});

/* ================== 导入 TXT 名单 ================== */
$("importRosterBtn").addEventListener("click", ()=>{
  const name = prompt("请输入要导入的班级名称：");
  if(name === null) return;
  const cls = name.trim();
  if(!cls){ alert("班级名称不能为空。"); return; }
  pendingClass = cls;
  $("rosterFile").click();
});
$("rosterFile").addEventListener("change", e=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const cls = pendingClass; pendingClass = "";
  const reader = new FileReader();
  reader.onload = ()=>{
    const {names, stat} = parseRosterText(reader.result);
    e.target.value = "";
    if(!names.length){
      alert("文件里没有解析出有效名字。请确认 TXT 是一行一个名字，且名字只含中文 / 字母 / 数字。");
      return;
    }
    const existing = rosters();
    if(existing[cls] && !confirm("班级「" + cls + "」已有名单（" + existing[cls].length + " 人），导入将覆盖旧名单，确定继续？")) return;
    existing[cls] = names;
    saveRosters(existing);
    S.cls = cls;
    redName = ""; blueName = ""; champFixed = false;
    resetDrawn(); restoreCfg(); refreshNameBoxes(); renderHistory();
    const skip = [];
    if(stat.empty)   skip.push("空行 " + stat.empty);
    if(stat.comment) skip.push("注释行 " + stat.comment);
    if(stat.invalid)  skip.push("特殊字符行 " + stat.invalid);
    if(stat.dup)      skip.push("重复名 " + stat.dup);
    alert("✅ 已导入「" + cls + "」共 " + names.length + " 人。"
      + (skip.length ? "\n跳过：" + skip.join("、") : ""));
  };
  reader.readAsText(file, "UTF-8");
});
$("clearBtn").addEventListener("click", ()=>{
  if(confirm("确定清空 " + S.cls + " 的全部对战历史和擂主记录吗？此操作不可恢复。")){
    localStorage.removeItem(hisKey(S.cls));
    saveChamp(S.cls, "");
    redName = ""; blueName = ""; champFixed = false;
    refreshNameBoxes(); renderHistory();
  }
});

/* ================== 词库弹窗 ================== */
$("openLibModal").addEventListener("click", ()=>{
  tempUnits = S.units.slice();
  renderLibChips();
  /* 每次打开默认显示内置词库选项卡 */
  switchLibTab("builtin");
  $("libModal").classList.remove("hidden");
});
$("libCancel").addEventListener("click", ()=>$("libModal").classList.add("hidden"));
$("libModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("libModal").classList.add("hidden");
});

/* ================== 词库选项卡切换 ================== */
function switchLibTab(name){
  document.querySelectorAll(".libTab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  $("builtinPanel").classList.toggle("hidden", name !== "builtin");
  $("customPanel").classList.toggle("hidden", name !== "custom");
}
document.querySelectorAll(".libTab").forEach(tab => {
  tab.addEventListener("click", () => switchLibTab(tab.dataset.tab));
});

/* chip 点击（事件委托到整个弹窗，覆盖内置和自定义两个面板） */
$("libModal").addEventListener("click", e=>{
  const chip = e.target.closest(".libChip");
  if(!chip) return;
  const tag = chip.dataset.tag;
  if(tempUnits.includes(tag)) tempUnits = tempUnits.filter(t => t !== tag);
  else tempUnits.push(tag);
  renderLibChips();
});

/* ================== 导入本地词库 ================== */
$("importLibBtn").addEventListener("click", ()=>$("libFile").click());
$("libFile").addEventListener("change", e=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    e.target.value = "";
    try{
      const r = importCustomLib(reader.result);
      tempUnits.push(r.tag);
      renderLibChips();
      alert("✅ 已导入词库「" + r.name + "」：" + r.count + " 个单词"
        + (r.chunks ? " + " + r.chunks + " 个词块" : "") + "。\n已自动选中，点确定后生效。");
    }catch(err){
      alert("❌ 导入失败：" + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
});
$("libConfirm").addEventListener("click", ()=>{
  if(!tempUnits.length){ alert("请至少选择一个词库！"); return; }
  S.units = tempUnits;
  S.useChunks = !S.wordsOnly && S.units.includes("U2");
  saveCfg();
  updateLibBtn();
  planInfo();
  $("libModal").classList.add("hidden");
});

/* ================== 只加载纯单词 ================== */
$("wordsOnlyChk").addEventListener("change", e=>{
  S.wordsOnly = e.target.checked;
  S.useChunks = !S.wordsOnly && S.units.includes("U2");
  saveCfg();
  planInfo();
});

/* ================== 本次PK不计入战绩（临时赛，不持久化） ================== */
$("noRecordChk").addEventListener("change", e=>{
  S.noRecord = e.target.checked;
});

/* ================== 擂台设置弹窗 ================== */
$("settingBtn").addEventListener("click", ()=>$("settingModal").classList.remove("hidden"));
$("settingClose").addEventListener("click", ()=>$("settingModal").classList.add("hidden"));
$("settingModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("settingModal").classList.add("hidden");
});
$("rememberWrongChk").addEventListener("change", e=>{
  S.rememberWrong = e.target.checked;
  saveCfg();
  planInfo();
});
/* 擂台超时检测开关 */
$("questionTimeoutChk").addEventListener("change", e=>{
  S.questionTimeout = e.target.checked;
  renderQuestionTimeoutUI();
  saveCfg();
});
/* 每题限时 3s / 5s / 7s */
$("qTimeoutRow").addEventListener("click", e=>{
  const btn = e.target.closest(".qTimeoutOpt");
  if(!btn || !S.questionTimeout) return;
  S.questionTimeoutDur = parseInt(btn.dataset.sec);
  renderQuestionTimeoutUI();
  saveCfg();
});

/* ================== 更新提示弹窗 ================== */
/* 「我知道了」：记录当前版本为已读，以后不再弹 */
$("updateGotIt").addEventListener("click", ()=>{
  try{ localStorage.setItem(UPDATE_READ_KEY, APP_VERSION); }catch(e){}
  $("updateModal").classList.add("hidden");
});
/* 「稍后处理」：不记录，下次进入仍弹出 */
$("updateLater").addEventListener("click", ()=>{
  $("updateModal").classList.add("hidden");
});

/* ================== 规则介绍弹窗 ================== */
$("ruleBtn").addEventListener("click", ()=>$("ruleModal").classList.remove("hidden"));
$("ruleClose").addEventListener("click", ()=>$("ruleModal").classList.add("hidden"));
$("ruleModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("ruleModal").classList.add("hidden");
});

/* ================== 历史战绩弹窗 ================== */
$("hisBtn").addEventListener("click", ()=>{
  renderHistory();
  $("hisModal").classList.remove("hidden");
});
$("hisClose").addEventListener("click", ()=>$("hisModal").classList.add("hidden"));
$("hisModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("hisModal").classList.add("hidden");
});

/* ================== 开始 PK / 限时 ================== */
$("startBtn").addEventListener("click", ()=>{
  if(!redName || !blueName){ alert("请先抽取（或手输）红蓝双方选手！"); return; }
  if(!S.units.length){ alert("请先选择词库！"); return; }
  S.useChunks = !S.wordsOnly && S.units.includes("U2");
  saveCfg();
  S.p1 = redName; S.p2 = blueName;
  /* 未全屏则自动进入全屏，保证对战体验 */
  if(!fsElement()){ toggleFullscreen(); }
  startBattle(false);
});
/* ================== 时长选择弹窗 ================== */
let tempDur = 60;
$("openDurModal").addEventListener("click", ()=>{
  tempDur = S.dur;
  renderDurPicker(tempDur);
  $("durModal").classList.remove("hidden");
});
$("durMinus").addEventListener("click", ()=>{
  if(tempDur > 30){ tempDur -= 30; renderDurPicker(tempDur); }
});
$("durPlus").addEventListener("click", ()=>{
  if(tempDur < 300){ tempDur += 30; renderDurPicker(tempDur); }
});
$("durConfirm").addEventListener("click", ()=>{
  S.dur = tempDur;
  updateDurBtn();
  planInfo();
  saveCfg();
  $("durModal").classList.add("hidden");
});
$("durCancel").addEventListener("click", ()=>$("durModal").classList.add("hidden"));
$("durModal").addEventListener("click", e=>{
  if(e.target.classList.contains("modalMask")) $("durModal").classList.add("hidden");
});

/* ================== 对战答题 ================== */
$("side1").addEventListener("click", e=>answer(1, e));
$("side2").addEventListener("click", e=>answer(2, e));

/* ================== 结算页按钮 ================== */
$("againBtn").addEventListener("click", ()=>{
  /* 败者/连击低者守擂：红方已定，只需重抽蓝方；全对平局则擂主已清空，红蓝都重抽 */
  redName = loadChamp(S.cls);
  champFixed = !!redName; blueName = "";
  show("setup"); refreshNameBoxes(); renderHistory();
});
$("reviveBtn").addEventListener("click", ()=>startBattle(true));
$("homeBtn").addEventListener("click", ()=>{
  show("setup");
  redName = loadChamp(S.cls);
  champFixed = !!redName; blueName = "";
  refreshNameBoxes(); renderHistory();
});

/* ================== 全屏 ==================
   按钮固定在右上角，三个界面都可点；F 键切换，Esc 由浏览器直接退出。
   兼容各种叫法（标准 / webkit / 旧版 ms）。 */
function fsElement(){
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}
function fsSupported(){
  const e = document.documentElement;
  return !!(e.requestFullscreen || e.webkitRequestFullscreen || e.msRequestFullscreen);
}
function syncFsBtn(){
  const on = !!fsElement();
  $("fsBtn").classList.toggle("on", on);
  $("fsLabel").textContent = on ? "退出" : "全屏";
}
function toggleFullscreen(){
  try{
    if(fsElement()){
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document);
    }else{
      const e = document.documentElement;
      (e.requestFullscreen || e.webkitRequestFullscreen || e.msRequestFullscreen).call(e);
    }
  }catch(err){ /* 浏览器拒绝时静默忽略，不影响使用 */ }
}
$("fsBtn").addEventListener("click", toggleFullscreen);
["fullscreenchange","webkitfullscreenchange","MSFullscreenChange"].forEach(ev=>{
  document.addEventListener(ev, syncFsBtn);
});
document.addEventListener("keydown", e=>{
  if(e.key === "f" || e.key === "F"){
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if(tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) return;
    e.preventDefault(); toggleFullscreen();
  }
});
syncFsBtn();
if(!fsSupported()){ $("fsBtn").style.display = "none"; }

/* ================== 禁止右键菜单 ==================
   触屏大屏上学生长按容易触发 Windows 右键，弹出浏览器菜单影响答题。
   全局拦截 contextmenu，包括鼠标右键和触屏长按。 */
document.addEventListener("contextmenu", e => e.preventDefault());
