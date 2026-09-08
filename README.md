# SAT 词汇阅读器

> 沉浸式英文小说阅读 + SAT 词汇学习，支持在线查词、生词本、测验。
>
> 最后更新：2026-07-08

---

## 打开方式

| 方式 | 地址 |
|------|------|
| **GitHub Pages（推荐）** | https://ferrari-serena.github.io/tasks1/ |
| 本地 HTTP 服务器 | http://localhost:5173/tasks1/ |
| 项目总入口 | https://ferrari-serena.github.io/ → 点「项目 tasks1」 |

> 从总入口点击后直接进入阅读器页面，无需任何本地操作。

---

## 当前书目

| 书名 | 章节数 | 查词方式 | 词典来源 |
|------|------|------|------|
| The Fear of Being Seen | 16 章 | 点击红色粗体 SAT 词汇 | 内置 SAT 词典（2000+ 词条） |
| The Lightning Thief (Percy Jackson) | 22 章 | 点击任意英文单词 | 内置词典（954 词条）+ Free Dictionary API 在线兜底（英文释义） |

通过页面左上角下拉框切换书目。

---

## 功能

- 章节阅读（上一章/下一章/跳转）
- 第一本书：点击红色粗体 SAT 词汇 → 弹窗显示中英释义
- 第二本书：点击任意英文单词 → 在线查词弹窗（英文释义 + 音标）
- 生词本（localStorage + CloudBase 云端同步）
- 单词卡片复习（间隔重复 SRS）
- 测验（选择题/填空题，按来源出题）
- 朗读（浏览器语音引擎 / 有道 TTS 在线语音）
- 录音（单词 + 整章录音，IndexedDB 存储）

---

## 文件结构

| 文件 | 用途 |
|------|------|
| `SAT-Vocabulary-Reader.html` | **最终产品** — 自包含单文件应用 |
| `app.js` | 源码 — 所有应用逻辑 |
| `chapters_all.html` | 第一本书章节 HTML（SAT 词汇 `<b>` 标注） |
| `lightning_thief_chapters.html` | 第二本书章节 HTML（无标注） |
| `merged_dict.json` | 第一本书 SAT 词典 |
| `lightning_dict.json` | 第二本书词典（954 词条，英文释义） |
| `build_final.js` | 构建脚本 — 拼接所有文件 |
| `build_lightning_thief.js` | PDF 提取脚本 — 从 PDF 生成章节 HTML |
| `build_lightning_dict.js` | 词典构建脚本 — 提取单词 + 批量查词生成 lightning_dict.json |
| `common_words_top3000.json` | 常用词过滤列表（前 3000 词） |
| `patch_app.js` | 补丁脚本 — 对原始 app.js 应用多书目改动 |
| `BUILD.md` | 构建说明 |

---

## 修改源码后构建

```bash
cd tasks1
node build_final.js
```

输出 `SAT-Vocabulary-Reader.html`，直接在浏览器中通过 HTTP 服务器打开即可。

## 重新构建 Lightning Thief 词典

如需更新第二本书的内置词典（比如换书后重新提取单词）：

```bash
# 需先安装 common_words_top3000.json（常用词过滤列表）
# 下载地址：https://github.com/first20hours/google-10000-english
node build_lightning_dict.js
```

脚本会：
1. 从 `lightning_thief_chapters.html` 提取所有独特英文单词
2. 过滤掉常用词（前 3000）和专有名词
3. 与 `merged_dict.json` 交叉比对，复用已有 SAT 释义
4. 剩余单词批量查询 Free Dictionary API
5. 输出 `lightning_dict.json`

## 新增/替换书目

如需重新提取 The Lightning Thief PDF：

```bash
cd tasks1
node build_lightning_thief.js
```

如需添加第三本书：
1. 准备章节 HTML（格式：`<h2>Chapter N: Title</h2>` + `<p>段落</p>`）
2. 在 `build_final.js` 中添加新模板
3. 在 `BOOKS_CONFIG` 中添加新书配置
4. 在 `app.js` 的 `BookManager` 中注册
5. 运行 `node build_final.js`

## 推送上线

```bash
# 构建后
git add tasks1/SAT-Vocabulary-Reader.html tasks1/app.js tasks1/build_final.js tasks1/lightning_dict.json tasks1/build_lightning_dict.js tasks1/common_words_top3000.json
git commit -m "Update SAT Reader"
git push origin main
# 等 1-3 分钟 → GitHub Pages 自动部署
```
