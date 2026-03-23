import React, { useState, useRef, useEffect } from 'react';
import '../App.css';

// 菜单项类型定义
export interface MenuItemType {
  label: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  children?: MenuItemType[];
}

export interface MenuBarProps {
  menus: {
    label: string;
    items: MenuItemType[];
  }[];
}

// 单个菜单项组件
const MenuItem: React.FC<{
  item: MenuItemType;
  onClose: () => void;
  level?: number;
}> = ({ item, onClose, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // 处理点击事件
  const handleClick = () => {
    if (item.disabled) return;
    if (item.children) {
      setIsOpen(!isOpen);
    } else if (item.action) {
      item.action();
      onClose();
    }
  };

  // 处理鼠标进入（用于子菜单）
  const handleMouseEnter = () => {
    if (item.children && level > 0) {
      setIsOpen(true);
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (item.children && level > 0) {
      setIsOpen(false);
    }
  };

  // 渲染分隔线
  if (item.divider) {
    return <div className="menu-divider" />;
  }

  return (
    <div
      ref={itemRef}
      className={`menu-item ${item.disabled ? 'disabled' : ''} ${item.children ? 'has-children' : ''} ${isOpen ? 'open' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="menu-item-content">
        <span className="menu-item-label">{item.label}</span>
        {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
        {item.children && <span className="menu-item-arrow">▶</span>}
      </div>
      
      {/* 子菜单 */}
      {item.children && isOpen && (
        <div className={`submenu submenu-level-${level + 1}`}>
          {item.children.map((child, index) => (
            <MenuItem
              key={`${child.label}-${index}`}
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

// 菜单栏组件
const MenuBar: React.FC<MenuBarProps> = ({ menus }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理菜单点击
  const handleMenuClick = (label: string) => {
    setActiveMenu(activeMenu === label ? null : label);
  };

  // 关闭菜单
  const handleClose = () => {
    setActiveMenu(null);
  };

  return (
    <div className="menu-bar" ref={menuBarRef}>
      {menus.map((menu) => (
        <div
          key={menu.label}
          className={`menu-bar-item ${activeMenu === menu.label ? 'active' : ''}`}
          onClick={() => handleMenuClick(menu.label)}
        >
          <span className="menu-bar-label">{menu.label}</span>
          
          {/* 下拉菜单 */}
          {activeMenu === menu.label && (
            <div className="menu-dropdown">
              {menu.items.map((item, index) => (
                <MenuItem
                  key={`${item.label}-${index}`}
                  item={item}
                  onClose={handleClose}
                  level={0}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
