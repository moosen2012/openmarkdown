/**
 * Markdown 解析器主类
 * 协调块级解析器和行内解析器完成完整的 Markdown 解析
 */

import { NodeType, Document, Node, Text, Parent, InlineNode } from './ast/nodes';
import { ParseContext, ParserRegistry, BlockParser, InlineParser } from './parsers/base';
import { createDefaultParserRegistry } from './parsers';
import { createUniqueIdGenerator } from './utils/id-generator';

export interface ParseOptions {
  // 是否生成标题 ID
  generateHeaderIds?: boolean;
}

export class MarkdownParser {
  private registry: ParserRegistry;
  private idGenerator: ReturnType<typeof createUniqueIdGenerator>;

  constructor(registry?: ParserRegistry) {
    this.registry = registry || createDefaultParserRegistry();
    this.idGenerator = createUniqueIdGenerator();
  }

  /**
   * 解析 Markdown 文本为 AST
   */
  parse(text: string, options: ParseOptions = {}): Document {
    // 重置 ID 生成器
    this.idGenerator.reset();

    // 标准化换行符
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const document: Document = {
      type: NodeType.DOCUMENT,
      children: [],
    };

    const context: ParseContext = {
      text: normalizedText,
      offset: 0,
      line: 1,
      column: 1,
    };

    // 解析所有块级元素
    while (context.offset < normalizedText.length) {
      // 跳过空行
      if (this.skipEmptyLines(context)) {
        continue;
      }

      // 尝试用所有块级解析器解析
      const result = this.parseBlock(context);

      if (result) {
        // 处理标题 ID
        if (options.generateHeaderIds !== false && result.type === NodeType.HEADING) {
          const heading = result as any;
          if (!heading.id) {
            const textContent = this.extractTextContent(heading);
            heading.id = this.idGenerator.generate(textContent);
          }
        }

        // 解析行内元素
        this.parseInlines(result);

        document.children.push(result);
      } else {
        // 无法解析，跳过一行
        this.skipLine(context);
      }
    }

    return document;
  }

  /**
   * 解析块级元素
   */
  private parseBlock(context: ParseContext): Node | null {
    const blockParsers = this.registry.getBlockParsers();

    for (const parser of blockParsers) {
      const result = parser.parse(context);
      if (result) {
        context.offset += result.consumed;
        if (result.lineDelta) {
          context.line += result.lineDelta;
        }
        return result.node;
      }
    }

    return null;
  }

  /**
   * 解析行内元素
   */
  private parseInlines(node: Node): void {
    if (!('children' in node)) {
      return;
    }

    const parent = node as Parent;

    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];

      // 递归解析子节点
      this.parseInlines(child);

      // 如果是文本节点，解析行内元素
      if (child.type === NodeType.TEXT) {
        const textNode = child as Text;
        const inlineNodes = this.parseInlineText(textNode.value);

        // 替换文本节点
        if (inlineNodes.length === 1 && inlineNodes[0].type === NodeType.TEXT) {
          // 只有一个文本节点，保持原样
          continue;
        }

        parent.children.splice(i, 1, ...inlineNodes);
        i += inlineNodes.length - 1;
      }
    }
  }

  /**
   * 解析行内文本
   */
  private parseInlineText(text: string): InlineNode[] {
    const nodes: InlineNode[] = [];
    let offset = 0;
    const inlineParsers = this.registry.getInlineParsers();

    while (offset < text.length) {
      let matched = false;

      // 尝试所有行内解析器
      for (const parser of inlineParsers) {
        const context: ParseContext = {
          text,
          offset,
          line: 1,
          column: 1,
        };

        const result = parser.parse(context);
        if (result) {
          // 如果有未匹配的文本，先添加为文本节点
          if (result.node.type !== NodeType.TEXT && offset < context.offset) {
            const textNode: Text = {
              type: NodeType.TEXT,
              value: text.slice(offset, context.offset),
            };
            nodes.push(textNode);
          }

          nodes.push(result.node as InlineNode);
          offset = context.offset + result.consumed;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // 没有匹配到任何行内元素，作为普通文本
        break;
      }
    }

    // 添加剩余的文本
    if (offset < text.length) {
      const textNode: Text = {
        type: NodeType.TEXT,
        value: text.slice(offset),
      };
      nodes.push(textNode);
    }

    // 如果没有匹配到任何行内元素，返回原始文本
    if (nodes.length === 0) {
      const textNode: Text = {
        type: NodeType.TEXT,
        value: text,
      };
      nodes.push(textNode);
    }

    return nodes;
  }

  /**
   * 跳过空行
   */
  private skipEmptyLines(context: ParseContext): boolean {
    const remaining = context.text.slice(context.offset);
    const match = remaining.match(/^(\s*\n)+/);

    if (match) {
      const lines = match[0].split('\n').length - 1;
      context.offset += match[0].length;
      context.line += lines;
      context.column = 1;
      return true;
    }

    return false;
  }

  /**
   * 跳过一行
   */
  private skipLine(context: ParseContext): void {
    const remaining = context.text.slice(context.offset);
    const newlineIndex = remaining.indexOf('\n');

    if (newlineIndex === -1) {
      context.offset = context.text.length;
    } else {
      context.offset += newlineIndex + 1;
      context.line++;
      context.column = 1;
    }
  }

  /**
   * 提取节点的文本内容
   */
  private extractTextContent(node: Node): string {
    if (node.type === NodeType.TEXT) {
      return (node as Text).value;
    }

    if ('children' in node) {
      return (node as Parent).children.map((child) => this.extractTextContent(child)).join('');
    }

    return '';
  }
}
