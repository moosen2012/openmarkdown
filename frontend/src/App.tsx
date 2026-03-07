import { useState, useEffect } from 'react';
import { SelectFile, ReadFile } from '../wailsjs/go/main/App';
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

function App() {
    const [markdown, setMarkdown] = useState<string>('# Welcome to Markdown Reader\n\n点击上方按钮选择 .md 文件开始阅读。');
    const [fileName, setFileName] = useState<string>('');
    const [currentFilePath, setCurrentFilePath] = useState<string>('');
    const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
    const [sourceCodeMode, setSourceCodeMode] = useState<boolean>(false);
    const [wordCount, setWordCount] = useState<number>(0);

    // 计算字数
    useEffect(() => {
        // 移除代码块和 HTML 标签，统计纯文字字数
        const text = markdown
            .replace(/```[\s\S]*?```/g, '')  // 移除代码块
            .replace(/`[^`]+`/g, '')          // 移除行内代码
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')  // 处理图片
            .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')   // 处理链接
            .replace(/[#*_~>]/g, '')          // 移除 Markdown 符号
            .trim();

        // 中文字符和英文单词都算作字数
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const numbers = (text.match(/[0-9]+/g) || []).length;

        setWordCount(chineseChars + englishWords + numbers);
    }, [markdown]);

    // 检查 runtime 是否可用
    useState(() => {
        const win = window as any;
        if (win.runtime) {
            console.log('Wails runtime is available:', win.runtime);
        } else {
            console.warn('Wails runtime is NOT available');
        }
    });

    // 处理文件选择
    const handleSelectFile = async () => {
        try {
            const filePath = await SelectFile();
            if (!filePath) return;

            // 从路径提取文件名
            const name = filePath.split(/[\\/]/).pop() || '';
            setFileName(name);
            setCurrentFilePath(filePath);

            const content = await ReadFile(filePath);
            setMarkdown(content);
        } catch (error) {
            setMarkdown(`# Error\n\nFailed to read file: ${error}`);
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
        } catch (error) {
            setMarkdown(`# Error\n\nFailed to read file: ${error}`);
        }
    };

    return (
        <div className="container-fluid">
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
                        >
                            <i className="bi bi-folder2-open"></i> 选择文件
                        </button>
                        <span className="file-name">{fileName || '未选择文件'}</span>
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
                        </div>
                        <div className="status-bar-right">
                            <span className="status-bar-item">
                                <i className="bi bi-file-text"></i> 字数：{wordCount}
                            </span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default App;
