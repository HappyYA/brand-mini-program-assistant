import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';

export type MiniProgramInfo = {
  appId: string;
  name?: string;
  themeJsonName?: string;
};

/**
 * 获取主题配置目录路径
 */
export async function getThemeConfigPath(): Promise<string | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return undefined;
  }
  const rootPath = workspaceFolders[0].uri.fsPath;
  const themeConfigPath = path.join(rootPath, 'scripts', 'themeConfig');

  if (existsSync(themeConfigPath)) {
    return themeConfigPath;
  }
  return undefined;
}

/**
 * 获取 MiniConfig 映射
 */
export async function getMiniConfigMapping(): Promise<Map<string, string>> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const mapping = new Map<string, string>();

  if (!workspaceFolders) {
    return mapping;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const miniConfigPath = path.join(rootPath, 'scripts', 'miniConfig.js');

  try {
    if (existsSync(miniConfigPath)) {
      // 清除 require 缓存，以便获取最新内容
      delete require.cache[require.resolve(miniConfigPath)];

      // 直接 require JS 文件获取导出内容
      const { miniConfig } = require(miniConfigPath);

      // 遍历配置对象
      for (const appId in miniConfig) {
        const config = miniConfig[appId];
        if (config.themeJsonName && config.name) {
          mapping.set(config.themeJsonName, config.name);
          console.log(
            `Mapped theme: ${config.themeJsonName} -> ${config.name}`,
          );
        }
      }

      console.log('Total themes mapped:', mapping.size);
    } else {
      console.log('miniConfig.js not found at:', miniConfigPath);
    }
  } catch (err) {
    console.error('Failed to load miniConfig.js:', err);
    // 如果 require 失败，可以提供更详细的错误信息
    if (err instanceof Error) {
      console.error('Error details:', err.message);
    }
  }

  return mapping;
}

/**
 * 读取 scripts/miniConfig.js，返回小程序列表（保持 appId 与 name 一一对应的顺序）
 */
export async function getMiniProgramsFromMiniConfig(): Promise<
  MiniProgramInfo[]
> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return [];
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const miniConfigPath = path.join(rootPath, 'scripts', 'miniConfig.js');

  try {
    if (!existsSync(miniConfigPath)) {
      return [];
    }

    delete require.cache[require.resolve(miniConfigPath)];
    const required = require(miniConfigPath) as {
      miniConfig?: Record<string, any>;
    };
    const miniConfig = required?.miniConfig;
    if (!miniConfig || typeof miniConfig !== 'object') {
      return [];
    }

    const result: MiniProgramInfo[] = [];
    for (const appId of Object.keys(miniConfig)) {
      const cfg = miniConfig[appId];
      result.push({
        appId,
        name: cfg?.name,
        themeJsonName: cfg?.themeJsonName,
      });
    }
    return result;
  } catch (err) {
    console.error('Failed to load miniConfig.js:', err);
    return [];
  }
}
