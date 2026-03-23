import React, { useState, useCallback } from 'react';
import { ListFolderFiles } from '../../wailsjs/go/main/App';
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
const getFileIcon = (fileName: string, isDir: boolean, isExpanded?: boolean) => {
  if (isDir) {
    return isExpanded ? 'bi-folder2-open' : 'bi-folder';
  }
  
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

// 文件项组件
const FileItemComponent: React.FC<{
  file: FileItem;
  currentFile: string;
  searchQuery: string;
  onFileSelect: (filePath: string) => void;
  level: number;
}> = ({ file, currentFile, searchQuery, onFileSelect, level }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (file.isDir) {
      if (!isExpanded && children.length === 0) {
        // 首次展开，加载子文件
        setIsLoading(true);
        try {
          const childFiles = await ListFolderFiles(file.path);
          // 按类型排序：文件夹在前，文件在后
          const sortedChildFiles = childFiles.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
          });
          setChildren(sortedChildFiles);
        } catch (error) {
          console.error('Failed to load folder contents:', error);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(file.path);
    }
  };

  // 处理子文件选择
  const handleChildSelect = useCallback((childPath: string) => {
    onFileSelect(childPath);
  }, [onFileSelect]);

  return (
    <>
      <li
        className={`file-item ${file.path === currentFile ? 'active' : ''} ${file.isDir ? 'folder-item' : ''}`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
        title={file.path}
      >
        {file.isDir && (
          <span className="file-expand-icon">
            {isLoading ? (
              <i className="bi bi-arrow-repeat spin"></i>
            ) : (
              <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'}`}></i>
            )}
          </span>
        )}
        <span className="file-icon">
          <i className={`bi ${getFileIcon(file.name, file.isDir, isExpanded)}`}></i>
        </span>
        <span className="file-name">
          {highlightText(file.name, searchQuery)}
        </span>
      </li>
      
      {/* 子文件列表 */}
      {file.isDir && isExpanded && children.length > 0 && (
        <ul className="file-sublist">
          {children.map((child, index) => (
            <FileItemComponent
              key={`${child.path}-${index}`}
              file={child}
              currentFile={currentFile}
              searchQuery={searchQuery}
              onFileSelect={handleChildSelect}
              level={level + 1}
            />
          ))}
        </ul>
      )}
      
      {/* 空文件夹提示 */}
      {file.isDir && isExpanded && !isLoading && children.length === 0 && (
        <li 
          className="file-item file-item-empty"
          style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
        >
          <span className="text-muted small">(空文件夹)</span>
        </li>
      )}
    </>
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
