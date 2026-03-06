package main

import (
	"context"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
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
