/**
 * 代码块解析器
 * 解析围栏式代码块和缩进式代码块
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, CodeBlock } from '../ast/nodes';

export class CodeBlockParser implements BlockParser {
  readonly name = 'code_block';
  readonly priority = 20;

  parse(context: ParseContext): ParseResult<CodeBlock> | null {
    const remaining = context.text.slice(context.offset);

    // 尝试解析围栏式代码块 ```
    const fencedMatch = remaining.match(/^```(\w*)\n([\s\S]*?)```/);
    if (fencedMatch) {
      const lang = fencedMatch[1] || undefined;
      const value = fencedMatch[2].replace(/\n$/, ''); // 移除末尾换行
      const consumed = fencedMatch[0].length;

      const node: CodeBlock = {
        type: NodeType.CODE_BLOCK,
        lang,
        value,
      };

      const lineDelta = (fencedMatch[0].match(/\n/g) || []).length;
      return { node, consumed, lineDelta };
    }

    // 尝试解析缩进式代码块（4个空格或1个Tab）
    const indentMatch = remaining.match(/^(?:    |\t)(.+\n?)/);
    if (indentMatch) {
      const lines: string[] = [];
      let consumed = 0;
      let lineDelta = 0;

      // 收集所有缩进代码行
      let pos = 0;
      while (true) {
        const lineMatch = remaining.slice(pos).match(/^(?:    |\t)(.*)\n?/);
        if (!lineMatch) break;

        lines.push(lineMatch[1]);
        const lineLength = lineMatch[0].length;
        pos += lineLength;
        consumed += lineLength;
        if (lineMatch[0].endsWith('\n')) {
          lineDelta++;
        }
      }

      if (lines.length > 0) {
        const node: CodeBlock = {
          type: NodeType.CODE_BLOCK,
          value: lines.join('\n').replace(/\n$/, ''),
        };

        return { node, consumed, lineDelta };
      }
    }

    return null;
  }
}
