import React, { useState, useEffect } from 'react';
import { ListMarkdownFiles, ParseOutline } from '../../wailsjs/go/main/App';
import FileTree from './FileTree';
import OutlineTree from './OutlineTree';
import '../App.css';

interface SidebarProps {
  expanded: boolean;
  currentFilePath: string;
  markdownContent: string;
  onFileSelect: (filePath: string) => void;
}

type TabType = 'outline' | 'files';

const Sidebar: React.FC<SidebarProps> = ({ 
  expanded,
  currentFilePath, 
  markdownContent,
  onFileSelect 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('outline');
  const [files, setFiles] = useState<Array<{ name: string; path: string; isDir: boolean }>>([]);
  const [outline, setOutline] = useState<Array<{ level: number; title: string; id: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载文件列表
  const loadFiles = async () => {
    if (!currentFilePath) return;
    
    setIsLoading(true);
    try {
      const dirPath = currentFilePath.split(/[\\\/]/).slice(0, -1).join('/');
      const fileList = await ListMarkdownFiles(dirPath);
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载大纲
  const loadOutline = async () => {
    if (!markdownContent) {
      setOutline([]);
      return;
    }
    
    try {
      const outlineItems = await ParseOutline(markdownContent);
      setOutline(outlineItems);
    } catch (error) {
      console.error('Failed to parse outline:', error);
    }
  };

  // 切换标签页时加载对应数据
  useEffect(() => {
    if (activeTab === 'files') {
      loadFiles();
    } else if (activeTab === 'outline') {
      loadOutline();
    }
  }, [activeTab, currentFilePath, markdownContent]);

  // 过滤数据
  const filteredOutline = outline.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!expanded) {
    return <div className="sidebar sidebar-collapsed"></div>;
  }

  return (
    <div className="sidebar d-flex flex-column h-100">
      {/* 使用 Bootstrap nav-tabs 样式 */}
      <div className="sidebar-tabs nav nav-tabs">
        <button
          className={`sidebar-tab nav-link flex-fill text-center ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => setActiveTab('outline')}
        >
          <i className="bi bi-list-ul me-1"></i> 大纲
        </button>
        <button
          className={`sidebar-tab nav-link flex-fill text-center ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <i className="bi bi-folder me-1"></i> 文件
        </button>
      </div>

      {/* 搜索框使用 Bootstrap 表单样式 */}
      <div className="sidebar-search p-3 border-bottom">
        <div className="input-group">
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0"
            placeholder={`搜索${activeTab === 'outline' ? '标题' : '文件'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-outline-secondary border-start-0"
              type="button"
              onClick={() => setSearchQuery('')}
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>
      </div>

      {/* 内容区域使用 flex-fill 占据剩余空间 */}
      <div className="sidebar-content flex-fill overflow-auto p-3">
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center py-4 text-muted">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            加载中...
          </div>
        )}

        {activeTab === 'outline' && (
          <OutlineTree
            outline={filteredOutline}
            searchQuery={searchQuery}
            onNavigate={(id) => {
              // 滚动到对应标题
              const element = document.getElementById(id);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          />
        )}

        {activeTab === 'files' && (
          <FileTree
            files={filteredFiles}
            currentFile={currentFilePath}
            onFileSelect={onFileSelect}
          />
        )}

        {!isLoading && searchQuery && filteredOutline.length === 0 && filteredFiles.length === 0 && (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-inbox fs-3 d-block mb-2"></i>
            没有找到匹配的结果
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
