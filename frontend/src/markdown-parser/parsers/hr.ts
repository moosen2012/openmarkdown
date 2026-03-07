/**
 * 分隔线解析器
 * 解析 ---、***、___ 等分隔线
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, HR } from '../ast/nodes';

export class HRParser implements BlockParser {
  readonly name = 'hr';
  readonly priority = 50;

  parse(context: ParseContext): ParseResult<HR> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配分隔线：三个或更多连续的 -、* 或 _，前后可以有空格
    const match = remaining.match(/^(\s*)([-*_])(?:\s*\2){2,}\s*(?:\n|$)/);
    if (!match) {
      return null;
    }

    // 确保不是标题（Setext 风格）
    // Setext 标题只有 = 或 -，且上一行有内容
    if (match[2] === '-') {
      // 检查是否是 Setext H2
      // 这里简化处理，假设前面已经尝试过 HeadingParser
    }

    const node: HR = {
      type: NodeType.HR,
    };

    const consumed = match[0].length;
    const lineDelta = match[0].includes('\n') ? 1 : 0;

    return { node, consumed, lineDelta };
  }
}
