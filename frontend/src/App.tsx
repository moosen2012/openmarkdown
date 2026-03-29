import { useState, useEffect, useRef, useCallback } from 'react';
import { SelectFile, ReadFile, SaveFile, SaveFileDialog, SelectFolder, ListFolderFiles, GetInitialFilePath } from '../wailsjs/go/main/App';
import { EditHistoryManager } from './hooks/useEditHistory';
import './App.css';
import 'highlight.js/styles/github.css';
import Sidebar from './components/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';
import MenuBar from './components/MenuBar';
import CommandPalette from './components/CommandPalette';
import ContextMenu, { useContextMenu, ContextMenuItem } from './components/ContextMenu';
import RecentPanel from './components/RecentPanel';
import type { MenuItemType } from './components/MenuBar';
import type { CommandItem } from './components/CommandPalette';

// Wails 运行时函数
const WindowMinimise = () => {
    const win = window as any;
    if (win.runtime && win.runtime.WindowMinimise) {
        win.runtime.WindowMinimise();
    }
};

const WindowToggleMaximise = () => {
    const win = window as any;
    if (win.runtime && win.runtime.WindowToggleMaximise) {
        win.runtime.WindowToggleMaximise();
    }
};

const WindowIsMaximised = async (): Promise<boolean> => {
    const win = window as any;
    if (win.runtime && win.runtime.WindowIsMaximised) {
        return await win.runtime.WindowIsMaximised();
    }
    return false;
};

const WindowClose = () => {
    const win = window as any;
    if (win.runtime && win.runtime.Quit) {
        win.runtime.Quit();
    }
};

// 通知类型
interface Notification {
    message: string;
    type: 'success' | 'error' | 'info';
    id: number;
}

function App() {
    const [markdown, setMarkdown] = useState<string>('# Welcome to Markdown Reader\n\n点击上方按钮选择 .md 文件开始阅读。');
    const [fileName, setFileName] = useState<string>('');
    const [currentFilePath, setCurrentFilePath] = useState<string>('');
    const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
    const [sourceCodeMode, setSourceCodeMode] = useState<boolean>(false);
    const [wordCount, setWordCount] = useState<number>(0);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [canUndo, setCanUndo] = useState<boolean>(false);
    const [canRedo, setCanRedo] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
    const [recentFiles, setRecentFiles] = useState<string[]>([]);
    const [recentFolders, setRecentFolders] = useState<string[]>([]);
    const [isMaximised, setIsMaximised] = useState<boolean>(false);
    const [openedFolderPath, setOpenedFolderPath] = useState<string>('');
    const [folderFiles, setFolderFiles] = useState<Array<{ name: string; path: string; isDir: boolean }>>([]);
    // 标记是否有新建的文件（用于区分欢迎页面和新建文件状态）
    const [hasNewFile, setHasNewFile] = useState<boolean>(false);

    // 获取当前布局模式
    const getLayoutMode = () => {
        if (!currentFilePath && !openedFolderPath && !hasNewFile) return 'mode-welcome';
        if (currentFilePath || hasNewFile) return 'mode-file';
        return 'mode-folder';
    };

    // 从 localStorage 加载最近文件和文件夹
    useEffect(() => {
        const savedRecentFiles = localStorage.getItem('recentFiles');
        const savedRecentFolders = localStorage.getItem('recentFolders');
        if (savedRecentFiles) {
            try {
                const parsed = JSON.parse(savedRecentFiles);
                if (Array.isArray(parsed)) {
                    setRecentFiles(parsed.slice(0, 8));
                }
            } catch (e) {
                console.error('解析最近文件失败:', e);
            }
        }
        if (savedRecentFolders) {
            try {
                const parsed = JSON.parse(savedRecentFolders);
                if (Array.isArray(parsed)) {
                    setRecentFolders(parsed.slice(0, 8));
                }
            } catch (e) {
                console.error('解析最近文件夹失败:', e);
            }
        }
    }, []);

    // 保存最近文件到 localStorage
    useEffect(() => {
        localStorage.setItem('recentFiles', JSON.stringify(recentFiles.slice(0, 8)));
    }, [recentFiles]);

    // 保存最近文件夹到 localStorage
    useEffect(() => {
        localStorage.setItem('recentFolders', JSON.stringify(recentFolders.slice(0, 8)));
    }, [recentFolders]);

    const historyManager = useRef<EditHistoryManager>(new EditHistoryManager());
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const notificationIdRef = useRef<number>(0);

    // 上下文菜单
    const { state: contextMenuState, openContextMenu, closeContextMenu } = useContextMenu();

    // 显示通知
    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, { message, type, id }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    // 添加到最近文件（最多8条）
    const addToRecentFiles = useCallback((filePath: string) => {
        setRecentFiles(prev => {
            const filtered = prev.filter(f => f !== filePath);
            return [filePath, ...filtered].slice(0, 8);
        });
    }, []);

    // 添加到最近文件夹（最多8条）
    const addToRecentFolders = useCallback((folderPath: string) => {
        setRecentFolders(prev => {
            const filtered = prev.filter(f => f !== folderPath);
            return [folderPath, ...filtered].slice(0, 8);
        });
    }, []);

    // 清除所有最近文件
    const clearRecentFiles = useCallback(() => {
        setRecentFiles([]);
    }, []);

    // 清除所有最近文件夹
    const clearRecentFolders = useCallback(() => {
        setRecentFolders([]);
    }, []);

    // 计算字数
    useEffect(() => {
        const text = markdown
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]+`/g, '')
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
            .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
            .replace(/[#*_~>]/g, '')
            .trim();

        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const numbers = (text.match(/[0-9]+/g) || []).length;

        setWordCount(chineseChars + englishWords + numbers);
    }, [markdown]);

    // 更新历史记录按钮状态
    const updateHistoryButtons = useCallback(() => {
        setCanUndo(historyManager.current.canUndo());
        setCanRedo(historyManager.current.canRedo());
    }, []);

    // 记录历史（防抖）
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentState = historyManager.current.getCurrentState();
            if (markdown !== currentState.content) {
                const cursorPos = textareaRef.current?.selectionStart || 0;
                historyManager.current.recordChange(markdown, cursorPos);
                updateHistoryButtons();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [markdown, updateHistoryButtons]);

    // 标记未保存状态
    useEffect(() => {
        if (currentFilePath) {
            setIsDirty(true);
        }
    }, [markdown, currentFilePath]);

    // 检测窗口最大化状态
    useEffect(() => {
        const checkMaximised = async () => {
            const maximised = await WindowIsMaximised();
            setIsMaximised(maximised);
        };

        checkMaximised();

        // 监听窗口大小变化
        const handleResize = () => {
            checkMaximised();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 应用启动时检查是否有命令行传入的文件路径
    useEffect(() => {
        const openInitialFile = async () => {
            try {
                const initialPath = await GetInitialFilePath();
                if (initialPath) {
                    const name = initialPath.split(/[\\/]/).pop() || '';
                    setFileName(name);
                    setCurrentFilePath(initialPath);

                    const content = await ReadFile(initialPath);
                    setMarkdown(content);
                    setIsDirty(false);
                    historyManager.current.reset(content);
                    updateHistoryButtons();
                    addToRecentFiles(initialPath);
                }
            } catch (error) {
                console.error('打开初始文件失败:', error);
            }
        };

        openInitialFile();
    }, []);

    // 处理最大化/还原按钮点击
    const handleToggleMaximise = useCallback(async () => {
        WindowToggleMaximise();
        // 延迟检测新状态
        setTimeout(async () => {
            const maximised = await WindowIsMaximised();
            setIsMaximised(maximised);
        }, 100);
    }, []);

    // 新建文件
    const handleNewFile = useCallback(() => {
        // 如果有未保存的更改，可以在这里添加提示
        setMarkdown('# 新建文档\n\n开始编写...');
        setFileName('untitled.md');
        setCurrentFilePath('');
        setIsDirty(false);
        setSourceCodeMode(true);
        setHasNewFile(true); // 标记为新建文件状态
        historyManager.current.reset('# 新建文档\n\n开始编写...');
        updateHistoryButtons();
        showNotification('新建文档成功', 'success');
    }, [showNotification, updateHistoryButtons]);

    // 处理文件选择
    const handleSelectFile = async () => {
        try {
            const filePath = await SelectFile();
            if (!filePath) return;

            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);
            setHasNewFile(false); // 重置新建文件状态

            const content = await ReadFile(filePath);
            setMarkdown(content);
            setIsDirty(false);
            historyManager.current.reset(content);
            updateHistoryButtons();
            addToRecentFiles(filePath);
        } catch (error) {
            showNotification(`读取文件失败: ${error}`, 'error');
        }
    };

    // 处理打开文件夹
    const handleOpenFolder = async () => {
        try {
            const folderPath = await SelectFolder();
            if (!folderPath) return;

            setOpenedFolderPath(folderPath);
            setHasNewFile(false); // 重置新建文件状态
            await loadFolderFiles(folderPath);
            addToRecentFolders(folderPath);
            showNotification('文件夹打开成功', 'success');
        } catch (error) {
            showNotification(`打开文件夹失败: ${error}`, 'error');
        }
    };

    // 打开最近文件夹
    const handleOpenRecentFolder = async (folderPath: string) => {
        try {
            setOpenedFolderPath(folderPath);
            setHasNewFile(false); // 重置新建文件状态
            await loadFolderFiles(folderPath);
            addToRecentFolders(folderPath);
            showNotification('文件夹打开成功', 'success');
        } catch (error) {
            showNotification(`打开文件夹失败: ${error}`, 'error');
        }
    };

    // 加载文件夹文件列表
    const loadFolderFiles = async (folderPath: string) => {
        try {
            const files = await ListFolderFiles(folderPath);
            setFolderFiles(files);
        } catch (error) {
            showNotification(`读取文件夹内容失败: ${error}`, 'error');
            setFolderFiles([]);
        }
    };

    // 打开最近文件
    const handleOpenRecentFile = async (filePath: string) => {
        try {
            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);
            setHasNewFile(false); // 重置新建文件状态

            const content = await ReadFile(filePath);
            setMarkdown(content);
            setIsDirty(false);
            historyManager.current.reset(content);
            updateHistoryButtons();
            addToRecentFiles(filePath);
        } catch (error) {
            showNotification(`读取文件失败: ${error}`, 'error');
        }
    };

    // 处理侧边栏文件选择
    const handleSidebarFileSelect = async (filePath: string) => {
        try {
            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);
            setHasNewFile(false); // 重置新建文件状态

            const content = await ReadFile(filePath);
            setMarkdown(content);
            setIsDirty(false);
            historyManager.current.reset(content);
            updateHistoryButtons();
            addToRecentFiles(filePath);
        } catch (error) {
            showNotification(`读取文件失败: ${error}`, 'error');
        }
    };

    // 保存文件
    const handleSave = async () => {
        if (!currentFilePath) {
            await handleSaveAs();
            return;
        }

        try {
            await SaveFile(currentFilePath, markdown);
            setIsDirty(false);
            showNotification('保存成功', 'success');
        } catch (error) {
            showNotification(`保存失败: ${error}`, 'error');
        }
    };

    // 另存为
    const handleSaveAs = async () => {
        try {
            const defaultName = fileName || 'untitled.md';
            const filePath = await SaveFileDialog(defaultName);
            if (!filePath) return;

            await SaveFile(filePath, markdown);

            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);
            setIsDirty(false);
            showNotification('保存成功', 'success');
            addToRecentFiles(filePath);
        } catch (error) {
            showNotification(`保存失败: ${error}`, 'error');
        }
    };

    // 撤销
    const handleUndo = useCallback(() => {
        const state = historyManager.current.undo();
        if (state) {
            setMarkdown(state.content);
            updateHistoryButtons();
        }
    }, [updateHistoryButtons]);

    // 重做
    const handleRedo = useCallback(() => {
        const state = historyManager.current.redo();
        if (state) {
            setMarkdown(state.content);
            updateHistoryButtons();
        }
    }, [updateHistoryButtons]);

    // 切换源码模式
    const toggleSourceCodeMode = useCallback(() => {
        setSourceCodeMode(prev => !prev);
    }, []);

    // 切换侧边栏
    const toggleSidebar = useCallback(() => {
        setSidebarExpanded(prev => !prev);
    }, []);

    // 全屏模式
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    // 查找替换（占位）
    const handleFindReplace = useCallback(() => {
        showNotification('查找替换功能开发中...', 'info');
    }, [showNotification]);

    // 导出为 PDF（占位）
    const handleExportPDF = useCallback(() => {
        showNotification('导出 PDF 功能开发中...', 'info');
    }, [showNotification]);

    // 导出为 HTML（占位）
    const handleExportHTML = useCallback(() => {
        showNotification('导出 HTML 功能开发中...', 'info');
    }, [showNotification]);

    // 偏好设置（占位）
    const handlePreferences = useCallback(() => {
        showNotification('偏好设置功能开发中...', 'info');
    }, [showNotification]);

    // 关于
    const handleAbout = useCallback(() => {
        showNotification('Markdown Reader v1.0', 'info');
    }, [showNotification]);

    // 菜单栏配置
    const menuBarConfig = [
        {
            label: '文件',
            items: [
                { label: '新建', shortcut: 'Ctrl+N', action: handleNewFile },
                { label: '打开文件', shortcut: 'Ctrl+O', action: handleSelectFile },
                { label: '打开文件夹', shortcut: 'Ctrl+Shift+O', action: handleOpenFolder },
                { divider: true } as MenuItemType,
                { label: '保存', shortcut: 'Ctrl+S', action: handleSave },
                { label: '另存为', shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
                { divider: true } as MenuItemType,
                {
                    label: '最近文件',
                    children: recentFiles.length > 0
                        ? [
                            ...recentFiles.map(file => ({
                                label: file.split(/[\\/]/).pop() || file,
                                action: () => handleOpenRecentFile(file)
                            })),
                            { divider: true } as MenuItemType,
                            { label: '清除最近文件', action: clearRecentFiles }
                        ]
                        : [{ label: '无最近文件', disabled: true }]
                },
                {
                    label: '最近文件夹',
                    children: recentFolders.length > 0
                        ? [
                            ...recentFolders.map(folder => ({
                                label: folder.split(/[\\/]/).pop() || folder,
                                action: () => handleOpenRecentFolder(folder)
                            })),
                            { divider: true } as MenuItemType,
                            { label: '清除最近文件夹', action: clearRecentFolders }
                        ]
                        : [{ label: '无最近文件夹', disabled: true }]
                },
                { divider: true } as MenuItemType,
                { label: '导出为 PDF', action: handleExportPDF },
                { label: '导出为 HTML', action: handleExportHTML },
                { divider: true } as MenuItemType,
                { label: '退出', action: WindowClose },
            ] as MenuItemType[],
        },
        {
            label: '编辑',
            items: [
                { label: '撤销', shortcut: 'Ctrl+Z', action: handleUndo, disabled: !canUndo },
                { label: '重做', shortcut: 'Ctrl+Y', action: handleRedo, disabled: !canRedo },
                { divider: true } as MenuItemType,
                { label: '查找替换', shortcut: 'Ctrl+F', action: handleFindReplace },
            ] as MenuItemType[],
        },
        {
            label: '查看',
            items: [
                { label: '预览模式', action: () => setSourceCodeMode(false), disabled: !sourceCodeMode },
                { label: '源码模式', action: () => setSourceCodeMode(true), disabled: sourceCodeMode },
                { divider: true } as MenuItemType,
                { label: '侧边栏', action: toggleSidebar, disabled: !sidebarExpanded },
                { label: '全屏', shortcut: 'F11', action: toggleFullscreen },
            ] as MenuItemType[],
        },
        {
            label: '工具',
            items: [
                { label: '命令面板', shortcut: 'Ctrl+Shift+P', action: () => setIsCommandPaletteOpen(true) },
                { divider: true } as MenuItemType,
                { label: '偏好设置', shortcut: 'Ctrl+,', action: handlePreferences },
            ] as MenuItemType[],
        },
        {
            label: '帮助',
            items: [
                { label: '关于', action: handleAbout },
            ] as MenuItemType[],
        },
    ];

    // 命令面板命令列表
    const commands: CommandItem[] = [
        { id: 'new', label: '新建文件', shortcut: 'Ctrl+N', category: '文件', icon: 'file-earmark-plus', action: handleNewFile },
        { id: 'open', label: '打开文件', shortcut: 'Ctrl+O', category: '文件', icon: 'folder2-open', action: handleSelectFile },
        { id: 'open-folder', label: '打开文件夹', shortcut: 'Ctrl+Shift+O', category: '文件', icon: 'folder', action: handleOpenFolder },
        { id: 'save', label: '保存文件', shortcut: 'Ctrl+S', category: '文件', icon: 'save', action: handleSave },
        { id: 'save-as', label: '另存为', shortcut: 'Ctrl+Shift+S', category: '文件', icon: 'save2', action: handleSaveAs },
        { id: 'export-pdf', label: '导出为 PDF', category: '文件', icon: 'file-pdf', action: handleExportPDF },
        { id: 'export-html', label: '导出为 HTML', category: '文件', icon: 'file-code', action: handleExportHTML },
        { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z', category: '编辑', icon: 'arrow-counterclockwise', action: handleUndo },
        { id: 'redo', label: '重做', shortcut: 'Ctrl+Y', category: '编辑', icon: 'arrow-clockwise', action: handleRedo },
        { id: 'find-replace', label: '查找替换', shortcut: 'Ctrl+F', category: '编辑', icon: 'search', action: handleFindReplace },
        { id: 'preview', label: '预览模式', category: '查看', icon: 'eye', action: () => setSourceCodeMode(false) },
        { id: 'source', label: '源码模式', category: '查看', icon: 'code-slash', action: () => setSourceCodeMode(true) },
        { id: 'sidebar', label: '切换侧边栏', category: '查看', icon: 'layout-sidebar', action: toggleSidebar },
        { id: 'fullscreen', label: '全屏', shortcut: 'F11', category: '查看', icon: 'fullscreen', action: toggleFullscreen },
        { id: 'preferences', label: '偏好设置', shortcut: 'Ctrl+,', category: '工具', icon: 'gear', action: handlePreferences },
        { id: 'command-palette', label: '命令面板', shortcut: 'Ctrl+Shift+P', category: '工具', icon: 'command', action: () => setIsCommandPaletteOpen(true) },
    ];

    // 编辑器右键菜单
    const getEditorContextMenuItems = (): ContextMenuItem[] => [
        { id: 'undo', label: '撤销', icon: 'arrow-counterclockwise', shortcut: 'Ctrl+Z', disabled: !canUndo, action: handleUndo },
        { id: 'redo', label: '重做', icon: 'arrow-clockwise', shortcut: 'Ctrl+Y', disabled: !canRedo, action: handleRedo },
        { divider: true } as ContextMenuItem,
        { id: 'cut', label: '剪切', icon: 'scissors', shortcut: 'Ctrl+X' },
        { id: 'copy', label: '复制', icon: 'files', shortcut: 'Ctrl+C' },
        { id: 'paste', label: '粘贴', icon: 'clipboard', shortcut: 'Ctrl+V' },
        { divider: true } as ContextMenuItem,
        { id: 'export-pdf', label: '导出为 PDF', icon: 'file-pdf', action: handleExportPDF },
        { id: 'export-html', label: '导出为 HTML', icon: 'file-code', action: handleExportHTML },
    ];

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            // 命令面板快捷键
            if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
                return;
            }

            // 其他快捷键
            if (isCtrlOrCmd) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        handleNewFile();
                        break;
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleSaveAs();
                        } else {
                            handleSave();
                        }
                        break;
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleRedo();
                        } else {
                            handleUndo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        handleRedo();
                        break;
                    case 'o':
                        e.preventDefault();
                        if (e.shiftKey) {
                            handleOpenFolder();
                        } else {
                            handleSelectFile();
                        }
                        break;
                    case ',':
                        e.preventDefault();
                        handlePreferences();
                        break;
                    case 'f':
                        e.preventDefault();
                        handleFindReplace();
                        break;
                }
            }

            // F11 全屏
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNewFile, handleUndo, handleRedo, handleSave, handleSaveAs, handlePreferences, handleFindReplace, toggleFullscreen]);

    return (
        <div className="app-container">
            {/* 通知区域 */}
            <div className="notification-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification notification-${n.type}`}>
                        {n.message}
                    </div>
                ))}
            </div>

            {/* 命令面板 */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                commands={commands}
            />

            {/* 上下文菜单 */}
            <ContextMenu state={contextMenuState} onClose={closeContextMenu} />

            {/* 顶部菜单栏 */}
            <header className="header">
                <div className="header-left">
                    {/* 展开/收缩侧边栏按钮 */}
                    <button
                        className="toggle-sidebar-btn"
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
                    >
                        <i className={sidebarExpanded ? "bi bi-chevron-left" : "bi bi-chevron-right"}></i>
                    </button>
                    <MenuBar menus={menuBarConfig} />
                </div>
                <div className="window-controls">
                    <button className="window-btn" onClick={WindowMinimise} title="最小化">
                        <i className="bi bi-dash"></i>
                    </button>
                    <button className="window-btn" onClick={handleToggleMaximise} title={isMaximised ? '还原' : '最大化'}>
                        <i className={`bi ${isMaximised ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
                    </button>
                    <button className="window-btn close-btn" onClick={WindowClose} title="关闭">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            </header>

            <div className={`main-container ${getLayoutMode()}`}>
                {/* 默认状态：单列居中显示历史记录 */}
                {!currentFilePath && !openedFolderPath && !hasNewFile && (
                    <div className="welcome-layout">
                        <RecentPanel
                            recentFiles={recentFiles}
                            recentFolders={recentFolders}
                            onOpenFile={handleOpenRecentFile}
                            onOpenRecentFolder={handleOpenRecentFolder}
                            onClearFiles={clearRecentFiles}
                            onClearFolders={clearRecentFolders}
                            isVisible={true}
                            centered={true}
                            onNewFile={handleNewFile}
                            onSelectFile={handleSelectFile}
                            onOpenFolder={handleOpenFolder}
                        />
                    </div>
                )}

                {/* 打开文件或新建文件时：左侧大纲，右侧内容 */}
                {(currentFilePath || hasNewFile) && (
                    <>
                        <Sidebar
                            expanded={sidebarExpanded}
                            currentFilePath={currentFilePath}
                            markdownContent={markdown}
                            onFileSelect={handleSidebarFileSelect}
                            openedFolderPath=""
                            folderFiles={[]}
                            showDefaultTabs={true}
                            defaultActiveTab="outline"
                        />
                        <div className="main-wrapper">
                            <main
                                className="main-content"
                                onContextMenu={(e) => openContextMenu(e, getEditorContextMenuItems())}
                            >
                                {sourceCodeMode ? (
                                    <div className="source-code-container">
                                        <textarea
                                            ref={textareaRef}
                                            className="source-code-textarea"
                                            value={markdown}
                                            onChange={(e) => setMarkdown(e.target.value)}
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <MarkdownRenderer content={markdown} />
                                )}
                            </main>
                            <footer className="status-bar">
                                <div className="status-bar-left">
                                    <button
                                        className="status-bar-btn"
                                        onClick={toggleSourceCodeMode}
                                        title={sourceCodeMode ? '切换到视图模式' : '切换到源码模式'}
                                    >
                                        <i className={`bi ${sourceCodeMode ? 'bi-eye' : 'bi-code-slash'}`}></i> {sourceCodeMode ? '视图模式' : '源码模式'}
                                    </button>
                                    <div className="history-controls">
                                        <button
                                            className="status-bar-btn"
                                            onClick={handleUndo}
                                            disabled={!canUndo}
                                            title="撤销 (Ctrl+Z)"
                                        >
                                            <i className="bi bi-arrow-counterclockwise"></i> 撤销
                                        </button>
                                        <button
                                            className="status-bar-btn"
                                            onClick={handleRedo}
                                            disabled={!canRedo}
                                            title="重做 (Ctrl+Y 或 Ctrl+Shift+Z)"
                                        >
                                            <i className="bi bi-arrow-clockwise"></i> 重做
                                        </button>
                                    </div>
                                </div>
                                <div className="status-bar-right">
                                    <span className="status-bar-item">
                                        <i className="bi bi-file-text"></i> 字数：{wordCount}
                                    </span>
                                    {isDirty && (
                                        <span className="status-bar-item unsaved">
                                            <i className="bi bi-circle-fill"></i> 未保存
                                        </span>
                                    )}
                                </div>
                            </footer>
                        </div>
                    </>
                )}

                {/* 打开文件夹时：左侧文件夹结构，右侧空白 */}
                {!currentFilePath && openedFolderPath && (
                    <>
                        <Sidebar
                            expanded={sidebarExpanded}
                            currentFilePath=""
                            markdownContent=""
                            onFileSelect={handleSidebarFileSelect}
                            openedFolderPath={openedFolderPath}
                            folderFiles={folderFiles}
                            showDefaultTabs={true}
                            defaultActiveTab="files"
                        />
                        <div className="main-wrapper empty-content">
                            <div className="empty-state">
                                <i className="bi bi-folder2-open fs-1 text-muted mb-3"></i>
                                <p className="text-muted">请从左侧选择文件打开</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default App;
