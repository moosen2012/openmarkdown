/**
 * 删除线解析器
 * 解析 ~~text~~ 语法
 */

import { InlineParser, ParseContext, ParseResult } from './base';
import { NodeType, Delete, Text } from '../ast/nodes';

export class DeleteParser implements InlineParser {
  readonly name = 'delete';
  readonly priority = 25;

  parse(context: ParseContext): ParseResult<Delete> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配删除线 ~~text~~
    const match = remaining.match(/^~~(.+?)~~/);
    if (!match) {
      return null;
    }

    const content = match[1];
    const consumed = match[0].length;

    const textNode: Text = { type: NodeType.TEXT, value: content };
    const node: Delete = {
      type: NodeType.DELETE,
      children: [textNode],
    };

    return { node, consumed };
  }
}
