/**
 * 段落解析器
 * 解析普通段落文本
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, Paragraph, Text } from '../ast/nodes';

export class ParagraphParser implements BlockParser {
  readonly name = 'paragraph';
  readonly priority = 100; // 低优先级，作为默认解析器

  parse(context: ParseContext): ParseResult<Paragraph> | null {
    const remaining = context.text.slice(context.offset);

    // 收集段落行，直到遇到空行或其他块级元素
    const lines: string[] = [];
    const textLines = remaining.split('\n');

    for (const line of textLines) {
      // 空行结束段落
      if (line.trim() === '') {
        break;
      }

      // 检查是否是其他块级元素的开始
      if (this.isBlockElementStart(line)) {
        break;
      }

      lines.push(line);
    }

    if (lines.length === 0) {
      return null;
    }

    const content = lines.join('\n');
    const consumed = content.length;
    const lineDelta = lines.length - 1;

    const textNode: Text = { type: NodeType.TEXT, value: content };
    const node: Paragraph = {
      type: NodeType.PARAGRAPH,
      children: [textNode],
    };

    return { node, consumed, lineDelta };
  }

  /**
   * 检查是否是其他块级元素的开始
   */
  private isBlockElementStart(line: string): boolean {
    // 标题
    if (/^#{1,6}\s/.test(line)) return true;
    // 代码块
    if (/^```/.test(line)) return true;
    // 列表
    if (/^\s*[-*+]\s/.test(line)) return true;
    if (/^\s*\d+\.\s/.test(line)) return true;
    // 引用块
    if (/^>/.test(line)) return true;
    // 分隔线
    if (/^(\s*)([-*_])(?:\s*\2){2,}\s*$/.test(line)) return true;
    // 表格（简化判断）
    if (/^\|.*\|$/.test(line)) return true;

    return false;
  }
}
