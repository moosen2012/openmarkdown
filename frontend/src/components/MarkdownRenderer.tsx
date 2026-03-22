/**
 * Markdown 渲染组件
 * 使用 Go 后端的 goldmark 解析器渲染内容
 */

import React, { useEffect, useRef, useState } from 'react';
import { ParseMarkdown } from '../../wailsjs/go/main/App';
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
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // 调用 Go 后端解析 Markdown
  useEffect(() => {
    let cancelled = false;

    const parseContent = async () => {
      if (!content) {
        setHtml('');
        return;
      }

      setLoading(true);
      try {
        const result = await ParseMarkdown(content);
        if (!cancelled) {
          setHtml(result);
        }
      } catch (error) {
        console.error('Failed to parse markdown:', error);
        if (!cancelled) {
          setHtml('<p style="color: red;">解析 Markdown 失败</p>');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    parseContent();

    return () => {
      cancelled = true;
    };
  }, [content]);

  // 代码高亮
  useEffect(() => {
    if (containerRef.current && html) {
      const codeBlocks = containerRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [html]);

  if (loading) {
    return (
      <div className={`markdown-body d-flex justify-content-center align-items-center ${className}`} style={{ minHeight: '200px' }}>
        <div className="text-center text-muted">
          <div className="spinner-border mb-2" role="status" style={{ width: '2rem', height: '2rem' }}>
            <span className="visually-hidden">加载中...</span>
          </div>
          <p className="mb-0">正在解析 Markdown...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;
