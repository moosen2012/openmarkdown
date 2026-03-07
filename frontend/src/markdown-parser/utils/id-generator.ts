/**
 * ID 生成器工具
 * 用于生成标题锚点 ID
 */

/**
 * 生成标题 ID
 * @param text 标题文本
 * @returns 生成的 ID
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // 空格替换为短横线
    .replace(/[^\w\-\u4e00-\u9fa5]/g, '')  // 保留中文、英文、数字、短横线
    .replace(/^-+|-+$/g, '');       // 移除首尾短横线
}

/**
 * 创建唯一 ID 生成器
 * 用于确保生成的 ID 不重复
 */
export function createUniqueIdGenerator() {
  const usedIds = new Set<string>();

  return {
    generate(text: string): string {
      let id = generateId(text);

      // 如果 ID 为空，使用默认 ID
      if (!id) {
        id = 'heading';
      }

      // 处理重复 ID
      let uniqueId = id;
      let counter = 1;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }

      usedIds.add(uniqueId);
      return uniqueId;
    },

    reset(): void {
      usedIds.clear();
    },
  };
}
