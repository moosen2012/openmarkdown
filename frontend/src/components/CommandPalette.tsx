import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../App.css';

// 命令项类型定义
export interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  category?: string;
  icon?: string;
  action: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 过滤命令
  const filteredCommands = commands.filter((command) => {
    const query = searchQuery.toLowerCase();
    return (
      command.label.toLowerCase().includes(query) ||
      command.category?.toLowerCase().includes(query) ||
      command.shortcut?.toLowerCase().includes(query)
    );
  });

  // 按类别分组
  const groupedCommands = filteredCommands.reduce((acc, command) => {
    const category = command.category || '其他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // 重置选中索引当搜索结果变化时
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex, onClose]
  );

  // 监听键盘事件
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 执行命令
  const executeCommand = (command: CommandItem) => {
    command.action();
    onClose();
  };

  // 如果没有打开，不渲染
  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        {/* 搜索框 */}
        <div className="command-palette-header">
          <i className="bi bi-search"></i>
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="输入命令..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="command-palette-shortcut">ESC 关闭</span>
        </div>

        {/* 命令列表 */}
        <div ref={listRef} className="command-palette-list">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              <i className="bi bi-inbox"></i>
              <span>没有找到匹配的命令</span>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="command-category">
                <div className="command-category-header">{category}</div>
                {items.map((command) => {
                  const index = currentIndex++;
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={command.id}
                      className={`command-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => executeCommand(command)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="command-item-left">
                        {command.icon && (
                          <i className={`bi bi-${command.icon}`}></i>
                        )}
                        <span className="command-item-label">
                          {command.label}
                        </span>
                      </div>
                      {command.shortcut && (
                        <span className="command-item-shortcut">
                          {command.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="command-palette-footer">
          <div className="command-palette-hint">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> 导航
            </span>
            <span>
              <kbd>↵</kbd> 执行
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
