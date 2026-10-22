/* ================== 班级名单（通用：从 LocalStorage 读取，首次使用请导入 TXT） ==================
   TXT 格式：一行一个名字。导入时自动：
     · 跳过空行
     · 跳过以 # 开头的注释行
     · 跳过含特殊字符的名字（仅保留中文 / 英文字母 / 数字 / 间隔号· / 句点. / 连字符-）
     · 按名字去重
   名单持久化在本机浏览器 LocalStorage，不上传服务器，可直接托管到互联网。 */
const ROSTER_KEY = "vpk_rosters";
function loadRosters(){
  try{ return JSON.parse(localStorage.getItem(ROSTER_KEY)) || {}; }
  catch(e){ return {}; }
}
function saveRosters(o){
  try{ localStorage.setItem(ROSTER_KEY, JSON.stringify(o)); }catch(e){}
}
/* 实时访问当前 ROSTERS 对象（每次调用都从 LocalStorage 读，保证多班级切换后状态最新） */
function rosters(){ return loadRosters(); }

/* 解析 TXT 文本，返回 { names, stat } */
function parseRosterText(text){
  const seen = new Set();
  const names = [];
  const stat = {empty:0, comment:0, invalid:0, dup:0};
  const okRe = /^[一-龥 a-zA-Z0-9·.\-@]+$/;
  String(text).split(/\r?\n/).forEach(raw=>{
    const line = raw.trim();
    if(!line){ stat.empty++; return; }
    if(line.startsWith("#")){ stat.comment++; return; }
    if(!okRe.test(line)){ stat.invalid++; return; }
    if(seen.has(line)){ stat.dup++; return; }
    seen.add(line);
    names.push(line);
  });
  return {names, stat};
}

/* ================== 历史（按班级分开存） ================== */
const hisKey = c => "vpk_his_" + c;
const champKey = c => "vpk_champ_" + c;   /* 擂主（上一局败者）名字：按班级分开存 */
/* 读取/写入本班擂主名字。名字为空则删除记录；下次打开自动回填，仍可随时手改。 */
function loadChamp(c){ try{ return localStorage.getItem(champKey(c)) || ""; }catch(e){ return ""; } }
function saveChamp(c, name){ try{ if(name) localStorage.setItem(champKey(c), name); else localStorage.removeItem(champKey(c)); }catch(e){} }
function loadHis(c){
  try{ return JSON.parse(localStorage.getItem(hisKey(c))) || {matches:[],wrongs:{},streaks:{}}; }
  catch(e){ return {matches:[],wrongs:{},streaks:{}}; }
}
function saveHis(c, h){ try{ localStorage.setItem(hisKey(c), JSON.stringify(h)); }catch(e){} }
/* 待复现错词：按历史错误次数取前 8 */
function reviewWords(c){
  const h = loadHis(c);
  return Object.entries(h.wrongs||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);
}

/* ================== 配置（词库选择 + 时长，按班级存） ================== */
function saveCfg(){
  try{
    localStorage.setItem("vpk_cfg_" + S.cls, JSON.stringify({
      units: S.units, dur: S.dur
    }));
  }catch(e){}
}
