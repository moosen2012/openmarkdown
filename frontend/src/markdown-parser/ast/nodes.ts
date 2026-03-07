/**
 * AST 节点类型定义
 * 定义 Markdown 解析后的抽象语法树节点结构
 */

// 源码位置信息
export interface Position {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

// 节点类型枚举
export enum NodeType {
  // 块级元素
  DOCUMENT = 'document',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  CODE_BLOCK = 'code_block',
  BLOCKQUOTE = 'blockquote',
  LIST = 'list',
  LIST_ITEM = 'list_item',
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  HR = 'hr',

  // 行内元素
  TEXT = 'text',
  EMPHASIS = 'emphasis',
  STRONG = 'strong',
  DELETE = 'delete',
  CODE = 'code',
  LINK = 'link',
  IMAGE = 'image',
  FOOTNOTE_REF = 'footnote_ref',
  FOOTNOTE_DEF = 'footnote_def',
}

// 基础节点接口
export interface Node {
  type: NodeType;
  position?: Position;
}

// 父节点接口（包含子节点）
export interface Parent extends Node {
  children: Node[];
}

// 文档根节点
export interface Document extends Parent {
  type: NodeType.DOCUMENT;
}

// 标题节点
export interface Heading extends Parent {
  type: NodeType.HEADING;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
}

// 段落节点
export interface Paragraph extends Parent {
  type: NodeType.PARAGRAPH;
}

// 代码块节点
export interface CodeBlock extends Node {
  type: NodeType.CODE_BLOCK;
  lang?: string;
  value: string;
}

// 引用块节点
export interface Blockquote extends Parent {
  type: NodeType.BLOCKQUOTE;
}

// 列表节点
export interface List extends Parent {
  type: NodeType.LIST;
  ordered: boolean;
  start?: number;
}

// 列表项节点
export interface ListItem extends Parent {
  type: NodeType.LIST_ITEM;
  checked?: boolean;
}

// 表格节点
export interface Table extends Parent {
  type: NodeType.TABLE;
  align: ('left' | 'center' | 'right' | null)[];
}

// 表格行节点
export interface TableRow extends Parent {
  type: NodeType.TABLE_ROW;
}

// 表格单元格节点
export interface TableCell extends Parent {
  type: NodeType.TABLE_CELL;
}

// 分隔线节点
export interface HR extends Node {
  type: NodeType.HR;
}

// 文本节点
export interface Text extends Node {
  type: NodeType.TEXT;
  value: string;
}

// 强调节点（斜体）
export interface Emphasis extends Parent {
  type: NodeType.EMPHASIS;
}

// 强调节点（粗体）
export interface Strong extends Parent {
  type: NodeType.STRONG;
}

// 删除线节点
export interface Delete extends Parent {
  type: NodeType.DELETE;
}

// 行内代码节点
export interface Code extends Node {
  type: NodeType.CODE;
  value: string;
}

// 链接节点
export interface Link extends Parent {
  type: NodeType.LINK;
  url: string;
  title?: string;
}

// 图片节点
export interface Image extends Node {
  type: NodeType.IMAGE;
  url: string;
  alt: string;
  title?: string;
}

// 脚注引用节点
export interface FootnoteRef extends Node {
  type: NodeType.FOOTNOTE_REF;
  identifier: string;
  label?: string;
}

// 脚注定义节点
export interface FootnoteDef extends Parent {
  type: NodeType.FOOTNOTE_DEF;
  identifier: string;
  label?: string;
}

// 所有节点类型的联合类型
export type MarkdownNode =
  | Document
  | Heading
  | Paragraph
  | CodeBlock
  | Blockquote
  | List
  | ListItem
  | Table
  | TableRow
  | TableCell
  | HR
  | Text
  | Emphasis
  | Strong
  | Delete
  | Code
  | Link
  | Image
  | FootnoteRef
  | FootnoteDef;

// 块级节点类型
export type BlockNode =
  | Heading
  | Paragraph
  | CodeBlock
  | Blockquote
  | List
  | Table
  | HR;

// 行内节点类型
export type InlineNode =
  | Text
  | Emphasis
  | Strong
  | Delete
  | Code
  | Link
  | Image
  | FootnoteRef;
