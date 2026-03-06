import { useState, useEffect } from 'react';
import { SelectFile, ReadFile } from '../wailsjs/go/main/App';
import './App.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import Sidebar from './components/Sidebar';

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

    // 简单的 Markdown 渲染（使用 highlight.js 进行代码高亮）
    const renderMarkdown = (text: string) => {
        // 使用占位符来保护代码块不被其他规则干扰
        const codeBlocks: string[] = [];
        let html = text.replace(/```(\w*)\n([\s\S]*?)```/gim, (match, lang, code) => {
            const language = lang || 'plaintext';
            const highlighted = hljs.highlight(code.trim(), { language }).value;
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<pre><code class="hljs language-${language}">${highlighted}</code></pre>`);
            return placeholder;
        });

        // 处理行内代码（在代码块之后处理）
        html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');

        // 生成标题 ID 的辅助函数（与后端 Go 逻辑保持一致）
        const generateId = (title: string) => {
            return title
                .toLowerCase()
                .replace(/\s+/g, '-')  // 空格替换为短横线
                .replace(/[^\w\-]/g, ''); // 移除特殊字符
        };

        // 处理其他 Markdown 语法
        html = html
            // 标题（添加 id 属性）
            .replace(/^### (.*$)/gim, (match, title) => {
                const id = generateId(title.trim());
                return `<h3 id="${id}">${title}</h3>`;
            })
            .replace(/^## (.*$)/gim, (match, title) => {
                const id = generateId(title.trim());
                return `<h2 id="${id}">${title}</h2>`;
            })
            .replace(/^# (.*$)/gim, (match, title) => {
                const id = generateId(title.trim());
                return `<h1 id="${id}">${title}</h1>`;
            })
            // 粗体
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
            // 列表
            .replace(/^\- (.*$)/gim, '<li>$1</li>');

        // 换行（代码块内的换行已经被保留）
        html = html.replace(/\n/gim, '<br>');

        // 恢复代码块
        codeBlocks.forEach((block, index) => {
            html = html.replace(`__CODE_BLOCK_${index}__`, block);
        });

        return html;
    };

    return (
        <div className="container">
            <header className="header">
                <div className="header-left">
                    <button 
                        className="toggle-sidebar-btn"
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        title={sidebarExpanded ? '收起侧边栏' : '展开侧边栏'}
                    >
                        {sidebarExpanded ? '◀' : '▶'}
                    </button>
                    <h1>Markdown Reader</h1>
                    <div className="file-input-wrapper">
                        <button 
                            className="file-input-label"
                            onClick={handleSelectFile}
                        >
                            📁 选择文件
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
                
                <main className="main-content">
                    <div 
                        className="markdown-body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
                    />
                </main>
            </div>
        </div>
    );
}

export default App;
