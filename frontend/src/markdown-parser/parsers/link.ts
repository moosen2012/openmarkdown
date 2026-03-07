/**
 * 链接解析器
 * 解析 [text](url) 和 [text](url "title") 语法
 */

import { InlineParser, ParseContext, ParseResult } from './base';
import { NodeType, Link, Text } from '../ast/nodes';

export class LinkParser implements InlineParser {
  readonly name = 'link';
  readonly priority = 30;

  parse(context: ParseContext): ParseResult<Link> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配链接 [text](url) 或 [text](url "title")
    const match = remaining.match(/^\[([^\]]+)\]\(([^\s")]+)(?:\s+"([^"]*)")?\)/);
    if (!match) {
      return null;
    }

    const text = match[1];
    const url = match[2];
    const title = match[3];
    const consumed = match[0].length;

    const textNode: Text = { type: NodeType.TEXT, value: text };
    const node: Link = {
      type: NodeType.LINK,
      url,
      title,
      children: [textNode],
    };

    return { node, consumed };
  }
}
