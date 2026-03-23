import React, { useState, useEffect, ReactNode } from 'react';
import { ListMarkdownFiles, ParseOutline } from '../../wailsjs/go/main/App';
import FileTree from './FileTree';
import OutlineTree from './OutlineTree';
import '../App.css';

// 侧边栏标签页类型定义
export interface SidebarTab {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
  onActivate?: () => void;
}

interface SidebarProps {
  expanded: boolean;
  currentFilePath: string;
  markdownContent: string;
  onFileSelect: (filePath: string) => void;
  // 可选的额外标签页
  extraTabs?: SidebarTab[];
}

type DefaultTabType = 'outline' | 'files';

const Sidebar: React.FC<SidebarProps> = ({
  expanded,
  currentFilePath,
  markdownContent,
  onFileSelect,
  extraTabs = [],
}) => {
  // 默认标签页
  const [activeDefaultTab, setActiveDefaultTab] = useState<DefaultTabType>('outline');
  // 当前激活的额外标签页
  const [activeExtraTab, setActiveExtraTab] = useState<string | null>(null);
  
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

  // 切换默认标签页时加载对应数据
  useEffect(() => {
    if (activeDefaultTab === 'files') {
      loadFiles();
    } else if (activeDefaultTab === 'outline') {
      loadOutline();
    }
  }, [activeDefaultTab, currentFilePath, markdownContent]);

  // 当激活额外标签页时，触发其 onActivate 回调
  useEffect(() => {
    if (activeExtraTab) {
      const tab = extraTabs.find((t) => t.id === activeExtraTab);
      tab?.onActivate?.();
    }
  }, [activeExtraTab, extraTabs]);

  // 过滤数据
  const filteredOutline = outline.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 处理默认标签页点击
  const handleDefaultTabClick = (tab: DefaultTabType) => {
    setActiveDefaultTab(tab);
    setActiveExtraTab(null);
  };

  // 处理额外标签页点击
  const handleExtraTabClick = (tabId: string) => {
    setActiveExtraTab(tabId);
  };

  // 判断当前是否在显示默认标签页内容
  const isShowingDefaultTab = activeExtraTab === null;

  if (!expanded) {
    return <div className="sidebar sidebar-collapsed"></div>;
  }

  return (
    <div className="sidebar d-flex flex-column h-100">
      {/* 主标签页区域 - 大纲和文件 */}
      <div className="sidebar-tabs nav nav-tabs">
        <button
          className={`sidebar-tab nav-link flex-fill text-center ${
            isShowingDefaultTab && activeDefaultTab === 'outline' ? 'active' : ''
          }`}
          onClick={() => handleDefaultTabClick('outline')}
        >
          <i className="bi bi-list-ul me-1"></i> 大纲
        </button>
        <button
          className={`sidebar-tab nav-link flex-fill text-center ${
            isShowingDefaultTab && activeDefaultTab === 'files' ? 'active' : ''
          }`}
          onClick={() => handleDefaultTabClick('files')}
        >
          <i className="bi bi-folder me-1"></i> 文件
        </button>
      </div>

      {/* 额外标签页区域 - 可扩展的标签 */}
      {extraTabs.length > 0 && (
        <div className="sidebar-extra-tabs">
          {extraTabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-extra-tab ${activeExtraTab === tab.id ? 'active' : ''}`}
              onClick={() => handleExtraTabClick(tab.id)}
              title={tab.label}
            >
              <i className={`bi bi-${tab.icon}`}></i>
            </button>
          ))}
        </div>
      )}

      {/* 搜索框 - 仅在显示默认标签页时显示 */}
      {isShowingDefaultTab && (
        <div className="sidebar-search p-3 border-bottom">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder={`搜索${activeDefaultTab === 'outline' ? '标题' : '文件'}...`}
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
      )}

      {/* 内容区域 */}
      <div className="sidebar-content flex-fill overflow-auto p-3">
        {isShowingDefaultTab ? (
          // 默认标签页内容
          <>
            {isLoading && (
              <div className="d-flex justify-content-center align-items-center py-4 text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">加载中...</span>
                </div>
                加载中...
              </div>
            )}

            {activeDefaultTab === 'outline' && (
              <OutlineTree
                outline={filteredOutline}
                searchQuery={searchQuery}
                onNavigate={(id) => {
                  const element = document.getElementById(id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              />
            )}

            {activeDefaultTab === 'files' && (
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
          </>
        ) : (
          // 额外标签页内容
          <>
            {extraTabs.map((tab) => (
              <div
                key={tab.id}
                className={`sidebar-extra-content ${activeExtraTab === tab.id ? 'active' : ''}`}
              >
                {tab.content}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
