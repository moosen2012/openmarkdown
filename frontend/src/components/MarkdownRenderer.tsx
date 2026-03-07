/**
 * Markdown 渲染组件
 * 使用新的 Markdown 解析器渲染内容
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { renderMarkdownToHTML } from '../markdown-parser';
import hljs from 'highlight.js';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 useMemo 缓存渲染结果
  const html = useMemo(() => {
    return renderMarkdownToHTML(content);
  }, [content]);

  // 代码高亮
  useEffect(() => {
    if (containerRef.current) {
      const codeBlocks = containerRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;
