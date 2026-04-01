import * as vscode from 'vscode';
import * as path from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { DEFAULT_THEME_SCHEMA } from '../config/defaultThemeSchema';
import { SchemaField } from '../types';

export type MiniProgramInfo = {
  appId: string;
  name?: string;
  themeJsonName?: string;
};

const DEFAULT_SCHEMA_CONFIG_PATH = '.brand-mini-program-assistant.config.json';
const VALID_FIELD_TYPES = new Set([
  'text',
  'color',
  'image',
  'boolean',
  'singleSelectWithCustomText',
  'array',
]);

export function getWorkspaceRootPath(): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }

  return workspaceFolders[0].uri.fsPath;
}

function cloneDefaultValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSchemaField(rawField: unknown, indexPath: string): SchemaField {
  if (!rawField || typeof rawField !== 'object') {
    throw new Error(`schema 字段 ${indexPath} 必须是对象`);
  }

  const field = rawField as Record<string, unknown>;
  if (typeof field.key !== 'string' || field.key.trim() === '') {
    throw new Error(`schema 字段 ${indexPath}.key 必须是非空字符串`);
  }
  if (typeof field.label !== 'string' || field.label.trim() === '') {
    throw new Error(`schema 字段 ${indexPath}.label 必须是非空字符串`);
  }
  if (typeof field.type !== 'string' || !VALID_FIELD_TYPES.has(field.type)) {
    throw new Error(`schema 字段 ${indexPath}.type 非法`);
  }

  const normalized: SchemaField = {
    key: field.key,
    label: field.label,
    type: field.type as SchemaField['type'],
  };

  if (typeof field.required === 'boolean') {
    normalized.required = field.required;
  }
  if (Array.isArray(field.options)) {
    normalized.options = field.options.map((option, optionIndex) => {
      if (!option || typeof option !== 'object') {
        throw new Error(
          `schema 字段 ${indexPath}.options[${optionIndex}] 必须是对象`,
        );
      }

      const normalizedOption = option as Record<string, unknown>;
      if (
        (typeof normalizedOption.value !== 'string' &&
          typeof normalizedOption.value !== 'number') ||
        typeof normalizedOption.label !== 'string'
      ) {
        throw new Error(
          `schema 字段 ${indexPath}.options[${optionIndex}] 格式非法`,
        );
      }

      return {
        value: normalizedOption.value,
        label: normalizedOption.label,
      };
    });
  }
  if (Object.prototype.hasOwnProperty.call(field, 'defaultValue')) {
    normalized.defaultValue = cloneDefaultValue(field.defaultValue);
  }
  if (
    typeof field.customOptionValue === 'string' ||
    typeof field.customOptionValue === 'number'
  ) {
    normalized.customOptionValue = field.customOptionValue;
  }
  if (typeof field.customTextPlaceholder === 'string') {
    normalized.customTextPlaceholder = field.customTextPlaceholder;
  }
  if (Array.isArray(field.schema)) {
    normalized.schema = field.schema.map((subField, subFieldIndex) =>
      normalizeSchemaField(subField, `${indexPath}.schema[${subFieldIndex}]`),
    );
  }

  return normalized;
}

function normalizeThemeSchema(rawSchema: unknown): SchemaField[] {
  if (!Array.isArray(rawSchema)) {
    throw new Error('schema 文件根节点必须是数组');
  }

  return rawSchema.map((field, index) =>
    normalizeSchemaField(field, `[${index}]`),
  );
}

export function getThemeSchemaConfigPath(): string | undefined {
  const rootPath = getWorkspaceRootPath();
  if (!rootPath) {
    return undefined;
  }

  const configuredPath = vscode.workspace
    .getConfiguration('themeConfigEditor')
    .get<string>('schemaConfigPath', DEFAULT_SCHEMA_CONFIG_PATH)
    ?.trim();
  const finalPath = configuredPath || DEFAULT_SCHEMA_CONFIG_PATH;

  return path.isAbsolute(finalPath)
    ? finalPath
    : path.join(rootPath, finalPath);
}

export async function getThemeSchemaConfig(): Promise<SchemaField[]> {
  const schemaPath = getThemeSchemaConfigPath();
  if (!schemaPath || !existsSync(schemaPath)) {
    return DEFAULT_THEME_SCHEMA.map(field =>
      normalizeSchemaField(field, `[${field.key}]`),
    );
  }

  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    return normalizeThemeSchema(JSON.parse(content));
  } catch (error) {
    console.error('Failed to load theme schema config:', error);
    const reason = error instanceof Error ? error.message : String(error);
    void vscode.window.showWarningMessage(
      `主题 schema 文件加载失败，已回退到插件内置 schema：${reason}`,
    );
    return DEFAULT_THEME_SCHEMA.map(field =>
      normalizeSchemaField(field, `[${field.key}]`),
    );
  }
}

/**
 * 获取主题配置目录路径
 */
export async function getThemeConfigPath(): Promise<string | undefined> {
  const rootPath = getWorkspaceRootPath();
  if (!rootPath) {
    return undefined;
  }
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
  const mapping = new Map<string, string>();
  const rootPath = getWorkspaceRootPath();
  if (!rootPath) {
    return mapping;
  }
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
  const rootPath = getWorkspaceRootPath();
  if (!rootPath) {
    return [];
  }
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
