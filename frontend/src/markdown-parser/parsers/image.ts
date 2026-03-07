/**
 * 图片解析器
 * 解析 ![alt](url) 语法
 */

import { InlineParser, ParseContext, ParseResult } from './base';
import { NodeType, Image } from '../ast/nodes';

export class ImageParser implements InlineParser {
  readonly name = 'image';
  readonly priority = 30;

  parse(context: ParseContext): ParseResult<Image> | null {
    const remaining = context.text.slice(context.offset);

    // 匹配图片 ![alt](url) 或 ![alt](url "title")
    const match = remaining.match(/^!\[([^\]]*)\]\(([^\s")]+)(?:\s+"([^"]*)")?\)/);
    if (!match) {
      return null;
    }

    const alt = match[1];
    const url = match[2];
    const title = match[3];
    const consumed = match[0].length;

    const node: Image = {
      type: NodeType.IMAGE,
      alt,
      url,
      title,
    };

    return { node, consumed };
  }
}
