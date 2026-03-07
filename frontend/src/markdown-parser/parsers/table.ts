/**
 * 表格解析器
 * 解析 Markdown 表格语法
 */

import { BlockParser, ParseContext, ParseResult } from './base';
import { NodeType, Table, TableRow, TableCell, Text } from '../ast/nodes';

export class TableParser implements BlockParser {
  readonly name = 'table';
  readonly priority = 35;

  parse(context: ParseContext): ParseResult<Table> | null {
    const remaining = context.text.slice(context.offset);

    // 解析表格：需要表头行、分隔行和数据行
    const lines = remaining.split('\n');

    // 表头行（必须存在）
    const headerLine = lines[0];
    if (!headerLine || !headerLine.includes('|')) {
      return null;
    }

    // 分隔行（必须存在，用于确定对齐方式）
    const separatorLine = lines[1];
    if (!separatorLine || !separatorLine.includes('|')) {
      return null;
    }

    // 验证分隔行格式（包含至少三个 - 和可选的 : 对齐标记）
    if (!/^\s*\|?(?::?-+:?(?:\s*\|:?-+:?)*)\|?\s*$/.test(separatorLine)) {
      return null;
    }

    // 解析对齐方式
    const align = this.parseAlignment(separatorLine);

    // 解析表头
    const headerCells = this.parseRow(headerLine);
    if (headerCells.length === 0) {
      return null;
    }

    // 构建表头行
    const headerRow: TableRow = {
      type: NodeType.TABLE_ROW,
      children: headerCells.map((cell) => ({
        type: NodeType.TABLE_CELL,
        children: [{ type: NodeType.TEXT, value: cell.trim() }],
      })),
    };

    // 解析数据行
    const rows: TableRow[] = [headerRow];
    let consumed = headerLine.length + 1 + separatorLine.length + 1; // +2 for newlines
    let lineDelta = 1;

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];

      // 空行结束表格
      if (!line || line.trim() === '') {
        break;
      }

      // 必须是表格行（包含 |）
      if (!line.includes('|')) {
        break;
      }

      const cells = this.parseRow(line);
      if (cells.length > 0) {
        const row: TableRow = {
          type: NodeType.TABLE_ROW,
          children: cells.map((cell) => ({
            type: NodeType.TABLE_CELL,
            children: [{ type: NodeType.TEXT, value: cell.trim() }],
          })),
        };
        rows.push(row);
        consumed += line.length + 1;
        lineDelta++;
      }
    }

    if (rows.length < 1) {
      return null;
    }

    const node: Table = {
      type: NodeType.TABLE,
      align,
      children: rows,
    };

    return { node, consumed, lineDelta };
  }

  /**
   * 解析分隔行的对齐方式
   */
  private parseAlignment(separatorLine: string): ('left' | 'center' | 'right' | null)[] {
    const align: ('left' | 'center' | 'right' | null)[] = [];

    // 提取单元格分隔符
    const cells = separatorLine
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const cell of cells) {
      const leftColon = cell.startsWith(':');
      const rightColon = cell.endsWith(':');

      if (leftColon && rightColon) {
        align.push('center');
      } else if (leftColon) {
        align.push('left');
      } else if (rightColon) {
        align.push('right');
      } else {
        align.push(null);
      }
    }

    return align;
  }

  /**
   * 解析表格行
   */
  private parseRow(line: string): string[] {
    // 处理行首和行尾的 |
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      trimmed = trimmed.slice(1);
    }
    if (trimmed.endsWith('|')) {
      trimmed = trimmed.slice(0, -1);
    }

    // 分割单元格
    return trimmed.split('|').map((cell) => cell.trim());
  }
}
