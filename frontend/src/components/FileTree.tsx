import React, { useState } from 'react';
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
  folderName?: string;
}

// 获取文件图标
const getFileIcon = (fileName: string, isDir: boolean) => {
  if (isDir) return 'bi-folder';
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'bi-file-earmark-text';
    case 'txt':
      return 'bi-file-earmark-text';
    case 'json':
      return 'bi-file-earmark-code';
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return 'bi-file-earmark-code';
    case 'html':
    case 'htm':
      return 'bi-file-earmark-code';
    case 'css':
    case 'scss':
    case 'less':
      return 'bi-file-earmark-code';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return 'bi-file-earmark-image';
    case 'pdf':
      return 'bi-file-earmark-pdf';
    case 'doc':
    case 'docx':
      return 'bi-file-earmark-word';
    case 'xls':
    case 'xlsx':
      return 'bi-file-earmark-excel';
    case 'zip':
    case 'rar':
    case '7z':
      return 'bi-file-earmark-zip';
    default:
      return 'bi-file-earmark';
  }
};

// 文件项组件
const FileItemComponent: React.FC<{
  file: FileItem;
  currentFile: string;
  searchQuery: string;
  onFileSelect: (filePath: string) => void;
  level: number;
}> = ({ file, currentFile, searchQuery, onFileSelect, level }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (file.isDir) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(file.path);
    }
  };

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
    <li
      className={`file-item ${file.path === currentFile ? 'active' : ''}`}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
      onClick={handleClick}
      title={file.path}
    >
      <span className="file-icon">
        <i className={`bi ${getFileIcon(file.name, file.isDir)}`}></i>
      </span>
      <span className="file-name">
        {highlightText(file.name, searchQuery)}
      </span>
    </li>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ 
  files, 
  currentFile, 
  searchQuery = '', 
  onFileSelect,
  folderName = '目录文件'
}) => {
  if (files.length === 0) {
    return (
      <div className="file-tree-empty">
        <i className="bi bi-inbox fs-3 d-block mb-2 text-muted"></i>
        <p className="text-muted">当前文件夹为空</p>
        <p className="text-muted small">该文件夹中没有文件</p>
      </div>
    );
  }

  // 将文件按类型排序：文件夹在前，文件在后
  const sortedFiles = [...files].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <i className="bi bi-folder2-open"></i> {folderName}
      </div>
      <ul className="file-list">
        {sortedFiles.map((file, index) => (
          <FileItemComponent
            key={`${file.path}-${index}`}
            file={file}
            currentFile={currentFile}
            searchQuery={searchQuery}
            onFileSelect={onFileSelect}
            level={0}
          />
        ))}
      </ul>
    </div>
  );
};

export default FileTree;
