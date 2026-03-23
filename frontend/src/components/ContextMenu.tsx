import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../App.css';

// 上下文菜单项类型定义
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  action?: () => void;
  children?: ContextMenuItem[];
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
}

// 单个菜单项组件
const ContextMenuItemComponent: React.FC<{
  item: ContextMenuItem;
  onClose: () => void;
  level?: number;
}> = ({ item, onClose, level = 0 }) => {
  const [isHovered, setIsHovered] = useState(false);

  // 处理点击事件
  const handleClick = () => {
    if (item.disabled || item.divider || item.children) return;
    item.action?.();
    onClose();
  };

  // 渲染分隔线
  if (item.divider) {
    return <div className="context-menu-divider" />;
  }

  return (
    <div
      className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.children ? 'has-children' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="context-menu-item-content">
        {item.icon && <i className={`bi bi-${item.icon}`}></i>}
        <span className="context-menu-item-label">{item.label}</span>
        {item.shortcut && <span className="context-menu-item-shortcut">{item.shortcut}</span>}
        {item.children && <span className="context-menu-item-arrow">▶</span>}
      </div>

      {/* 子菜单 */}
      {item.children && isHovered && (
        <div className="context-submenu" style={{ left: '100%', top: 0 }}>
          {item.children.map((child) => (
            <ContextMenuItemComponent
              key={child.id}
              item={child}
              onClose={onClose}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 上下文菜单组件
const ContextMenu: React.FC<ContextMenuProps> = ({ state, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [state.isOpen, onClose]);

  // 调整菜单位置，确保不超出视口
  const getAdjustedPosition = useCallback(() => {
    if (!menuRef.current) return { x: state.x, y: state.y };

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = state.x;
    let y = state.y;

    // 水平方向调整
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10;
    }

    // 垂直方向调整
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10;
    }

    return { x, y };
  }, [state.x, state.y]);

  // 如果没有打开，不渲染
  if (!state.isOpen) return null;

  const position = getAdjustedPosition();

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
    >
      {state.items.map((item) => (
        <ContextMenuItemComponent
          key={item.id}
          item={item}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

// 自定义 Hook 用于管理上下文菜单
export const useContextMenu = () => {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
  });

  const openContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      items,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { state, openContextMenu, closeContextMenu };
};

export default ContextMenu;
