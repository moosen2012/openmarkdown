/**
 * 解析器基础接口定义
 * 定义所有解析器必须实现的接口
 */

import { Node, Document, MarkdownNode } from '../ast/nodes';

// 解析上下文
export interface ParseContext {
  text: string;
  offset: number;
  line: number;
  column: number;
}

// 解析结果
export interface ParseResult<T extends Node = Node> {
  node: T;
  consumed: number;
  lineDelta?: number;
}

// 基础解析器接口
export interface Parser {
  // 解析器名称
  readonly name: string;
  // 解析器优先级（数字越小优先级越高）
  readonly priority: number;
  // 尝试解析
  parse(context: ParseContext): ParseResult | null;
}

// 块级解析器接口
export interface BlockParser extends Parser {
  // 块级解析器通常处理多行内容
}

// 行内解析器接口
export interface InlineParser extends Parser {
  // 行内解析器处理单行内容
}

// 解析器注册表
export class ParserRegistry {
  private blockParsers: BlockParser[] = [];
  private inlineParsers: InlineParser[] = [];

  // 注册块级解析器
  registerBlock(parser: BlockParser): void {
    this.blockParsers.push(parser);
    this.blockParsers.sort((a, b) => a.priority - b.priority);
  }

  // 注册行内解析器
  registerInline(parser: InlineParser): void {
    this.inlineParsers.push(parser);
    this.inlineParsers.sort((a, b) => a.priority - b.priority);
  }

  // 获取所有块级解析器
  getBlockParsers(): BlockParser[] {
    return [...this.blockParsers];
  }

  // 获取所有行内解析器
  getInlineParsers(): InlineParser[] {
    return [...this.inlineParsers];
  }
}
