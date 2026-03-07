/**
 * 解析器模块导出和注册
 */

export * from './base';
export * from './heading';
export * from './code-block';
export * from './list';
export * from './blockquote';
export * from './table';
export * from './hr';
export * from './paragraph';
export * from './inline-code';
export * from './emphasis';
export * from './delete';
export * from './link';
export * from './image';

import { ParserRegistry } from './base';
import { HeadingParser } from './heading';
import { CodeBlockParser } from './code-block';
import { ListParser } from './list';
import { BlockquoteParser } from './blockquote';
import { TableParser } from './table';
import { HRParser } from './hr';
import { ParagraphParser } from './paragraph';
import { InlineCodeParser } from './inline-code';
import { EmphasisParser } from './emphasis';
import { DeleteParser } from './delete';
import { LinkParser } from './link';
import { ImageParser } from './image';

/**
 * 创建默认的解析器注册表
 * 注册所有内置解析器
 */
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();

  // 注册块级解析器（按优先级排序）
  registry.registerBlock(new HeadingParser());
  registry.registerBlock(new CodeBlockParser());
  registry.registerBlock(new TableParser());
  registry.registerBlock(new ListParser());
  registry.registerBlock(new BlockquoteParser());
  registry.registerBlock(new HRParser());
  registry.registerBlock(new ParagraphParser());

  // 注册行内解析器（按优先级排序）
  registry.registerInline(new InlineCodeParser());
  registry.registerInline(new ImageParser());
  registry.registerInline(new LinkParser());
  registry.registerInline(new DeleteParser());
  registry.registerInline(new EmphasisParser());

  return registry;
}
