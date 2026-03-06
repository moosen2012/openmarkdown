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
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'outline' ? 'active' : ''}`}
          onClick={() => setActiveTab('outline')}
        >
          📑 大纲
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📁 文件
        </button>
      </div>
      
      <div className="sidebar-search">
        <input
          type="text"
          className="search-input"
          placeholder={`搜索${activeTab === 'outline' ? '标题' : '文件'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="sidebar-content">
        {isLoading && <div className="loading">加载中...</div>}
        
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
          <div className="no-results">
            没有找到匹配的结果
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
