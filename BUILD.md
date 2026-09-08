# SAT Vocabulary Reader - 构建说明

## 版本
v1.0 - 完整可用版本 (532KB)

## 文件说明

| 文件 | 用途 | 修改方式 |
|------|------|----------|
| `app.js` | **唯一真相源** - 全部功能代码 | 直接编辑 |
| `chapters_all.html` | 16章小说HTML | Node.js build_all.js 生成 |
| `merged_dict.json` | SAT词典 | Node.js build_all.js 生成 |
| `full_novel_text.txt` | 小说纯文本 | 从.docx提取 |
| `SAT-Vocabulary-Reader.html` | **输出文件** - 最终产品 | 由 build_final.js 生成 |

## 每次修改后的构建命令

```powershell
cd tasks1
node build_final.js
```

然后双击 `tasks1\SAT-Vocabulary-Reader.html`

## 构建原则

- `build_final.js` 只做**纯拼接**，不修改任何代码
- 所有样式、图标、逻辑都写在 `app.js` 里
- **永远不要**用 PowerShell 的 `-replace` 修改 JS 代码（会吃掉 `$` 符号）

## 回滚

如果当前版本出问题：
```powershell
git checkout SAT-Vocabulary-Reader.html app.js
```
