import React from 'react';
import '../App.css';

interface OutlineItem {
  level: number;
  title: string;
  id: string;
}

interface OutlineTreeProps {
  outline: OutlineItem[];
  searchQuery?: string;
  onNavigate: (id: string) => void;
}

const OutlineTree: React.FC<OutlineTreeProps> = ({ outline, searchQuery = '', onNavigate }) => {
  if (outline.length === 0) {
    return (
      <div className="outline-tree-empty">
        <p>暂无大纲</p>
      </div>
    );
  }

  // 高亮搜索关键词
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="outline-tree">
      <div className="outline-tree-header">
        <i className="bi bi-list-ul"></i> 文章大纲
      </div>
      <ul className="outline-list">
        {outline.map((item, index) => (
          <li
            key={`${item.id}-${index}`}
            className={`outline-item level-${item.level}`}
            style={{ paddingLeft: `${(item.level - 1) * 16 + 8}px` }}
            onClick={() => onNavigate(item.id)}
            title={item.title}
          >
            <span className="outline-marker">
              <i className={item.level === 1 ? "bi bi-book" : item.level === 2 ? "bi bi-journal-text" : "bi bi-file-text"}></i>
            </span>
            <span className="outline-title">
              {highlightText(item.title, searchQuery)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OutlineTree;
