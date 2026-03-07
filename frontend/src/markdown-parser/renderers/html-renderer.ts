/**
 * HTML 渲染器
 * 将 AST 渲染为 HTML 字符串
 */

import { NodeType, Document, Node, Parent, Heading, CodeBlock, List, ListItem, Table, TableRow, TableCell, Blockquote, Link, Image, Strong, Emphasis, Delete, Code, Text, HR } from '../ast/nodes';
import { escapeHtml, escapeAttribute } from '../utils/escape';

// highlight.js 类型
interface HighlightJS {
  highlight: (code: string, options: { language: string }) => { value: string };
}

export interface RenderOptions {
  // 是否启用代码高亮
  highlight?: boolean;
  // 代码高亮函数
  highlightFn?: (code: string, lang?: string) => string;
  // 是否添加标题 ID
  headerIds?: boolean;
}

export class HTMLRenderer {
  private options: RenderOptions;
  private hljs?: HighlightJS;

  constructor(options: RenderOptions = {}) {
    this.options = {
      highlight: true,
      headerIds: true,
      ...options,
    };
  }

  /**
   * 设置 highlight.js 实例
   */
  setHighlightJS(hljs: HighlightJS): void {
    this.hljs = hljs;
  }

  /**
   * 渲染 AST 为 HTML
   */
  render(document: Document): string {
    return this.renderNodes(document.children);
  }

  /**
   * 渲染多个节点
   */
  private renderNodes(nodes: Node[]): string {
    return nodes.map((node) => this.renderNode(node)).join('');
  }

  /**
   * 渲染单个节点
   */
  private renderNode(node: Node): string {
    switch (node.type) {
      case NodeType.HEADING:
        return this.renderHeading(node as Heading);
      case NodeType.PARAGRAPH:
        return this.renderParagraph(node as Parent);
      case NodeType.CODE_BLOCK:
        return this.renderCodeBlock(node as CodeBlock);
      case NodeType.BLOCKQUOTE:
        return this.renderBlockquote(node as Blockquote);
      case NodeType.LIST:
        return this.renderList(node as List);
      case NodeType.LIST_ITEM:
        return this.renderListItem(node as ListItem);
      case NodeType.TABLE:
        return this.renderTable(node as Table);
      case NodeType.TABLE_ROW:
        return this.renderTableRow(node as TableRow);
      case NodeType.TABLE_CELL:
        return this.renderTableCell(node as TableCell);
      case NodeType.HR:
        return this.renderHR();
      case NodeType.TEXT:
        return this.renderText(node as Text);
      case NodeType.STRONG:
        return this.renderStrong(node as Strong);
      case NodeType.EMPHASIS:
        return this.renderEmphasis(node as Emphasis);
      case NodeType.DELETE:
        return this.renderDelete(node as Delete);
      case NodeType.CODE:
        return this.renderCode(node as Code);
      case NodeType.LINK:
        return this.renderLink(node as Link);
      case NodeType.IMAGE:
        return this.renderImage(node as Image);
      default:
        return '';
    }
  }

  /**
   * 渲染标题
   */
  private renderHeading(heading: Heading): string {
    const tag = `h${heading.depth}`;
    const content = this.renderNodes(heading.children);
    const idAttr = heading.id ? ` id="${escapeAttribute(heading.id)}"` : '';
    return `<${tag}${idAttr}>${content}</${tag}>`;
  }

  /**
   * 渲染段落
   */
  private renderParagraph(paragraph: Parent): string {
    const content = this.renderNodes(paragraph.children);
    return `<p>${content}</p>`;
  }

  /**
   * 渲染代码块
   */
  private renderCodeBlock(codeBlock: CodeBlock): string {
    const lang = codeBlock.lang || 'plaintext';
    let code = escapeHtml(codeBlock.value);

    // 代码高亮
    if (this.options.highlight && this.hljs && codeBlock.lang) {
      try {
        code = this.hljs.highlight(codeBlock.value, { language: lang }).value;
      } catch {
        // 高亮失败，使用原始转义代码
      }
    }

    return `<pre><code class="hljs language-${lang}">${code}</code></pre>`;
  }

  /**
   * 渲染引用块
   */
  private renderBlockquote(blockquote: Blockquote): string {
    const content = this.renderNodes(blockquote.children);
    return `<blockquote>${content}</blockquote>`;
  }

  /**
   * 渲染列表
   */
  private renderList(list: List): string {
    const content = this.renderNodes(list.children);
    const tag = list.ordered ? 'ol' : 'ul';
    const startAttr = list.ordered && list.start && list.start !== 1 ? ` start="${list.start}"` : '';
    return `<${tag}${startAttr}>${content}</${tag}>`;
  }

  /**
   * 渲染列表项
   */
  private renderListItem(item: ListItem): string {
    const content = this.renderNodes(item.children);

    // 任务列表
    if (item.checked !== undefined) {
      const checkbox = item.checked ? '<input type="checkbox" checked disabled> ' : '<input type="checkbox" disabled> ';
      return `<li>${checkbox}${content}</li>`;
    }

    return `<li>${content}</li>`;
  }

  /**
   * 渲染表格
   */
  private renderTable(table: Table): string {
    const rows = table.children;
    if (rows.length === 0) {
      return '';
    }

    // 表头
    const headerRow = rows[0] as TableRow;
    const headerCells = headerRow.children.map((cell: Node, index: number) => {
      const align = table.align[index];
      const style = align ? ` style="text-align: ${align}"` : '';
      const content = this.renderNodes((cell as TableCell).children);
      return `<th${style}>${content}</th>`;
    }).join('');

    const header = `<thead><tr>${headerCells}</tr></thead>`;

    // 表体
    const bodyRows = rows.slice(1).map((row: Node) => {
      const tableRow = row as TableRow;
      const cells = tableRow.children.map((cell: Node, index: number) => {
        const align = table.align[index];
        const style = align ? ` style="text-align: ${align}"` : '';
        const content = this.renderNodes((cell as TableCell).children);
        return `<td${style}>${content}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const body = bodyRows ? `<tbody>${bodyRows}</tbody>` : '';

    return `<table>${header}${body}</table>`;
  }

  /**
   * 渲染表格行
   */
  private renderTableRow(row: TableRow): string {
    const content = this.renderNodes(row.children);
    return `<tr>${content}</tr>`;
  }

  /**
   * 渲染表格单元格
   */
  private renderTableCell(cell: TableCell): string {
    const content = this.renderNodes(cell.children);
    return `<td>${content}</td>`;
  }

  /**
   * 渲染分隔线
   */
  private renderHR(): string {
    return '<hr>';
  }

  /**
   * 渲染文本
   */
  private renderText(text: Text): string {
    return escapeHtml(text.value);
  }

  /**
   * 渲染粗体
   */
  private renderStrong(strong: Strong): string {
    const content = this.renderNodes(strong.children);
    return `<strong>${content}</strong>`;
  }

  /**
   * 渲染斜体
   */
  private renderEmphasis(em: Emphasis): string {
    const content = this.renderNodes(em.children);
    return `<em>${content}</em>`;
  }

  /**
   * 渲染删除线
   */
  private renderDelete(del: Delete): string {
    const content = this.renderNodes(del.children);
    return `<del>${content}</del>`;
  }

  /**
   * 渲染行内代码
   */
  private renderCode(code: Code): string {
    return `<code>${escapeHtml(code.value)}</code>`;
  }

  /**
   * 渲染链接
   */
  private renderLink(link: Link): string {
    const content = this.renderNodes(link.children);
    const url = escapeAttribute(link.url);
    const titleAttr = link.title ? ` title="${escapeAttribute(link.title)}"` : '';
    return `<a href="${url}"${titleAttr} target="_blank">${content}</a>`;
  }

  /**
   * 渲染图片
   */
  private renderImage(image: Image): string {
    const url = escapeAttribute(image.url);
    const alt = escapeAttribute(image.alt);
    const titleAttr = image.title ? ` title="${escapeAttribute(image.title)}"` : '';
    return `<img src="${url}" alt="${alt}"${titleAttr}>`;
  }
}
