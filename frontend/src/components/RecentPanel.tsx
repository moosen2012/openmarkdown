import React from 'react';
import '../App.css';

interface RecentPanelProps {
  recentFiles: string[];
  recentFolders: string[];
  onOpenFile: (path: string) => void;
  onOpenRecentFolder: (path: string) => void;
  onClearFiles: () => void;
  onClearFolders: () => void;
  isVisible: boolean;
  centered?: boolean;
  // 新增快捷操作回调
  onNewFile?: () => void;
  onSelectFile?: () => void;
  onOpenFolder?: () => void;
}

const RecentPanel: React.FC<RecentPanelProps> = ({
  recentFiles,
  recentFolders,
  onOpenFile,
  onOpenRecentFolder,
  onClearFiles,
  onClearFolders,
  isVisible,
  centered = false,
  onNewFile,
  onSelectFile,
  onOpenFolder,
}) => {
  if (!isVisible) return null;

  const formatPath = (path: string) => {
    const parts = path.split(/[\\/]/);
    const name = parts.pop() || path;
    const dir = parts.join('/') || '';
    return { name, dir };
  };

  return (
    <div className={`recent-panel ${centered ? 'recent-panel-centered' : ''}`}>
      <div className="recent-panel-header">
        <h3 className="recent-panel-title">
          <i className="bi bi-clock-history me-2"></i>
          最近访问
        </h3>
      </div>

      <div className="recent-panel-content">
        {/* 快捷操作区域 */}
        {centered && (
          <div className="quick-actions">
            <button className="quick-action-btn primary" onClick={onNewFile}>
              <i className="bi bi-file-earmark-plus"></i>
              <span>新建文件</span>
              <kbd>Ctrl+N</kbd>
            </button>
            <button className="quick-action-btn" onClick={onSelectFile}>
              <i className="bi bi-folder-open"></i>
              <span>打开文件</span>
              <kbd>Ctrl+O</kbd>
            </button>
            <button className="quick-action-btn" onClick={onOpenFolder}>
              <i className="bi bi-folder2-open"></i>
              <span>打开文件夹</span>
              <kbd>Ctrl+Shift+O</kbd>
            </button>
          </div>
        )}

        {/* 最近文件 */}
        <div className="recent-section">
          <div className="recent-section-header">
            <h4 className="recent-section-title">
              <i className="bi bi-file-earmark-text me-2"></i>
              最近文件
            </h4>
            {recentFiles.length > 0 && (
              <button
                className="recent-clear-btn"
                onClick={onClearFiles}
                title="清除最近文件记录"
              >
                <i className="bi bi-trash3"></i>
              </button>
            )}
          </div>

          {recentFiles.length === 0 ? (
            <div className="recent-empty">
              <i className="bi bi-inbox fs-4 text-muted"></i>
              <span className="text-muted">暂无最近文件</span>
            </div>
          ) : (
            <ul className="recent-list">
              {recentFiles.map((file, index) => {
                const { name, dir } = formatPath(file);
                return (
                  <li
                    key={`${file}-${index}`}
                    className="recent-item"
                    onClick={() => onOpenFile(file)}
                    title={file}
                  >
                    <div className="recent-item-icon">
                      <i className="bi bi-file-earmark-text"></i>
                    </div>
                    <div className="recent-item-info">
                      <span className="recent-item-name">{name}</span>
                      <span className="recent-item-path">{dir}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 最近文件夹 */}
        <div className="recent-section">
          <div className="recent-section-header">
            <h4 className="recent-section-title">
              <i className="bi bi-folder me-2"></i>
              最近文件夹
            </h4>
            {recentFolders.length > 0 && (
              <button
                className="recent-clear-btn"
                onClick={onClearFolders}
                title="清除最近文件夹记录"
              >
                <i className="bi bi-trash3"></i>
              </button>
            )}
          </div>

          {recentFolders.length === 0 ? (
            <div className="recent-empty">
              <i className="bi bi-inbox fs-4 text-muted"></i>
              <span className="text-muted">暂无最近文件夹</span>
            </div>
          ) : (
            <ul className="recent-list">
              {recentFolders.map((folder, index) => {
                const { name, dir } = formatPath(folder);
                return (
                  <li
                    key={`${folder}-${index}`}
                    className="recent-item"
                    onClick={() => onOpenRecentFolder(folder)}
                    title={folder}
                  >
                    <div className="recent-item-icon folder">
                      <i className="bi bi-folder"></i>
                    </div>
                    <div className="recent-item-info">
                      <span className="recent-item-name">{name}</span>
                      <span className="recent-item-path">{dir}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentPanel;
