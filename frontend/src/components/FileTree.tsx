import React from 'react';
import '../App.css';

interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
}

interface FileTreeProps {
  files: FileItem[];
  currentFile: string;
  searchQuery?: string;
  onFileSelect: (filePath: string) => void;
}

const FileTree: React.FC<FileTreeProps> = ({ files, currentFile, searchQuery = '', onFileSelect }) => {
  if (files.length === 0) {
    return (
      <div className="file-tree-empty">
        <p>当前目录下没有 Markdown 文件</p>
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
    <div className="file-tree">
      <div className="file-tree-header">
        <i className="bi bi-folder2-open"></i> 目录文件
      </div>
      <ul className="file-list">
        {files.map((file, index) => (
          <li
            key={`${file.path}-${index}`}
            className={`file-item ${file.path === currentFile ? 'active' : ''}`}
            onClick={() => onFileSelect(file.path)}
            title={file.path}
          >
            <span className="file-icon">
              <i className={file.isDir ? "bi bi-folder" : "bi bi-file-earmark-text"}></i>
            </span>
            <span className="file-name">
              {highlightText(file.name, searchQuery)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileTree;
