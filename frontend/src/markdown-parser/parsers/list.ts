/**
 * 列表解析器
 * 解析有序列表、无序列表和任务列表
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, List, ListItem, Paragraph, Text } from '../ast/nodes';

export class ListParser implements BlockParser {
  readonly name = 'list';
  readonly priority = 30;

  parse(context: ParseContext): ParseResult<List> | null {
    const remaining = context.text.slice(context.offset);

    // 尝试匹配无序列表
    const unorderedMatch = remaining.match(/^(\s*)[-*+]\s/);
    if (unorderedMatch) {
      return this.parseList(remaining, false);
    }

    // 尝试匹配有序列表
    const orderedMatch = remaining.match(/^(\s*)\d+\.\s/);
    if (orderedMatch) {
      return this.parseList(remaining, true);
    }

    return null;
  }

  private parseList(text: string, ordered: boolean): ParseResult<List> | null {
    const items: ListItem[] = [];
    let consumed = 0;
    let lineDelta = 0;
    let start: number | undefined;

    // 获取列表项的正则表达式
    const itemRegex = ordered
      ? /^(\s*)(\d+)\.\s+(.*)\n?/gm
      : /^(\s*)([-*+])\s+(\[[ x]\])?\s*(.*)\n?/gm;

    let match;
    let baseIndent = -1;

    // 重置正则表达式的 lastIndex
    itemRegex.lastIndex = 0;

    while ((match = itemRegex.exec(text)) !== null) {
      const indent = match[1].length;
      const marker = match[2];

      // 确定基础缩进（第一个列表项的缩进）
      if (baseIndent === -1) {
        baseIndent = indent;
      }

      // 如果缩进小于基础缩进，说明列表结束
      if (indent < baseIndent) {
        break;
      }

      // 对于有序列表，记录起始编号
      if (ordered && items.length === 0) {
        start = parseInt(marker, 10);
      }

      // 提取内容
      let content: string;
      let checked: boolean | undefined;

      if (ordered) {
        content = match[3];
      } else {
        // 检查是否是任务列表
        const checkbox = match[3];
        content = match[4];
        if (checkbox) {
          checked = checkbox.includes('x') || checkbox.includes('X');
        }
      }

      // 收集多行内容（直到下一个列表项或缩进减少）
      const contentLines: string[] = [content];
      let contentPos = itemRegex.lastIndex;

      while (contentPos < text.length) {
        const nextLine = text.slice(contentPos).match(/^(\s*)(.*)\n?/);
        if (!nextLine) break;

        const nextIndent = nextLine[1].length;
        const nextContent = nextLine[2];

        // 检查是否是新的列表项
        const isNewItem = ordered
          ? /^(\s*)\d+\.\s/.test(nextLine[0])
          : /^(\s*)[-*+]\s/.test(nextLine[0]);

        if (isNewItem && nextIndent <= baseIndent) {
          break;
        }

        // 如果是空行，检查后面是否还有内容
        if (!nextContent.trim()) {
          const remainingText = text.slice(contentPos + nextLine[0].length);
          const nextNonEmpty = remainingText.match(/^(\s*)\S/);
          if (nextNonEmpty) {
            const nextNonEmptyIndent = nextNonEmpty[1].length;
            // 检查是否是新的列表项
            const isNewItemAfterBlank = ordered
              ? /^(\s*)\d+\.\s/.test(remainingText)
              : /^(\s*)[-*+]\s/.test(remainingText);

            if (isNewItemAfterBlank && nextNonEmptyIndent <= baseIndent) {
              break;
            }
          }
        }

        // 添加内容行
        if (nextIndent > baseIndent) {
          contentLines.push(nextContent);
        } else if (nextContent.trim()) {
          contentLines.push(nextContent);
        } else {
          contentLines.push('');
        }

        contentPos += nextLine[0].length;
      }

      // 更新已消耗的位置
      consumed = contentPos;
      itemRegex.lastIndex = contentPos;

      // 创建列表项节点
      const itemContent = contentLines.join('\n').trim();
      let children: (Paragraph | Text)[] = [];

      if (itemContent) {
        const textNode: Text = { type: NodeType.TEXT, value: itemContent };
        const paraNode: Paragraph = { type: NodeType.PARAGRAPH, children: [textNode] };
        children = [paraNode];
      }

      const itemNode: ListItem = {
        type: NodeType.LIST_ITEM,
        checked,
        children,
      };

      items.push(itemNode);

      // 计算行数
      const itemText = text.slice(match.index, contentPos);
      lineDelta += (itemText.match(/\n/g) || []).length;
    }

    if (items.length === 0) {
      return null;
    }

    const node: List = {
      type: NodeType.LIST,
      ordered,
      start,
      children: items,
    };

    return { node, consumed, lineDelta };
  }
}
