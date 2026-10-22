/* ================== 词库加载 ================== */
async function loadWordBank(){
  for(const {file, tag} of WORD_BANK_FILES){
    const res = await fetch("lib/" + file + ".json", {cache:"no-cache"});
    if(!res.ok) throw new Error("lib/" + file + ".json 加载失败（HTTP " + res.status + "）");
    const data = await res.json();
    LIB_INFO[tag] = { name: data.name || file, file };
    (data.words || []).forEach(w => LIB.push([w[0], w[1], tag]));
    if(data.chunks) CHUNKS = CHUNKS.concat(data.chunks);
  }
  loadCustomLibs();
}

/* ================== 自定义词库（本地导入，持久化到 localStorage） ==================
   存储格式：{ "C1": {name, words:[[en,cn]], chunks:[]}, "C2": {...} }
   自定义词库 tag 以 "C" 开头，file 标记为 "custom" 便于 UI 区分。 */
function loadCustomLibs(){
  let data = {};
  try{ data = JSON.parse(localStorage.getItem(CUSTOM_LIB_KEY)) || {}; }catch(e){}
  for(const tag in data){
    const d = data[tag];
    if(!d || !Array.isArray(d.words)) continue;
    LIB_INFO[tag] = { name: d.name || tag, file: "custom" };
    if(!WORD_BANK_FILES.find(x => x.tag === tag)){
      WORD_BANK_FILES.push({ file: "custom", tag });
    }
    d.words.forEach(w => LIB.push([w[0], w[1], tag]));
    if(Array.isArray(d.chunks)) CHUNKS = CHUNKS.concat(d.chunks);
  }
}
/* 生成下一个可用的自定义 tag（C1, C2, ... 跳过已占用） */
function nextCustomTag(){
  const used = new Set(WORD_BANK_FILES.map(x => x.tag));
  let i = 1;
  while(used.has("C" + i)) i++;
  return "C" + i;
}
/* 导入自定义词库：解析 JSON → 存 localStorage → 合并到内存 → 返回 tag */
function importCustomLib(jsonText){
  let data;
  try{ data = JSON.parse(jsonText); }catch(e){ throw new Error("JSON 解析失败：" + e.message); }
  if(!data || !Array.isArray(data.words) || !data.words.length){
    throw new Error("词库格式不正确：需要 { name, words:[[英文,中文],...] }");
  }
  const tag = nextCustomTag();
  const name = data.name || ("自定义词库 " + tag);
  const entry = { name, words: data.words, chunks: Array.isArray(data.chunks) ? data.chunks : [] };
  /* 持久化 */
  let all = {};
  try{ all = JSON.parse(localStorage.getItem(CUSTOM_LIB_KEY)) || {}; }catch(e){}
  all[tag] = entry;
  localStorage.setItem(CUSTOM_LIB_KEY, JSON.stringify(all));
  /* 合并到内存 */
  LIB_INFO[tag] = { name, file: "custom" };
  WORD_BANK_FILES.push({ file: "custom", tag });
  entry.words.forEach(w => LIB.push([w[0], w[1], tag]));
  if(entry.chunks.length) CHUNKS = CHUNKS.concat(entry.chunks);
  return { tag, name, count: entry.words.length, chunks: entry.chunks.length };
}
/* 删除自定义词库：从 localStorage、内存数组、索引中清除 */
function deleteCustomLib(tag){
  /* 从持久化存储移除 */
  let all = {};
  try{ all = JSON.parse(localStorage.getItem(CUSTOM_LIB_KEY)) || {}; }catch(e){}
  delete all[tag];
  localStorage.setItem(CUSTOM_LIB_KEY, JSON.stringify(all));
  /* 从 WORD_BANK_FILES 移除 */
  const idx = WORD_BANK_FILES.findIndex(x => x.tag === tag);
  if(idx >= 0) WORD_BANK_FILES.splice(idx, 1);
  /* 从 LIB_INFO 移除 */
  delete LIB_INFO[tag];
  /* 从 LIB 中移除该 tag 的单词 */
  for(let i = LIB.length - 1; i >= 0; i--){
    if(LIB[i][2] === tag) LIB.splice(i, 1);
  }
  /* CHUNKS 无法按 tag 区分（词块不含 tag），只能重建索引；词块数据量小，影响有限 */
  buildIndex();
}

/* ================== 索引 ================== */
function buildIndex(){
  for(const k in chunkIdxByEn) delete chunkIdxByEn[k];
  for(const k in wordByEn) delete wordByEn[k];
  CHUNKS.forEach((c,i)=>chunkIdxByEn[c[0]]=i);
  LIB.forEach(w=>wordByEn[w[0]]=w);
  CHUNK_ENS = new Set(CHUNKS.map(c=>c[0]));
}

function specEn(spec){ return spec.t==="w" ? spec.w[0] : CHUNKS[spec.i][0]; }
/* 由"英文/题型"还原题目规格：词块优先，其次单词；kind 为空时用于跨课复现解析 */
function specFromWrong(en, cn, kind){
  const ci = chunkIdxByEn[en];
  if(ci !== undefined){
    const t = (kind==="c2" || kind==="c3") ? kind : "c1";
    return {t:t, i:ci};
  }
  if(wordByEn[en]) return {t:"w", w:wordByEn[en]};
  return null;
}
/* 上节课错的词与词块：按错误次数取前 8 优先复现 */
function reviewSpecs(cls){
  const h = loadHis(cls);
  return Object.entries(h.wrongs||{}).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(e=>specFromWrong(e[0],"","")).filter(Boolean);
}

/* ================== 干扰项生成 ================== */
/* 词块选义干扰项：同家族优先 */
function chunkDistractCn(i){
  const fam = CHUNKS[i][2];
  const same = [], rest = [];
  CHUNKS.forEach((c,j)=>{ if(j===i) return; (c[2]===fam?same:rest).push(j); });
  return shuffle(same).concat(shuffle(rest)).slice(0,3).map(j=>CHUNKS[j][1]);
}
/* 配对题干扰项：介词类取介词池，其余取同家族其他答案（保证 3 个互不相同且≠答案） */
function pairDistract(i){
  const key = CHUNKS[i][5], fam = CHUNKS[i][2];
  const out = [];
  const push = v => { if(v && v!==key && !out.includes(v) && out.length<3) out.push(v); };
  if(fam !== "prep"){
    CHUNKS.forEach((c,j)=>{ if(j!==i && c[2]===fam) push(c[5]); });
  }
  shuffle(PAIR_POOL).forEach(push);
  CHUNKS.forEach(c=>push(c[5]));
  while(out.length<3) out.push("—");
  return shuffle(out);
}
/* 重组题干扰片段 */
function orderDecoys(i, n){
  const out = [], own = CHUNKS[i][6];
  const pool = shuffle(CHUNKS.map((c,j)=>j).filter(j=>j!==i && CHUNKS[j][6]));
  for(const j of pool){
    if(out.length>=n) break;
    const p = shuffle(CHUNKS[j][6])[0];
    if(!out.includes(p) && !own.includes(p)) out.push(p);
  }
  while(out.length<n) out.push("……");
  return out;
}
/* 词块按能力分配续题题型：c2 需配对题干(c[4])、c3 需重组片段(c[6])，否则退回选义 */
function chunkKindFor(i, seq){
  const c = CHUNKS[i];
  if(seq % 3 === 0) return "c1";
  if(c[4]) return "c2";
  if(c[6]) return "c3";
  return "c1";
}
/* 单词题干扰项：同单元优先 → 全书兜底；保证 3 个干扰项互不相同且 != 答案 */
function wordDistract(spec, dir){
  const en = spec.w[0], cn = spec.w[1];
  const key = dir === "e2c" ? 1 : 0;
  const out = [], seen = new Set([dir === "e2c" ? cn : en]);
  const pool = libFiltered().concat(LIB);
  for(const w of shuffle(pool)){
    if(w[0] === en) continue;
    const v = w[key];
    if(!v || seen.has(v)) continue;
    seen.add(v); out.push(v);
    if(out.length >= 3) break;
  }
  return out;
}

/* ================== 题源与配比 ================== */
/* 单词候选题源（词块与单词撞名时，该词条只出词块题） */
function wordSource(){
  const list = libFiltered();
  return S.useChunks ? list.filter(w=>!CHUNK_ENS.has(w[0])) : list;
}
/* 题池规模（与 buildPool 口径一致） */
function poolRange(){
  const words = libFiltered();
  return { words:(S.useChunks ? words.filter(w=>!CHUNK_ENS.has(w[0])) : words).length,
           chunks:(S.useChunks ? CHUNKS.length : 0) };
}
/* 开场配比：按时长（秒）在锚点间线性插值 */
function planFor(sec){
  const A = [[30,2,0,0,0],[120,5,4,2,1],[180,7,6,3,2],[240,10,8,4,3],[300,13,10,5,4]];
  if(sec <= A[0][0]) return {w:A[0][1],c1:A[0][2],c2:A[0][3],c3:A[0][4]};
  for(let i=1;i<A.length;i++){
    if(sec <= A[i][0]){
      const r = (sec-A[i-1][0])/(A[i][0]-A[i-1][0]);
      return { w:Math.round(A[i-1][1]+(A[i][1]-A[i-1][1])*r),
               c1:Math.round(A[i-1][2]+(A[i][2]-A[i-1][2])*r),
               c2:Math.round(A[i-1][3]+(A[i][3]-A[i-1][3])*r),
               c3:Math.round(A[i-1][4]+(A[i][4]-A[i-1][4])*r) };
    }
  }
  return {w:13,c1:10,c2:5,c3:4};
}
/* 按当前选词库过滤 */
function libFiltered(){
  if(!S.units.length) return [];
  return LIB.filter(w => S.units.includes(w[2]));
}

/* ================== 组卷 ================== */
/* 题池 = 选中词库的全部词条，开场按 planFor 配比，错项优先注入 */
function buildPool(){
  const plan = planFor(S.dur);
  const mix = S.useChunks;
  const words = shuffle(wordSource());
  const cAll = shuffle(CHUNKS.map((c,i)=>i));
  const used = new Set();                       // 键=en：同一词条本局只出一道题（不分题型）
  const mk = (arr, s) => { const e = specEn(s); if(used.has(e)) return; used.add(e); arr.push(s); };
  /* ① 开场段：按 PLAN 配比选词（保证课堂节奏与设计一致，内部乱序） */
  const open = [];
  let wi = 0;
  for(let i=0;i<plan.w && wi<words.length;i++) mk(open, {t:"w", w:words[wi++]});
  if(mix){
    const taken = new Set();
    const take = (k, n) => {
      if(!n) return;
      const cand = k === "c2" ? cAll.filter(i=>CHUNKS[i][4])
                 : k === "c3" ? cAll.filter(i=>CHUNKS[i][6]) : cAll;
      let c = 0;
      for(const i of cand){ if(c >= n) break; if(taken.has(i)) continue; taken.add(i); mk(open, {t:k, i:i}); c++; }
    };
    take("c1", plan.c1); take("c2", plan.c2); take("c3", plan.c3);
    /* ② 续题段：其余全部单词 + 其余全部词块（轮转题型），打散后整段续在题池尾部 */
    const restW = [], restC = [];
    for(; wi<words.length; wi++) mk(restW, {t:"w", w:words[wi]});
    let n = 0;
    for(const i of cAll){ if(taken.has(i)) continue; mk(restC, {t:chunkKindFor(i, n++), i:i}); }
    const rest = [];
    const len = Math.max(restW.length, restC.length);
    for(let i=0;i<len;i++){ if(restW[i]) rest.push(restW[i]); if(restC[i]) rest.push(restC[i]); }
    const pool = shuffle(open).concat(shuffle(rest));
    const rv = reviewSpecs(S.cls);
    S.reviewList = rv.map(specEn);
    const rvKeys = new Set(S.reviewList);
    S.pool = rv.concat(pool.filter(s=>!rvKeys.has(specEn(s))));
  }else{
    /* 纯单词模式：题池 = 该单元/全书的全部单词 */
    for(; wi<words.length; wi++) mk(open, {t:"w", w:words[wi]});
    const pool = shuffle(open);
    const rv = reviewSpecs(S.cls);
    S.reviewList = rv.map(specEn);
    const rvKeys = new Set(S.reviewList);
    S.pool = rv.concat(pool.filter(s=>!rvKeys.has(specEn(s))));
  }
}
