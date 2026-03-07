/**
 * 引用块解析器
 * 解析 > 开头的引用块
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, Blockquote, Paragraph, Text } from '../ast/nodes';

export class BlockquoteParser implements BlockParser {
  readonly name = 'blockquote';
  readonly priority = 40;

  parse(context: ParseContext): ParseResult<Blockquote> | null {
    const remaining = context.text.slice(context.offset);

    // 检查是否以 > 开头
    if (!remaining.startsWith('>')) {
      return null;
    }

    const lines: string[] = [];
    let consumed = 0;
    let lineDelta = 0;

    // 收集所有引用行
    const textLines = remaining.split('\n');

    for (const line of textLines) {
      // 检查是否是引用行
      if (line.startsWith('>')) {
        // 提取内容（移除 > 和可能的空格）
        const content = line.slice(1).replace(/^\s/, '');
        lines.push(content);
        consumed += line.length + 1; // +1 for newline
        lineDelta++;
      } else if (line.trim() === '' && lines.length > 0) {
        // 空行，检查下一行是否还是引用
        const nextNonEmptyIndex = textLines.findIndex((l, i) =>
          i > textLines.indexOf(line) && l.trim() !== ''
        );

        if (nextNonEmptyIndex !== -1 && textLines[nextNonEmptyIndex].startsWith('>')) {
          // 空行后还有引用，保留空行
          lines.push('');
          consumed += line.length + 1;
          lineDelta++;
        } else {
          // 引用块结束
          break;
        }
      } else {
        // 非引用行，结束
        break;
      }
    }

    if (lines.length === 0) {
      return null;
    }

    // 构建引用块内容
    const content = lines.join('\n').trim();

    let children: (Paragraph | Text)[] = [];
    if (content) {
      const textNode: Text = { type: NodeType.TEXT, value: content };
      const paraNode: Paragraph = { type: NodeType.PARAGRAPH, children: [textNode] };
      children = [paraNode];
    }

    const node: Blockquote = {
      type: NodeType.BLOCKQUOTE,
      children,
    };

    return { node, consumed: consumed > 0 ? consumed - 1 : 0, lineDelta: Math.max(0, lineDelta - 1) };
  }
}
