import * as path from 'path';

/**
 * 验证文件名安全性，防止路径遍历
 */
export function isValidFileName(fileName: string): boolean {
  // 只允许字母、数字、下划线、连字符和点
  const validPattern = /^[a-zA-Z0-9_-]+\.json$/;
  if (!validPattern.test(fileName)) {
    return false;
  }
  // 防止路径遍历
  const normalized = path.normalize(fileName);
  return (
    !normalized.includes('..') &&
    !normalized.includes(path.sep) &&
    normalized === fileName
  );
}
