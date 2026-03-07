/**
 * Markdown 解析器模块入口
 * 提供简洁的 API 用于解析 Markdown
 */

import { MarkdownParser, ParseOptions } from './parser';
import { HTMLRenderer } from './renderers';
import type { Document } from './ast/nodes';

// 默认解析器实例（单例）
let defaultParser: MarkdownParser | null = null;
let defaultRenderer: HTMLRenderer | null = null;

/**
 * 获取默认解析器实例
 */
function getDefaultParser(): MarkdownParser {
  if (!defaultParser) {
    defaultParser = new MarkdownParser();
  }
  return defaultParser;
}

/**
 * 获取默认渲染器实例
 */
function getDefaultRenderer(): HTMLRenderer {
  if (!defaultRenderer) {
    defaultRenderer = new HTMLRenderer();
  }
  return defaultRenderer;
}

/**
 * 解析 Markdown 为 AST
 * @param markdown Markdown 文本
 * @param options 解析选项
 * @returns AST 文档
 */
export function parseMarkdown(markdown: string, options?: ParseOptions): Document {
  return getDefaultParser().parse(markdown, options);
}

/**
 * 渲染 Markdown 为 HTML
 * @param markdown Markdown 文本
 * @returns HTML 字符串
 */
export function renderMarkdownToHTML(markdown: string): string {
  const ast = getDefaultParser().parse(markdown);
  return getDefaultRenderer().render(ast);
}

/**
 * 渲染 AST 为 HTML
 * @param ast AST 文档
 * @returns HTML 字符串
 */
export function renderASTToHTML(ast: Document): string {
  return getDefaultRenderer().render(ast);
}

// 导出所有类型和类
export * from './ast/nodes';
export * from './parsers';
export * from './renderers';
export * from './parser';
export * from './utils';

// 默认导出
export default {
  parse: parseMarkdown,
  render: renderMarkdownToHTML,
  renderAST: renderASTToHTML,
};
