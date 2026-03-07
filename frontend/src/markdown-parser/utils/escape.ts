/**"
 * HTML 转义工具函数
 * 用于防止 XSS 攻击
 */

// HTML 特殊字符映射表
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

// HTML 转义正则表达式
const HTML_ESCAPE_REGEX = /[&<>"'\/]/g;

/**
 * 转义 HTML 特殊字符
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * 转义属性值中的引号
 * @param text 原始文本
 * @returns 转义后的文本
 */
export function escapeAttribute(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
