# OpenMarkdown 编辑器开发计划

## 一、项目概述

### 1.1 项目目标

OpenMarkdown 是一个功能完善的 Markdown 编辑器，采用 Wails 框架构建桌面应用。编辑器默认采用可视化（WYSIWYG）编辑模式，同时支持在菜单中切换到源码模式查看和编辑原始 Markdown 内容。

项目设计参考 Quill 编辑器的核心思想：
- **API 驱动设计**：以内容为中心，而非以 DOM 为中心
- **模块化架构**：通过模块化设计支持扩展
- **统一数据模型**：可视化模式与源码模式共享同一数据源

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 桌面框架 | Wails | Go + Web 前端打包为桌面应用 |
| 前端框架 | 原生 TypeScript | 不使用 React/Vue 等框架 |
| UI 框架 | Bootstrap 5 | 响应式 UI 组件库 |
| 构建工具 | Vite | 快速开发构建 |
| Markdown 解析 | marked | 高性能 Markdown 解析器 |
| 语言 | TypeScript + Go | 前端 TS，后端 Go |

### 1.3 项目特性

- **双模式编辑**：可视化模式（默认）+ 源码模式
- **实时预览**：分屏预览 Markdown 渲染效果
- **文件系统集成**：打开、保存 Markdown 文件
- **工具栏**：常用格式化功能快捷操作
- **主题支持**：亮色/暗色主题切换
- **跨平台**：Windows、macOS、Linux 支持

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      OpenMarkdown                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │    Menu     │    │   Toolbar   │    │   Status    │    │
│  │   (Wails)   │    │             │    │    Bar      │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Editor Container                     │   │
│  │  ┌───────────────────────┐ ┌───────────────────────┐ │   │
│  │  │   Editor Panel        │ │   Preview Panel       │ │   │
│  │  │                       │ │   (可选分屏)          │ │   │
│  │  │  ┌─────────────────┐  │ │                       │ │   │
│  │  │  │ Visual / Source │  │ │   Rendered HTML       │ │   │
│  │  │  │   Mode Toggle   │  │ │                       │ │   │
│  │  │  └─────────────────┘  │ │                       │ │   │
│  │  └───────────────────────┘ └───────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Content Model                       │   │
│  │            (Markdown 统一数据层)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Wails Backend                       │   │
│  │     文件操作 | 窗口管理 | 系统菜单 | 原生对话框        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 编辑器核心架构

编辑器采用双模式设计，核心是统一的数据模型：

```
┌────────────────────────────────────────────────────────────┐
│                    Editor Core                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────┐     │
│  │   Visual Mode   │  ←────→  │    Source Mode      │     │
│  │   (WYSIWYG)     │  双向同步 │    (Raw .md)        │     │
│  └────────┬────────┘         └──────────┬──────────┘     │
│           │                               │                 │
│           │     ┌───────────────┐         │                 │
│           └────►│  Markdown     │◄────────┘                 │
│                 │   Model       │                           │
│                 │  (单一数据源)   │                           │
│                 └───────────────┘                           │
│                         │                                    │
│                         ▼                                    │
│                 ┌───────────────┐                           │
│                 │   Renderer    │                           │
│                 │ (marked解析)   │                           │
│                 └───────────────┘                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 2.3 模块设计

#### 2.3.1 MarkdownModel（数据模型）

负责管理编辑器内容的单一数据源：

```typescript
interface MarkdownModel {
  // 获取当前内容（Markdown格式）
  getContent(): string;
  
  // 设置内容
  setContent(markdown: string): void;
  
  // 订阅内容变化
  subscribe(callback: (content: string) => void): () => void;
  
  // 导出HTML
  toHTML(): string;
  
  // 从HTML导入（用于可视化编辑）
  fromHTML(html: string): void;
}
```

#### 2.3.2 VisualEditor（可视化编辑器）

基于 contenteditable 的 WYSIWYG 编辑器：

```typescript
interface VisualEditor {
  // 初始化编辑器
  init(container: HTMLElement): void;
  
  // 设置内容（HTML）
  setContent(html: string): void;
  
  // 获取内容（HTML）
  getContent(): string;
  
  // 执行格式化命令
  format(format: string, value?: any): void;
  
  // 获取当前选区格式
  getFormat(): Record<string, any>;
  
  // 插入内容
  insertContent(content: string): void;
  
  // 聚焦编辑器
  focus(): void;
  
  // 销毁编辑器
  destroy(): void;
}
```

#### 2.3.3 SourceEditor（源码编辑器）

纯文本 Markdown 编辑器：

```typescript
interface SourceEditor {
  // 初始化
  init(container: HTMLElement): void;
  
  // 设置内容
  setContent(markdown: string): void;
  
  // 获取内容
  getContent(): string;
  
  // 订阅变化
  onchange(callback: (content: string) => void): void;
  
  // 聚焦
  focus(): void;
  
  // 销毁
  destroy(): void;
}
```

#### 2.3.4 Toolbar（工具栏）

```typescript
interface Toolbar {
  // 初始化工具栏
  init(container: HTMLElement, options: ToolbarOptions): void;
  
  // 更新工具栏状态（根据选区格式更新按钮状态）
  updateState(formats: Record<string, any>): void;
  
  // 绑定格式化命令
  onFormat(format: string, callback: (format: string, value?: any) => void): void;
  
  // 启用/禁用工具栏
  setEnabled(enabled: boolean): void;
}
```

#### 2.3.5 Preview（预览面板）

```typescript
interface Preview {
  // 初始化预览面板
  init(container: HTMLElement): void;
  
  // 更新预览内容
  update(html: string): void;
  
  // 设置主题
  setTheme(theme: 'light' | 'dark'): void;
  
  // 销毁
  destroy(): void;
}
```

---

## 三、功能模块详细设计

### 3.1 双模式切换

#### 3.1.1 模式定义

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| Visual（可视化） | WYSIWYG 所见即所得编辑 | 排版、格式化内容 |
| Source（源码） | 原始 Markdown 编辑 | 代码编写、技术文档 |

#### 3.1.2 切换机制

```
用户点击切换按钮
       │
       ▼
┌──────────────────┐
│  保存当前内容到   │
│   MarkdownModel  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│   隐藏当前面板   │     │   显示目标面板   │
│                  │     │                  │
│ Visual → Source │     │ Visual → Source │
│ 获取Markdown内容 │     │ 直接显示.md源码 │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌──────────────────┐
         │  更新工具栏状态   │
         │  和预览面板（如   │
         │  果开启）         │
         └──────────────────┘
```

#### 3.1.3 默认行为

- **启动默认模式**：Visual（可视化）
- **模式记忆**：记住上次使用的模式（可选）

### 3.2 可视化编辑器功能

#### 3.2.1 支持的格式

**文本格式**
| 格式 | 命令 | Markdown 语法 |
|------|------|----------------|
| 粗体 | bold | `**text**` 或 `__text__` |
| 斜体 | italic | `*text*` 或 `_text_` |
| 下划线 | underline | `<u>text</u>` |
| 删除线 | strike | `~~text~~` |
| 行内代码 | code | `` `code` `` |
| 链接 | link | `[text](url)` |

**块级格式**
| 格式 | 命令 | Markdown 语法 |
|------|------|----------------|
| 标题1-6 | h1-h6 | `#` - `######` |
| 段落 | paragraph | 连续文本 |
| 有序列表 | ordered-list | `1. item` |
| 无序列表 | bullet-list | `- item` 或 `* item` |
| 引用块 | blockquote | `> quote` |
| 代码块 | code-block | ```` ``` ```` |
| 水平线 | hr | `---` |

**嵌入内容**
| 类型 | 命令 | Markdown 语法 |
|------|------|----------------|
| 链接 | link | `[text](url)` |
| 图片 | image | `![alt](url)` |

#### 3.2.2 快捷键支持

| 操作 | Windows/Linux | macOS |
|------|---------------|-------|
| 粗体 | Ctrl + B | Cmd + B |
| 斜体 | Ctrl + I | Cmd + I |
| 下划线 | Ctrl + U | Cmd + U |
| 删除线 | Ctrl + Shift + X | Cmd + Shift + X |
| 链接 | Ctrl + K | Cmd + K |
| 代码 | Ctrl + ` | Cmd + ` |
| 撤销 | Ctrl + Z | Cmd + Z |
| 重做 | Ctrl + Shift + Z | Cmd + Shift + Z |
| 保存 | Ctrl + S | Cmd + S |

### 3.3 源码编辑器功能

#### 3.3.1 功能特性

- 语法高亮（可选，使用 Prism.js）
- 行号显示
- 自动缩进
- 括号匹配
- Tab 转换为空格（可配置）

#### 3.3.2 编辑器功能

- 基础编辑：复制、粘贴、剪切、全选
- 查找替换：Ctrl/Cmd + F
- 跳转到行：Ctrl/Cmd + G

### 3.4 工具栏设计

#### 3.4.1 工具栏布局

```
┌────────────────────────────────────────────────────────────────────────┐
│ 文件  编辑  视图  帮助                                                      │
├────────────────────────────────────────────────────────────────────────┤
│ [B] [I] [U] [S] | [H1] [H2] [H3] | [≡] [1.] ["] | [<>] [``] [—] | [🔗] [🖼] │
└────────────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 工具栏分组

| 分组 | 按钮 | 功能 |
|------|------|------|
| 文本格式 | B、I、U、S（删除线） | 基础文本格式化 |
| 标题 | H1、H2、H3 | 标题级别 |
| 列表 | ≡（无序）、1.（有序） | 列表功能 |
| 块级 | 《》（引用）、`` ``` ``（代码）、—（水平线） | 块级元素 |
| 嵌入 | 🔗（链接）、🖼（图片） | 嵌入内容 |

#### 3.4.3 工具栏按钮状态

- **普通状态**：可点击
- **禁用状态**：当前模式下不可用的功能
- **激活状态**：当前选区应用了该格式（如选中粗体文本时，B 按钮高亮）

### 3.5 文件操作

#### 3.5.1 支持的操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 新建 | Ctrl + N | 创建空白文档 |
| 打开 | Ctrl + O | 打开 .md 文件 |
| 保存 | Ctrl + S | 保存到当前文件 |
| 另存为 | Ctrl + Shift + S | 另存为新文件 |
| 导出HTML | Ctrl + E | 导出为 HTML 文件 |

#### 3.5.2 Wails 后端集成

```go
// Go 后端接口设计

// 打开文件对话框
func OpenFileDialog() (string, error)

// 保存文件对话框
func SaveFileDialog(defaultName string) (string, error)

// 读取文件
func ReadFile(path string) (string, error)

// 写入文件
func WriteFile(path string, content string) error
```

### 3.6 预览功能

#### 3.6.1 预览模式

| 模式 | 描述 |
|------|------|
| 关闭 | 不显示预览面板 |
| 分屏垂直 | 左侧编辑器，右侧预览 |
| 分屏水平 | 上方编辑器，下方预览 |

#### 3.6.2 预览同步

- 编辑器滚动时预览同步滚动
- 预览点击跳转到对应源码位置（可选）

### 3.7 主题支持

#### 3.7.1 内置主题

| 主题 | 说明 |
|------|------|
| Light | 亮色主题（默认） |
| Dark | 暗色主题 |

#### 3.7.2 主题切换

- 通过菜单或快捷键切换
- 主题影响：编辑器背景、文字颜色、工具栏、预览面板

---

## 四、项目结构

### 4.1 目录结构

```
openmarkdown/
├── frontend/                     # 前端源码
│   ├── src/
│   │   ├── main.ts              # 入口文件
│   │   ├── app.ts               # 应用主类
│   │   ├── editor/              # 编辑器核心模块
│   │   │   ├── Editor.ts        # 编辑器主类
│   │   │   ├── MarkdownModel.ts # 数据模型
│   │   │   ├── VisualEditor.ts  # 可视化编辑器
│   │   │   ├── SourceEditor.ts  # 源码编辑器
│   │   │   └── commands.ts      # 命令定义
│   │   ├── toolbar/             # 工具栏模块
│   │   │   ├── Toolbar.ts
│   │   │   └── buttons/         # 按钮组件
│   │   ├── preview/             # 预览模块
│   │   │   └── Preview.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── markdown.ts      # Markdown解析
│   │   │   ├── html.ts          # HTML处理
│   │   │   └── event.ts         # 事件工具
│   │   ├── style/               # 样式文件
│   │   │   ├── main.scss        # 主样式
│   │   │   ├── editor.scss      # 编辑器样式
│   │   │   ├── toolbar.scss     # 工具栏样式
│   │   │   ├── preview.scss    # 预览样式
│   │   │   └── themes/         # 主题
│   │   │       ├── light.scss
│   │   │       └── dark.scss
│   │   └── types/               # TypeScript类型
│   │       └── index.d.ts
│   ├── index.html               # HTML模板
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                     # Wails Go后端
│   ├── main.go                  # 入口
│   ├── app.go                   # 应用逻辑
│   └── file.go                  # 文件操作
├── wails.json                    # Wails配置
├── go.mod
├── go.sum
└── README.md
```

### 4.2 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                       main.ts                                │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                      app.ts                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │  Toolbar   │  │   Editor    │  │   Preview    │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │   │
│  │         │                │                │          │   │
│  │         └────────────────┼────────────────┘          │   │
│  │                          ▼                            │   │
│  │               ┌──────────────────┐                   │   │
│  │               │  MarkdownModel   │                   │   │
│  │               │  (数据模型)        │                   │   │
│  │               └────────┬─────────┘                   │   │
│  │                        │                              │   │
│  └────────────────────────┼──────────────────────────────┘   │
│                           │                                   │
│                           ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Wails Backend (Go)                       │   │
│  │    文件操作 | 窗口管理 | 系统菜单 | 原生对话框          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、实施计划

### 5.1 开发阶段

#### 阶段一：项目初始化（第1天）

| 任务 | 说明 |
|------|------|
| 1.1 | 初始化 Wails 项目 |
| 1.2 | 配置 Vite + TypeScript |
| 1.3 | 集成 Bootstrap 5 |
| 1.4 | 搭建项目目录结构 |
| 1.5 | 验证开发环境正常运行 |

#### 阶段二：编辑器核心（第2-3天）

| 任务 | 说明 |
|------|------|
| 2.1 | 实现 MarkdownModel 数据模型 |
| 2.2 | 实现 VisualEditor 可视化编辑器 |
| 2.3 | 实现 SourceEditor 源码编辑器 |
| 2.4 | 实现双模式切换功能 |
| 2.5 | 实现基础事件系统 |

#### 阶段三：工具栏（第4-5天）

| 任务 | 说明 |
|------|------|
| 3.1 | 设计工具栏布局 |
| 3.2 | 实现工具栏按钮组件 |
| 3.3 | 绑定格式化命令 |
| 3.4 | 实现选区格式检测 |
| 3.5 | 实现快捷键支持 |

#### 阶段四：Markdown解析（第6天）

| 任务 | 说明 |
|------|------|
| 4.1 | 集成 marked 解析器 |
| 4.2 | 配置解析选项 |
| 4.3 | 实现 HTML 转换 |
| 4.4 | 处理 Markdown 与 HTML 映射 |

#### 阶段五：文件操作（第7天）

| 任务 | 说明 |
|------|------|
| 5.1 | 实现 Wails Go 后端文件操作 |
| 5.2 | 实现打开文件功能 |
| 5.3 | 实现保存文件功能 |
| 5.4 | 实现新建文件功能 |
| 5.5 | 集成系统菜单 |

#### 阶段六：预览功能（第8天）

| 任务 | 说明 |
|------|------|
| 6.1 | 实现预览面板 |
| 6.2 | 实现分屏布局 |
| 6.3 | 实现实时预览更新 |
| 6.4 | 实现滚动同步（可选） |

#### 阶段七：完善与优化（第9-10天）

| 任务 | 说明 |
|------|------|
| 7.1 | 实现主题切换 |
| 7.2 | 实现撤销/重做 |
| 7.3 | 完善样式细节 |
| 7.4 | 性能优化 |
| 7.5 | Bug 修复 |

### 5.2 里程碑

| 里程碑 | 完成标准 |
|--------|----------|
| M1 | 项目初始化完成，开发环境可运行 |
| M2 | 编辑器核心功能可用，双模式切换正常 |
| M3 | 工具栏功能完整，格式化操作正常 |
| M4 | 文件操作功能完整，可打开保存文件 |
| M5 | 预览功能可用，整体功能可用 |

---

## 六、关键技术细节

### 6.1 contenteditable 使用

可视化编辑器基于 HTML `contenteditable` 属性实现：

```typescript
// 创建可编辑区域
const editor = document.createElement('div');
editor.contentEditable = 'true';
editor.className = 'editor-content';

// 执行格式化命令
document.execCommand(command: string, showUI: boolean, value?: any);

// 获取选区
const selection = window.getSelection();
const range = selection.getRangeAt(0);
```

### 6.2 Markdown 解析

使用 marked 解析 Markdown：

```typescript
import { marked } from 'marked';

// 配置 marked
marked.setOptions({
  gfm: true,        // GitHub 风格 Markdown
  breaks: true,     // 转换换行符
  headerIds: true,  // 标题添加 ID
});

// 解析 Markdown 为 HTML
const html = marked.parse(markdownText);
```

### 6.3 Wails 前后端通信

```typescript
// 前端调用 Go 后端
import { Invoke } from '@wails/runtime';

// 打开文件
const content = await Invoke<string>('ReadFile', filePath);

// 保存文件
await Invoke('WriteFile', filePath, content);
```

---

## 七、后续扩展

### 7.1 Phase 2 功能（可选）

- [ ] 表格支持
- [ ] 任务列表（checklist）
- [ ] 脚注
- [ ] 数学公式（LaTeX）
- [ ] 语法高亮
- [ ] 拖拽图片上传

### 7.2 Phase 3 功能（可选）

- [ ] 插件系统架构
- [ ] 主题市场
- [ ] 云同步
- [ ] 多标签页

---

## 八、参考资源

- [Quill 官方文档](https://quilljs.com/)
- [Parchment（Quill底层库）](https://github.com/quilljs/parchment)
- [marked Markdown 解析器](https://marked.js.org/)
- [Bootstrap 5 文档](https://getbootstrap.com/)
- [Wails 官方文档](https://wails.io/)

---

*文档版本：v1.0*
*创建日期：2026-03-03*
