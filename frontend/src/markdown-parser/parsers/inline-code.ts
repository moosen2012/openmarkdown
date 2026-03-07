/**
 * 行内代码解析器
 * 解析 `code` 语法
 */

import { InlineParser, ParseContext, ParseResult } from './base';
import { NodeType, Code } from '../ast/nodes';

export class InlineCodeParser implements InlineParser {
  readonly name = 'inline_code';
  readonly priority = 10; // 高优先级，优先于其他行内元素

  parse(context: ParseContext): ParseResult<Code> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配行内代码：一个或多个反引号
    const match = remaining.match(/^(`+)([^`]+?)\1/);
    if (!match) {
      return null;
    }

    const value = match[2];
    const consumed = match[0].length;

    const node: Code = {
      type: NodeType.CODE,
      value,
    };

    return { node, consumed };
  }
}
