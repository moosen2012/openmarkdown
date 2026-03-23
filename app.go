package main

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// FileInfo 文件信息
type FileInfo struct {
	Name  string `json:"name"`
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

// OutlineItem 大纲项
type OutlineItem struct {
	Level int    `json:"level"`
	Title string `json:"title"`
	ID    string `json:"id"`
}

// App struct
type App struct {
	ctx context.Context
	md  goldmark.Markdown
}

// NewApp creates a new App application struct
func NewApp() *App {
	// 创建 goldmark 解析器，启用 GFM 扩展
	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
			html.WithXHTML(),
		),
	)

	return &App{
		md: md,
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// SelectFile opens a file selection dialog and returns the selected file path
func (a *App) SelectFile() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择 Markdown 文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md, *.markdown)",
				Pattern:     "*.md;*.markdown",
			},
			{
				DisplayName: "Text Files (*.txt)",
				Pattern:     "*.txt",
			},
		},
	})
	return filePath, err
}

// ReadFile reads the content of a file
func (a *App) ReadFile(filepath string) (string, error) {
	content, err := os.ReadFile(filepath)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// ListMarkdownFiles lists all markdown files in a directory
func (a *App) ListMarkdownFiles(dirPath string) ([]FileInfo, error) {
	var files []FileInfo

	// 如果是空路径，使用当前目录
	if dirPath == "" {
		var err error
		dirPath, err = os.Getwd()
		if err != nil {
			return nil, err
		}
	}

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过隐藏目录
		if info.IsDir() && strings.HasPrefix(info.Name(), ".") {
			return filepath.SkipDir
		}

		// 检查是否是 markdown 文件
		ext := strings.ToLower(filepath.Ext(path))
		if ext == ".md" || ext == ".markdown" {
			files = append(files, FileInfo{
				Name:  info.Name(),
				Path:  path,
				IsDir: info.IsDir(),
			})
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}

// ParseOutline parses markdown content and returns outline items
func (a *App) ParseOutline(content string) []OutlineItem {
	var outline []OutlineItem

	// 匹配标题的正则表达式
	headingRegex := regexp.MustCompile(`^(#{1,6})\s+(.+)$`)
	lines := strings.Split(content, "\n")

	for i, line := range lines {
		matches := headingRegex.FindStringSubmatch(line)
		if matches != nil {
			level := len(matches[1])
			title := strings.TrimSpace(matches[2])

			// 生成 ID（用于锚点链接）
			id := strings.ToLower(strings.ReplaceAll(title, " ", "-"))
			id = regexp.MustCompile(`[^\w\-]`).ReplaceAllString(id, "")

			outline = append(outline, OutlineItem{
				Level: level,
				Title: title,
				ID:    id,
			})

			// 限制只提取前 20 个标题，避免大纲过长
			if len(outline) >= 20 {
				break
			}
		}

		// 限制只处理前 500 行，提高性能
		if i >= 500 {
			break
		}
	}

	return outline
}

// ParseMarkdown 使用 goldmark 解析 Markdown 内容并返回 HTML
func (a *App) ParseMarkdown(content string) (string, error) {
	var buf bytes.Buffer
	if err := a.md.Convert([]byte(content), &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// SaveFile 保存内容到指定路径
func (a *App) SaveFile(filePath string, content string) error {
	return os.WriteFile(filePath, []byte(content), 0644)
}

// SaveFileDialog 弹出保存文件对话框
func (a *App) SaveFileDialog(defaultName string) (string, error) {
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "保存 Markdown 文件",
		DefaultFilename: defaultName,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md)",
				Pattern:     "*.md",
			},
			{
				DisplayName: "Text Files (*.txt)",
				Pattern:     "*.txt",
			},
		},
	})
	return filePath, err
}

// SelectFolder opens a folder selection dialog and returns the selected folder path
func (a *App) SelectFolder() (string, error) {
	folderPath, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件夹",
	})
	return folderPath, err
}

// ListFolderFiles lists all files in a folder with detailed information
func (a *App) ListFolderFiles(folderPath string) ([]FileInfo, error) {
	var files []FileInfo

	if folderPath == "" {
		return files, nil
	}

	entries, err := os.ReadDir(folderPath)
	if err != nil {
		return nil, err
	}

	for _, entry := range entries {
		// 跳过隐藏文件和目录
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		files = append(files, FileInfo{
			Name:  info.Name(),
			Path:  filepath.Join(folderPath, info.Name()),
			IsDir: info.IsDir(),
		})
	}

	return files, nil
}

// ListFolderFilesRecursive lists all files recursively in a folder with detailed information
func (a *App) ListFolderFilesRecursive(folderPath string) ([]FileInfo, error) {
	var files []FileInfo

	if folderPath == "" {
		return files, nil
	}

	err := filepath.Walk(folderPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 跳过根目录本身
		if path == folderPath {
			return nil
		}

		// 跳过隐藏文件和目录
		if strings.HasPrefix(info.Name(), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		files = append(files, FileInfo{
			Name:  info.Name(),
			Path:  path,
			IsDir: info.IsDir(),
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}
