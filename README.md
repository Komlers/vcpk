# 词汇擂台 PK

一款面向高中英语课堂的**双人单词对战网页应用**：红方擂主 vs 蓝方挑战者，限时答题，败者守擂实现车轮战。纯前端运行，无需注册、无需后端，适合教室大屏互动教学。

部署于 CloudFlare Pages，开箱即用。

---

## 功能特性

- **双人同屏 PK**：红蓝双方各占屏幕一侧，同时答题，比拼速度与正确率
- **限时对战**：30s ~ 300s（5min）可调，30s 为分度，倒计时结束自动结算
- **败者守擂**：一局结束后败者自动成为下一局擂主，实现车轮战
- **连击加成**：连续答对触发连击，连击越高得分越多
- **错词复现**：本局答错的词会在后续题目中再次出现，答对即出本
- **战绩统计**：自动记录每场比分、最高连击、错题本，按班级分别保存
- **班级名单**：支持导入名单（每行一个名字），随机抽取选手，可管理多个班级
- **自定义词库**：支持导入本地 JSON 词库，格式与内置词库一致
- **全屏模式**：开始 PK 自动全屏，适配教室大屏
- **禁止右键**：防止触屏长按误触浏览器右键菜单
- **高 DPI 适配**：针对 4K / 300% 缩放大屏优化
- **临时赛事**：可勾选「本次PK不计入战绩」，不记录、不统计、不更新擂主
- **纯单词模式**：可勾选只出单词题，跳过所有词块题型

---

## 题型介绍

### 单词题

| 题型 | 说明 |
|------|------|
| 单词选义 | 给出英文单词，选择正确的中文释义 |

### 词块题（三种轮换）

| 题型 | 说明 |
|------|------|
| 词块选义（c1） | 给出英文词块，选择正确的中文释义 |
| 词块配对（c2） | 给出挖空的题干，选择正确的介词 / 关键词填入 |
| 词块重组（c3） | 将打乱的词块片段按正确顺序点击还原 |

词块按三种家族分类，干扰项优先取自同家族：

- `prep` — 介词搭配（如 `be sensitive to`）
- `phr` — 动词短语（如 `switch on`）
- `coll` — 固定搭配 / 名词短语（如 `artificial intelligence`）

---

## 词库覆盖

共 **25 个内置词库**，覆盖人教版高中英语必修至选择性必修：

| 书 | 单元主题 |
|----|---------|
| 必修1 | Teenage Life、Travelling Around、Sports and Fitness、Natural Disasters、Languages Around the World |
| 必修2 | Cultural Heritage、Wildlife Protection、The Internet、History and Traditions、Music |
| 必修3 | Festivals and Celebrations、Morals and Virtues、Diverse Cultures、Space Exploration、The Value of Money |
| 选必1 | People of Achievement、Looking into the Future、Fascinating Parks、Body Language、Working the Land |
| 选必2 | Science and Scientists、Bridging Cultures、Food and Culture、Journey Across a Vast Land、First Aid |

支持多选词库混合出题，开场题按方案配比，后续题池包含所选词库全部词条。

---

## 目录结构

```
Word/
├── index.html            # 主页面（含所有弹窗结构）
├── 404.html              # CloudFlare Pages 404 页面
├── style.css             # 全局样式
├── favicon.ico
├── sample.txt            # 名单示例文件
├── js/
│   ├── config.js         # 全局配置、词库注册、状态定义
│   ├── storage.js        # localStorage 读写、名单解析
│   ├── wordbank.js       # 词库加载、组卷、干扰项生成
│   ├── ui.js             # UI 渲染、弹窗、配置恢复
│   ├── game.js           # 对战逻辑、计时、结算
│   └── events.js         # 事件绑定
├── lib/                  # 内置词库（25 个 JSON）
│   ├── b1u1.json ~ b1u5.json
│   ├── b2u1.json ~ b2u5.json
│   ├── b3u1.json ~ b3u5.json
│   ├── b4u1.json ~ b4u5.json
│   └── b5u1.json ~ b5u5.json
└── template/
    ├── template.json     # 自定义词库模板
    └── template.md       # 词库格式说明文档
```

---

## 快速开始

### 本地运行

由于浏览器安全限制，`file://` 协议下无法 fetch 本地 JSON 词库，需要通过 HTTP 访问：

```bash
# 方式一：Python（推荐）
python -m http.server 8080

# 方式二：Node.js
npx serve .
```

然后浏览器打开 `http://localhost:8080`。

### 部署到 CloudFlare Pages

1. 将代码推送到 GitHub 仓库
2. 登录 CloudFlare Dashboard → Pages → 创建项目 → 连接仓库
3. 构建配置留空（无需构建命令），输出目录设为根目录
4. 部署完成后获得 `*.pages.dev` 域名

---

## 使用指南

### 1. 导入班级名单

- 准备一个文本文件，每行一个学生姓名（参考 `sample.txt`）
- 点击「导入名单」选择文件，输入班级名称
- 名单自动保存，下次打开直接加载

### 2. 选择词库

- 点击「选择词库」打开弹窗
- 内置词库按册分组，可多选
- 自定义词库在单独选项卡管理

### 3. 开始 PK

- 红方默认为上一局败者（守擂），蓝方为挑战者
- 可随机抽取、手动输入或从名单选择选手
- 点击「开始 PK」自动全屏并进入对战

### 4. 结算与下一局

- 时间结束后显示比分、获胜者、本局错词
- 败者自动成为下一局擂主
- 可选择「下一局」或返回主页

---

## 自定义词库

词库为 JSON 格式，基本结构：

```json
{
  "name": "我的词库",
  "words": [
    ["abandon", "抛弃；放弃"]
  ],
  "chunks": [
    ["be able to", "能够", "phr", "be ____ to do", "able", null]
  ]
}
```

- `words` 必填，`chunks` 可选
- 详细格式说明见 [`template/template.md`](template/template.md)
- 可直接复制 [`template/template.json`](template/template.json) 修改后导入

---

## 快捷键

| 按键 | 功能 |
|------|------|
| `F` | 全屏 / 退出全屏 |
| `Esc` | 退出全屏 |

---

## 数据与隐私

- 所有数据（名单、战绩、擂主、配置、自定义词库）均保存在**浏览器 localStorage** 中
- 不向任何服务器上传数据，无账号系统、无追踪
- 清除浏览器数据会丢失本地记录，建议自行备份名单和自定义词库文件

---

## 技术栈

- 原生 HTML5 / CSS3 / JavaScript（无框架、无构建步骤）
- localStorage 本地持久化
- Fetch API 加载词库
- CloudFlare Pages 静态托管
