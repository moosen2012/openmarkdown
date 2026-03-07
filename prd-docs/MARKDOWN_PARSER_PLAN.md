# Markdown 解析器重构计划

## 一、项目现状分析

### 1.1 当前实现问题

当前 `App.tsx` 中的 `renderMarkdown` 函数使用简单的正则表达式替换来解析 Markdown：

```typescript
// 当前实现方式（存在问题）
const renderMarkdown = (text: string) => {
    // 1. 代码块保护机制复杂
    // 2. 所有解析规则硬编码在一起
    // 3. 正则表达式难以维护和扩展
    // 4. 不支持嵌套结构（如列表中的代码块）
    // 5. 缺少表格、脚注、任务列表等扩展语法
}
```

### 1.2 需要支持的语法（基于 markdown.com.cn 规范）

#### 基本语法（必须支持）
| 元素 | 语法 | 优先级 |
|------|------|--------|
| 标题 H1-H6 | `#` - `######` | 高 |
| 粗体 | `**text**` | 高 |
| 斜体 | `*text*` | 高 |
| 引用块 | `> quote` | 高 |
| 有序列表 | `1. item` | 高 |
| 无序列表 | `- item` / `* item` | 高 |
| 行内代码 | `` `code` `` | 高 |
| 代码块 | ` ```code``` ` | 高 |
| 分隔线 | `---` | 中 |
| 链接 | `[title](url)` | 高 |
| 图片 | `![alt](url)` | 高 |

#### 扩展语法（逐步支持）
| 元素 | 语法 | 优先级 |
|------|------|--------|
| 表格 | `\| col \| col \|` | 高 |
| 任务列表 | `- [x] task` | 中 |
| 删除线 | `~~text~~` | 中 |
| 脚注 | `[^1]` / `[^1]: note` | 低 |
| 标题 ID | `### Title {#id}` | 低 |
| 定义列表 | `term: definition` | 低 |

---

## 二、新架构设计

### 2.1 核心设计原则

1. **插件化架构** - 每种语法规则都是一个独立的 Parser
2. **责任链模式** - 解析器按优先级链式处理
3. **AST 中间表示** - Markdown → AST → HTML，便于扩展和转换
4. **类型安全** - 完整的 TypeScript 类型定义

### 2.2 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Markdown Parser Architecture                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Input     │───▶│   Tokenizer     │───▶│  AST Builder    │ │
│  │  (Markdown) │    │  (词法分析)      │    │  (语法分析)      │ │
│  └─────────────┘    └─────────────────┘    └────────┬────────┘ │
│                                                      │          │
│                         ┌────────────────────────────┘          │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AST (抽象语法树)                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Heading │  │  List   │  │  Code   │  │  Table  │ ...│   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Parser Chain (解析器链)                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │Heading  │─▶│  List   │─▶│  Code   │─▶│  Table  │─▶ ...│   │
│  │  │ Parser  │  │ Parser  │  │ Parser  │  │ Parser  │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  HTML Renderer (渲染器)                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │ Heading │  │  List   │  │  Code   │  │  Table  │ ...│   │
│  │  │Renderer │  │Renderer │  │Renderer │  │Renderer │    │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   Output    │◀───│  Sanitizer      │◀───│  Post Processor │ │
│  │    (HTML)   │    │  (XSS防护)       │    │  (后处理)        │ │
│  └─────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 目录结构设计

```
frontend/src/
├── markdown-parser/              # Markdown 解析器核心模块
│   ├── index.ts                  # 入口文件，导出主解析器
│   ├── parser.ts                 # 主解析器类
│   ├── tokenizer.ts              # 词法分析器
│   ├── ast/                      # AST 相关
│   │   ├── index.ts              # AST 类型导出
│   │   ├── nodes.ts              # AST 节点类型定义
│   │   └── builder.ts            # AST 构建器
│   ├── parsers/                  # 各类语法解析器
│   │   ├── base.ts               # 基础解析器接口
│   │   ├── heading.ts            # 标题解析器
│   │   ├── list.ts               # 列表解析器（有序/无序/任务）
│   │   ├── code.ts               # 代码解析器（行内/块级）
│   │   ├── emphasis.ts           # 强调解析器（粗体/斜体/删除线）
│   │   ├── link.ts               # 链接解析器
│   │   ├── image.ts              # 图片解析器
│   │   ├── blockquote.ts         # 引用块解析器
│   │   ├── table.ts              # 表格解析器
│   │   ├── footnote.ts           # 脚注解析器
│   │   ├── hr.ts                 # 分隔线解析器
│   │   └── index.ts              # 解析器注册中心
│   ├── renderers/                # HTML 渲染器
│   │   ├── base.ts               # 基础渲染器接口
│   │   ├── html-renderer.ts      # HTML 渲染器实现
│   │   └── index.ts              # 渲染器导出
│   ├── plugins/                  # 插件系统
│   │   ├── index.ts              # 插件接口定义
│   │   └── highlight.ts          # 代码高亮插件
│   └── utils/                    # 工具函数
│       ├── escape.ts             # HTML 转义
│       ├── id-generator.ts       # ID 生成器
│       └── regex.ts              # 正则表达式工具
├── components/
│   └── MarkdownRenderer.tsx      # React 渲染组件
└── App.tsx                       # 应用入口（使用新解析器）
```

---

## 三、核心接口设计

### 3.1 AST 节点类型

```typescript
// AST 节点类型定义

// 节点类型枚举
enum NodeType {
  // 块级元素
  DOCUMENT = 'document',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  CODE_BLOCK = 'code_block',
  BLOCKQUOTE = 'blockquote',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  HR = 'hr',
  
  // 行内元素
  TEXT = 'text',
  EMPHASIS = 'emphasis',      // 斜体
  STRONG = 'strong',          // 粗体
  DELETE = 'delete',          // 删除线
  CODE = 'code',              // 行内代码
  LINK = 'link',
  IMAGE = 'image',
  FOOTNOTE_REF = 'footnote_ref',
  FOOTNOTE_DEF = 'footnote_def',
}

// 基础节点接口
interface Node {
  type: NodeType;
  position?: Position;        // 源码位置信息
}

// 父节点接口
interface Parent extends Node {
  children: Node[];
}

// 文档根节点
interface Document extends Parent {
  type: NodeType.DOCUMENT;
}

// 标题节点
interface Heading extends Parent {
  type: NodeType.HEADING;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;                // 用于锚点跳转
}

// 段落节点
interface Paragraph extends Parent {
  type: NodeType.PARAGRAPH;
}

// 代码块节点
interface CodeBlock extends Node {
  type: NodeType.CODE_BLOCK;
  lang?: string;              // 语言标识
  value: string;              // 代码内容
}

// 引用块节点
interface Blockquote extends Parent {
  type: NodeType.BLOCKQUOTE;
}

// 列表节点
interface List extends Parent {
  type: NodeType.LIST;
  ordered: boolean;           // 是否有序
  start?: number;             // 有序列表起始编号
}

// 列表项节点
interface ListItem extends Parent {
  type: NodeType.LIST_ITEM;
  checked?: boolean;          // 任务列表复选框状态
}

// 表格节点
interface Table extends Parent {
  type: NodeType.TABLE;
  align: ('left' | 'center' | 'right' | null)[];
}

// 表格行节点
interface TableRow extends Parent {
  type: NodeType.TABLE_ROW;
}

// 表格单元格节点
interface TableCell extends Parent {
  type: NodeType.TABLE_CELL;
}

// 分隔线节点
interface HR extends Node {
  type: NodeType.HR;
}

// 文本节点
interface Text extends Node {
  type: NodeType.TEXT;
  value: string;
}

// 强调节点（斜体）
interface Emphasis extends Parent {
  type: NodeType.EMPHASIS;
}

// 强调节点（粗体）
interface Strong extends Parent {
  type: NodeType.STRONG;
}

// 删除线节点
interface Delete extends Parent {
  type: NodeType.DELETE;
}

// 行内代码节点
interface Code extends Node {
  type: NodeType.CODE;
  value: string;
}

// 链接节点
interface Link extends Parent {
  type: NodeType.LINK;
  url: string;
  title?: string;
}

// 图片节点
interface Image extends Node {
  type: NodeType.IMAGE;
  url: string;
  alt: string;
  title?: string;
}

// 脚注引用节点
interface FootnoteRef extends Node {
  type: NodeType.FOOTNOTE_REF;
  identifier: string;
  label?: string;
}

// 脚注定义节点
interface FootnoteDef extends Parent {
  type: NodeType.FOOTNOTE_DEF;
  identifier: string;
  label?: string;
}
```

### 3.2 解析器接口

```typescript
// 解析器接口定义

// 解析上下文
interface ParseContext {
  text: string;               // 当前解析的文本
  offset: number;             // 当前解析位置
  document: Document;         // AST 文档根节点
  footnotes: Map<string, FootnoteDef>; // 脚注定义集合
}

// 解析结果
interface ParseResult<T extends Node = Node> {
  node: T;
  consumed: number;           // 消耗的字符数
}

// 基础解析器接口
interface Parser {
  // 解析器名称
  readonly name: string;
  
  // 解析器优先级（数字越小优先级越高）
  readonly priority: number;
  
  // 尝试解析
  parse(context: ParseContext): ParseResult | null;
}

// 块级解析器接口
interface BlockParser extends Parser {
  // 块级解析器通常处理多行内容
}

// 行内解析器接口
interface InlineParser extends Parser {
  // 行内解析器处理单行内容
}
```

### 3.3 渲染器接口

```typescript
// 渲染器接口定义

// 渲染上下文
interface RenderContext {
  // 当前渲染的文档
  document: Document;
  // 渲染选项
  options: RenderOptions;
}

// 渲染选项
interface RenderOptions {
  // 是否启用代码高亮
  highlight?: boolean;
  // 代码高亮函数
  highlightFn?: (code: string, lang?: string) => string;
  // 是否添加标题 ID
  headerIds?: boolean;
  // ID 生成函数
  idGenerator?: (text: string) => string;
  // 是否启用 XHTML 输出
  xhtml?: boolean;
  // 自定义渲染器
  renderers?: Partial<Record<NodeType, NodeRenderer>>;
}

// 节点渲染器接口
interface NodeRenderer<T extends Node = Node> {
  render(node: T, context: RenderContext): string;
}

// HTML 渲染器
interface HTMLRenderer {
  render(document: Document, options?: RenderOptions): string;
  registerRenderer<T extends Node>(type: NodeType, renderer: NodeRenderer<T>): void;
}
```

---

## 四、解析器实现计划

### 4.1 第一阶段：基础架构（优先级：高）

#### 4.1.1 任务列表

| 序号 | 任务 | 说明 | 预估工时 |
|------|------|------|----------|
| 1.1 | 创建目录结构 | 按设计创建所有目录和空文件 | 0.5h |
| 1.2 | 实现 AST 类型定义 | 创建 nodes.ts 和 index.ts | 1h |
| 1.3 | 实现 Tokenizer | 将 Markdown 文本分解为 Token | 2h |
| 1.4 | 实现 AST Builder | 将 Token 构建为 AST | 2h |
| 1.5 | 实现基础 Parser 接口 | 创建 base.ts 定义接口 | 0.5h |
| 1.6 | 实现主 Parser 类 | 整合所有组件的主类 | 2h |

#### 4.1.2 关键代码示例

```typescript
// tokenizer.ts - 词法分析器
export class Tokenizer {
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const token = this.parseLine(line, i);
      tokens.push(token);
    }
    
    return tokens;
  }
  
  private parseLine(line: string, lineNumber: number): Token {
    // 识别不同类型的行
    if (this.isHeading(line)) {
      return { type: 'heading', content: line, line: lineNumber };
    }
    if (this.isCodeBlockStart(line)) {
      return { type: 'code_block_start', content: line, line: lineNumber };
    }
    // ... 其他类型
    return { type: 'text', content: line, line: lineNumber };
  }
}
```

### 4.2 第二阶段：块级解析器（优先级：高）

#### 4.2.1 任务列表

| 序号 | 任务 | 说明 | 依赖 | 预估工时 |
|------|------|------|------|----------|
| 2.1 | 实现 HeadingParser | 解析 H1-H6 标题 | 1.1-1.6 | 1h |
| 2.2 | 实现 ParagraphParser | 解析段落 | 1.1-1.6 | 1h |
| 2.3 | 实现 CodeBlockParser | 解析代码块 | 1.1-1.6 | 1.5h |
| 2.4 | 实现 ListParser | 解析有序/无序列表 | 1.1-1.6 | 2h |
| 2.5 | 实现 BlockquoteParser | 解析引用块 | 1.1-1.6 | 1h |
| 2.6 | 实现 HRParser | 解析分隔线 | 1.1-1.6 | 0.5h |
| 2.7 | 实现 TableParser | 解析表格 | 1.1-1.6 | 2h |

#### 4.2.2 关键代码示例

```typescript
// parsers/heading.ts - 标题解析器
export class HeadingParser implements BlockParser {
  readonly name = 'heading';
  readonly priority = 10;  // 高优先级
  
  parse(context: ParseContext): ParseResult<Heading> | null {
    const match = context.text.slice(context.offset).match(/^(#{1,6})\s+(.+)$/m);
    if (!match) return null;
    
    const depth = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    const content = match[2].trim();
    
    // 解析行内内容
    const children = this.parseInline(content);
    
    const node: Heading = {
      type: NodeType.HEADING,
      depth,
      children,
      id: this.generateId(content),  // 生成锚点 ID
    };
    
    return {
      node,
      consumed: match[0].length,
    };
  }
  
  private parseInline(text: string): Node[] {
    // 调用行内解析器
    return inlineParser.parse(text);
  }
  
  private generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]/g, '');
  }
}
```

### 4.3 第三阶段：行内解析器（优先级：高）

#### 4.3.1 任务列表

| 序号 | 任务 | 说明 | 依赖 | 预估工时 |
|------|------|------|------|----------|
| 3.1 | 实现 TextParser | 解析纯文本 | 1.1-1.6 | 0.5h |
| 3.2 | 实现 CodeParser | 解析行内代码 | 1.1-1.6 | 0.5h |
| 3.3 | 实现 EmphasisParser | 解析粗体/斜体 | 1.1-1.6 | 1h |
| 3.4 | 实现 DeleteParser | 解析删除线 | 1.1-1.6 | 0.5h |
| 3.5 | 实现 LinkParser | 解析链接 | 1.1-1.6 | 1h |
| 3.6 | 实现 ImageParser | 解析图片 | 1.1-1.6 | 0.5h |
| 3.7 | 实现 FootnoteParser | 解析脚注 | 1.1-1.6 | 1.5h |

### 4.4 第四阶段：HTML 渲染器（优先级：高）

#### 4.4.1 任务列表

| 序号 | 任务 | 说明 | 依赖 | 预估工时 |
|------|------|------|------|----------|
| 4.1 | 实现 HTMLRenderer | 主渲染器类 | 2.1-3.7 | 2h |
| 4.2 | 实现各节点渲染器 | 为每种节点类型创建渲染器 | 2.1-3.7 | 2h |
| 4.3 | 集成 highlight.js | 代码高亮支持 | 4.1-4.2 | 1h |
| 4.4 | 实现 XSS 防护 | HTML 转义和过滤 | 4.1-4.2 | 1h |

### 4.5 第五阶段：扩展功能（优先级：中）

#### 4.5.1 任务列表

| 序号 | 任务 | 说明 | 依赖 | 预估工时 |
|------|------|------|------|----------|
| 5.1 | 实现任务列表 | `- [x] task` 语法 | 2.4 | 1h |
| 5.2 | 实现嵌套列表 | 列表中的列表 | 2.4 | 1.5h |
| 5.3 | 实现列表中的代码块 | 复杂嵌套结构 | 2.3, 2.4 | 2h |
| 5.4 | 优化性能 | 大文档处理优化 | 全部 | 2h |

### 4.6 第六阶段：集成与测试（优先级：高）

#### 4.6.1 任务列表

| 序号 | 任务 | 说明 | 依赖 | 预估工时 |
|------|------|------|------|----------|
| 6.1 | 创建 MarkdownRenderer 组件 | React 组件封装 | 4.1-4.4 | 1h |
| 6.2 | 替换 App.tsx 中的解析器 | 迁移现有代码 | 6.1 | 1h |
| 6.3 | 编写单元测试 | 各解析器测试 | 全部 | 3h |
| 6.4 | 编写集成测试 | 端到端测试 | 6.3 | 2h |
| 6.5 | 性能测试 | 大文件解析测试 | 6.3 | 1h |

---

## 五、插件系统设计

### 5.1 插件接口

```typescript
// plugins/index.ts

// 插件接口
export interface MarkdownPlugin {
  // 插件名称
  readonly name: string;
  
  // 插件初始化
  init?(parser: MarkdownParser): void;
  
  // 注册自定义解析器
  registerParsers?(): Parser[];
  
  // 注册自定义渲染器
  registerRenderers?(): Record<NodeType, NodeRenderer>;
  
  // 转换 AST
  transformAST?(ast: Document): Document;
  
  // 后处理 HTML
  postProcessHTML?(html: string): string;
}

// 插件管理器
export class PluginManager {
  private plugins: MarkdownPlugin[] = [];
  
  use(plugin: MarkdownPlugin): void {
    this.plugins.push(plugin);
  }
  
  applyToParser(parser: MarkdownParser): void {
    for (const plugin of this.plugins) {
      plugin.init?.(parser);
      
      const parsers = plugin.registerParsers?.();
      if (parsers) {
        for (const p of parsers) {
          parser.registerParser(p);
        }
      }
    }
  }
}
```

### 5.2 内置插件

```typescript
// plugins/highlight.ts - 代码高亮插件
export class HighlightPlugin implements MarkdownPlugin {
  readonly name = 'highlight';
  
  constructor(private hljs: typeof import('highlight.js')) {}
  
  registerRenderers() {
    return {
      [NodeType.CODE_BLOCK]: {
        render(node: CodeBlock): string {
          const lang = node.lang || 'plaintext';
          const highlighted = this.hljs.highlight(node.value, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        },
      },
    };
  }
}

// plugins/footnote.ts - 脚注插件
export class FootnotePlugin implements MarkdownPlugin {
  readonly name = 'footnote';
  
  registerParsers() {
    return [
      new FootnoteRefParser(),
      new FootnoteDefParser(),
    ];
  }
  
  postProcessHTML(html: string): string {
    // 在文档末尾添加脚注列表
    // ...
    return html;
  }
}
```

---

## 六、使用示例

### 6.1 基础使用

```typescript
// 使用新的 Markdown 解析器
import { MarkdownParser } from './markdown-parser';
import { HTMLRenderer } from './markdown-parser/renderers';
import { HighlightPlugin } from './markdown-parser/plugins';

// 创建解析器实例
const parser = new MarkdownParser();

// 可选：添加插件
parser.use(new HighlightPlugin(hljs));

// 解析 Markdown
const markdown = `# Hello World

This is a **bold** text.
`;

const ast = parser.parse(markdown);

// 渲染为 HTML
const renderer = new HTMLRenderer();
const html = renderer.render(ast);
```

### 6.2 React 组件中使用

```typescript
// components/MarkdownRenderer.tsx
import React from 'react';
import { useMarkdownParser } from '../hooks/useMarkdownParser';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const { html } = useMarkdownParser(content);
  
  return (
    <div 
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// hooks/useMarkdownParser.ts
import { useMemo } from 'react';
import { MarkdownParser } from '../markdown-parser';
import { HTMLRenderer } from '../markdown-parser/renderers';

const parser = new MarkdownParser();
const renderer = new HTMLRenderer();

export function useMarkdownParser(content: string) {
  return useMemo(() => {
    const ast = parser.parse(content);
    const html = renderer.render(ast);
    return { ast, html };
  }, [content]);
}
```

### 6.3 自定义扩展

```typescript
// 添加自定义语法解析器
class CustomParser implements InlineParser {
  readonly name = 'custom';
  readonly priority = 100;
  
  parse(context: ParseContext): ParseResult | null {
    // 自定义解析逻辑
    const match = context.text.slice(context.offset).match(/^\$\$(.+?)\$\$/);
    if (!match) return null;
    
    return {
      node: {
        type: NodeType.CUSTOM,
        value: match[1],
      },
      consumed: match[0].length,
    };
  }
}

// 注册自定义解析器
parser.registerParser(new CustomParser());
```

---

## 七、迁移计划

### 7.1 渐进式迁移策略

```
阶段一：并行运行（1-2天）
├── 保留现有 renderMarkdown 函数
├── 新增 MarkdownParser 模块
├── 通过 feature flag 切换
└── 对比测试确保输出一致

阶段二：完全替换（1天）
├── 移除旧 renderMarkdown 函数
├── 更新所有调用点
├── 清理相关代码
└── 验证功能完整

阶段三：优化增强（2-3天）
├── 添加缺失的语法支持
├── 性能优化
├── 完善测试覆盖
└── 文档更新
```

### 7.2 兼容性保证

1. **输出兼容性** - 新解析器输出的 HTML 与旧实现保持一致
2. **API 兼容性** - 提供适配层，保持现有接口不变
3. **行为兼容性** - 确保边界情况处理一致

---

## 八、风险评估

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 解析器性能问题 | 中 | 高 | 提前进行性能测试，必要时优化算法 |
| 边界情况处理不一致 | 高 | 中 | 编写全面的测试用例 |
| 开发时间超预期 | 中 | 中 | 采用迭代开发，优先核心功能 |
| 与现有代码冲突 | 低 | 高 | 保持接口兼容，渐进式迁移 |

---

## 九、总结

本计划设计了一个可扩展、类型安全的 Markdown 解析器架构，主要特点：

1. **插件化设计** - 每种语法独立实现，易于添加新语法
2. **AST 中间层** - 便于转换和扩展，支持多格式输出
3. **类型安全** - 完整的 TypeScript 类型定义
4. **渐进式迁移** - 不影响现有功能的情况下逐步替换

预计总工时：**约 35-40 小时**，分 6 个阶段完成。
