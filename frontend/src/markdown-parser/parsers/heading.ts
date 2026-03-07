/**
 * 标题解析器
 * 解析 H1-H6 标题
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, Heading, Text } from '../ast/nodes';
import { generateId } from '../utils/id-generator';

export class HeadingParser implements BlockParser {
  readonly name = 'heading';
  readonly priority = 10;

  parse(context: ParseContext): ParseResult<Heading> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配 Setext 风格标题 (=== 或 ---)
    const setextMatch = remaining.match(/^(.*)\n([=-])\2\2+\n?/);
    if (setextMatch) {
      const content = setextMatch[1].trim();
      const depth = setextMatch[2] === '=' ? 1 : 2;
      const consumed = setextMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Heading = {
        type: NodeType.HEADING,
        depth,
        children: [textNode],
        id: generateId(content),
      };

      return { node, consumed, lineDelta: (setextMatch[0].match(/\n/g) || []).length };
    }

    // 匹配 ATX 风格标题 (# ## ###)
    const atxMatch = remaining.match(/^(#{1,6})\s+(.+?)(?:\s+#*)?(?=\n|$)/);
    if (atxMatch) {
      const depth = atxMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const content = atxMatch[2].trim();
      const consumed = atxMatch[0].length;

      const textNode: Text = { type: NodeType.TEXT, value: content };
      const node: Heading = {
        type: NodeType.HEADING,
        depth,
        children: [textNode],
        id: generateId(content),
      };

      return { node, consumed, lineDelta: 0 };
    }

    return null;
  }
}
