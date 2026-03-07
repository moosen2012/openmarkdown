/**
 * 强调解析器
 * 解析粗体 **text** 和斜体 *text*
 */

import { InlineParser, ParseContext, ParseResult } from './base';
import { NodeType, Strong, Emphasis, Text } from '../ast/nodes';

export class EmphasisParser implements InlineParser {
  readonly name = 'emphasis';
  readonly priority = 20;

  parse(context: ParseContext): ParseResult<Strong | Emphasis> | null {
    const remaining = context.text.slice(context.offset);

    // 优先匹配粗体 **text**
    const strongMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (strongMatch) {
      const content = strongMatch[1];
      const consumed = strongMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Strong = {
        type: NodeType.STRONG,
        children: [textNode],
      };

      return { node, consumed };
    }

    // 匹配粗体 __text__
    const strongUnderlineMatch = remaining.match(/^__(.+?)__/);
    if (strongUnderlineMatch) {
      const content = strongUnderlineMatch[1];
      const consumed = strongUnderlineMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Strong = {
        type: NodeType.STRONG,
        children: [textNode],
      };

      return { node, consumed };
    }

    // 匹配斜体 *text*（确保不是 **）
    const emMatch = remaining.match(/^\*((?!\*).+?)\*/);
    if (emMatch) {
      const content = emMatch[1];
      const consumed = emMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Emphasis = {
        type: NodeType.EMPHASIS,
        children: [textNode],
      };

      return { node, consumed };
    }

    // 匹配斜体 _text_（确保不是 __）
    const emUnderlineMatch = remaining.match(/^__((?!_).+?)_/);
    if (emUnderlineMatch) {
      const content = emUnderlineMatch[1];
      const consumed = emUnderlineMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Emphasis = {
        type: NodeType.EMPHASIS,
        children: [textNode],
      };

      return { node, consumed };
    }

    return null;
  }
}
