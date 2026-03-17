import { useState, useEffect, useRef, useCallback } from 'react';
import { SelectFile, ReadFile, SaveFile, SaveFileDialog } from '../wailsjs/go/main/App';
import { EditHistoryManager } from './hooks/useEditHistory';
import './App.css';
import 'highlight.js/styles/github.css';
import Sidebar from './components/Sidebar';
import MarkdownRenderer from './components/MarkdownRenderer';

// Wails 运行时函数
const WindowMinimise = () => {
    console.log('WindowMinimise called');
    const win = window as any;
    if (win.runtime && win.runtime.WindowMinimise) {
        win.runtime.WindowMinimise();
    } else {
        console.warn('runtime.WindowMinimise not available');
    }
};

const WindowToggleMaximise = () => {
    console.log('WindowToggleMaximise called');
    const win = window as any;
    if (win.runtime && win.runtime.WindowToggleMaximise) {
        win.runtime.WindowToggleMaximise();
    } else {
        console.warn('runtime.WindowToggleMaximise not available');
    }
};

const WindowClose = () => {
    console.log('WindowClose called');
    const win = window as any;
    if (win.runtime && win.runtime.Quit) {
        win.runtime.Quit();
    } else {
        console.warn('runtime.Quit not available');
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

    const historyManager = useRef<EditHistoryManager>(new EditHistoryManager());
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const notificationIdRef = useRef<number>(0);

    // 显示通知
    const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, { message, type, id }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
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

    // 处理文件选择
    const handleSelectFile = async () => {
        try {
            const filePath = await SelectFile();
            if (!filePath) return;

            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);

            const content = await ReadFile(filePath);
            setMarkdown(content);
            setIsDirty(false);
            historyManager.current.reset(content);
            updateHistoryButtons();
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

            const content = await ReadFile(filePath);
            setMarkdown(content);
            setIsDirty(false);
            historyManager.current.reset(content);
            updateHistoryButtons();
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

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd) {
                switch (e.key.toLowerCase()) {
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
                        handleSelectFile();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo, handleSave, handleSaveAs]);

    return (
        <div className="container-fluid">
            {/* 通知区域 */}
            <div className="notification-container">
                {notifications.map(n => (
                    <div key={n.id} className={`notification notification-${n.type}`}>
                        {n.message}
                    </div>
                ))}
            </div>

            <header className="header">
                <div className="header-left">
                    <button
                        className="toggle-sidebar-btn"
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
                    >
                        <i className={sidebarExpanded ? "bi bi-chevron-left" : "bi bi-chevron-right"}></i>
                    </button>
                    <h1>Markdown Reader</h1>
                    <div className="file-input-wrapper">
                        <button
                            className="file-input-label"
                            onClick={handleSelectFile}
                            title="打开文件 (Ctrl+O)"
                        >
                            <i className="bi bi-folder2-open"></i> 打开
                        </button>
                        <button
                            className="file-input-label save-btn"
                            onClick={handleSave}
                            disabled={!isDirty}
                            title="保存 (Ctrl+S)"
                        >
                            <i className="bi bi-save"></i> 保存
                        </button>
                        <button
                            className="file-input-label save-as-btn"
                            onClick={handleSaveAs}
                            title="另存为 (Ctrl+Shift+S)"
                        >
                            <i className="bi bi-save2"></i> 另存为
                        </button>
                        <span className="file-name">
                            {fileName || '未选择文件'}
                            {isDirty && <span className="unsaved-indicator">*</span>}
                        </span>
                    </div>
                </div>
                <div className="window-controls">
                    <button className="window-btn" onClick={() => WindowMinimise()} title="最小化">
                        ─
                    </button>
                    <button className="window-btn" onClick={() => WindowToggleMaximise()} title="最大化">
                        □
                    </button>
                    <button className="window-btn close-btn" onClick={() => WindowClose()} title="关闭">
                        ×
                    </button>
                </div>
            </header>

            <div className="main-container">
                <Sidebar
                    expanded={sidebarExpanded}
                    currentFilePath={currentFilePath}
                    markdownContent={markdown}
                    onFileSelect={handleSidebarFileSelect}
                />

                <div className="main-wrapper">
                    <main className="main-content">
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
                                className={`status-bar-btn ${sourceCodeMode ? 'active' : ''}`}
                                onClick={() => setSourceCodeMode(!sourceCodeMode)}
                                title="切换源码模式"
                            >
                                <i className="bi bi-code-slash"></i> 源码模式
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
            </div>
        </div>
    );
}

export default App;
