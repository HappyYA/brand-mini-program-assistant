import * as vscode from 'vscode';
import { ThemeConfigTreeProvider } from './providers/treeDataProvider';
import {
  sendFilesToWebview,
  sendFileContentToWebview,
  saveFile,
  createFile,
  deleteFile,
  getWebviewContent,
  getMiniInfoWebviewContent,
} from './webview/webviewManager';
import {
  getMiniProgramsFromMiniConfig,
  getThemeConfigPath,
} from './utils/config';
import { isValidFileName } from './utils/validators';
import { WebviewMessage, ThemeConfig } from './types';
import { promises as fs } from 'fs';

type ValidationRule = {
  key: string;
  type:
    | 'text'
    | 'color'
    | 'image'
    | 'boolean'
    | 'singleSelectWithCustomText'
    | 'array';
  required?: boolean;
  customOptionValue?: string | number;
  schema?: ValidationRule[];
};

function findFirstRequiredEmptyPathByRule(
  value: unknown,
  rule: ValidationRule,
  path: string[],
): string | null {
  if (value === null || value === undefined) {
    return path.join('.') || '(root)';
  }

  if (rule.type === 'boolean') {
    return null;
  }

  if (rule.type === 'singleSelectWithCustomText') {
    if (typeof value !== 'object' || value === null) {
      return path.join('.') || '(root)';
    }
    const obj = value as Record<string, unknown>;
    const typePath = [...path, 'type'];
    const textPath = [...path, 'text'];

    if (obj.type === null || obj.type === undefined || obj.type === '') {
      return typePath.join('.');
    }

    const rawType = obj.type;
    const selectedType =
      typeof rawType === 'number'
        ? rawType
        : typeof rawType === 'string'
          ? Number(rawType)
          : NaN;
    if (Number.isNaN(selectedType)) {
      return typePath.join('.');
    }

    const customValue = rule.customOptionValue ?? 3;
    if (selectedType === customValue) {
      const textValue = obj.text;
      if (
        textValue === null ||
        textValue === undefined ||
        (typeof textValue === 'string' && textValue.trim() === '')
      ) {
        return textPath.join('.');
      }
    }
    return null;
  }

  if (rule.type === 'array') {
    if (!Array.isArray(value)) {
      return path.join('.') || '(root)';
    }
    if (value.length === 0) {
      return path.join('.') || '(root)';
    }
    if (!rule.schema || rule.schema.length === 0) {
      return null;
    }
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const itemObj =
        typeof item === 'object' && item !== null
          ? (item as Record<string, unknown>)
          : undefined;
      for (const subRule of rule.schema) {
        if (!subRule.required) {
          continue;
        }
        const subValue = itemObj ? itemObj[subRule.key] : undefined;
        const found = findFirstRequiredEmptyPathByRule(subValue, subRule, [
          ...path,
          String(i),
          subRule.key,
        ]);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? path.join('.') || '(root)' : null;
  }

  if (typeof value === 'number') {
    return null;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length === 0 ? path.join('.') || '(root)' : null;
  }

  return null;
}

function findFirstRequiredEmptyPath(
  content: ThemeConfig,
  rules: ValidationRule[],
): string | null {
  for (const rule of rules) {
    if (!rule.required) {
      continue;
    }
    const value = (content as Record<string, unknown>)[rule.key];
    const found = findFirstRequiredEmptyPathByRule(value, rule, [rule.key]);
    if (found) {
      return found;
    }
  }
  return null;
}

let treeDataProvider: ThemeConfigTreeProvider | undefined;

/**
 * 打开编辑器并加载文件
 */
// Editor Panel Singleton
let currentPanel: vscode.WebviewPanel | undefined = undefined;

/**
 * 打开编辑器并加载文件
 */
export async function openEditorWithFile(
  context: vscode.ExtensionContext,
  fileName?: string,
) {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'themeConfigEditor',
      '品牌小程序助手',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    // Load HTML
    currentPanel.webview.html = getWebviewContent(context, currentPanel);

    // Cleanup on dispose
    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      null,
      context.subscriptions,
    );

    // Initial Load
    // React might not be ready. But that's okay, we can rely on "getFiles" pulling it,
    // or just send it.
    await sendFilesToWebview(currentPanel);

    // Pending file to load once webview is ready
    let pendingFileToLoad: string | undefined = fileName;

    // Handle messages
    currentPanel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        if (!currentPanel) return;
        try {
          switch (message.command) {
            case 'showErrorMessage':
              if (message.text) {
                vscode.window.showErrorMessage(message.text);
              }
              break;

            case 'webviewReady':
            case 'getFiles':
              // When webview is ready or requests files, send files and any pending content
              await sendFilesToWebview(currentPanel);
              if (pendingFileToLoad) {
                await sendFileContentToWebview(currentPanel, pendingFileToLoad);
                pendingFileToLoad = undefined;
              }
              break;

            case 'getFileContent':
              if (!message.fileName) {
                currentPanel.webview.postMessage({
                  command: 'error',
                  text: 'File name is required',
                });
                return;
              }
              await sendFileContentToWebview(currentPanel, message.fileName);
              break;

            case 'saveFile':
              // ... existing strict validation ...
              if (!message.fileName || !message.content) {
                currentPanel.webview.postMessage({
                  command: 'error',
                  text: 'File name and content are required',
                });
                return;
              }
              if (typeof message.content === 'string') {
                currentPanel.webview.postMessage({
                  command: 'error',
                  text: 'Invalid content type',
                });
                return;
              }
              {
                const validationRules = Array.isArray(message.validationRules)
                  ? message.validationRules
                  : [];
                const emptyPath = findFirstRequiredEmptyPath(
                  message.content,
                  validationRules,
                );
                if (emptyPath) {
                  currentPanel.webview.postMessage({
                    command: 'error',
                    text: `保存失败：存在空字段 (${emptyPath})`,
                  });
                  return;
                }
              }
              await saveFile(message.fileName, message.content);
              await sendFilesToWebview(currentPanel);
              treeDataProvider?.refresh();
              vscode.window.showInformationMessage(
                `✓ Saved ${message.fileName}`,
              );
              break;

            case 'createFile':
              // ... existing strict validation ...
              if (!message.fileName || !message.content) {
                currentPanel.webview.postMessage({
                  command: 'error',
                  text: 'File name and content are required',
                });
                return;
              }
              if (typeof message.content === 'string') {
                currentPanel.webview.postMessage({
                  command: 'error',
                  text: 'Invalid content type',
                });
                return;
              }
              {
                const validationRules = Array.isArray(message.validationRules)
                  ? message.validationRules
                  : [];
                const emptyPath = findFirstRequiredEmptyPath(
                  message.content,
                  validationRules,
                );
                if (emptyPath) {
                  currentPanel.webview.postMessage({
                    command: 'error',
                    text: `保存失败：存在空字段 (${emptyPath})`,
                  });
                  return;
                }
              }
              {
                const normalizedFileName = message.fileName.endsWith('.json')
                  ? message.fileName
                  : `${message.fileName}.json`;
                if (!isValidFileName(normalizedFileName)) {
                  currentPanel.webview.postMessage({
                    command: 'error',
                    text: 'Invalid file name. Use valid filename characters.',
                  });
                  return;
                }
                await createFile(normalizedFileName, message.content);
                await sendFilesToWebview(currentPanel);
                treeDataProvider?.refresh();
                vscode.window.showInformationMessage(
                  `✓ Created ${normalizedFileName}`,
                );
              }
              break;

            default:
              console.warn(`Unknown command: ${message.command}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          if (currentPanel) {
            currentPanel.webview.postMessage({
              command: 'error',
              text: errorMsg,
            });
          }
        }
      },
      undefined,
      context.subscriptions,
    );
  }

  // If a specific file is requested, load it now
  if (fileName) {
    // If we just created the panel, it's handled by pendingFileToLoad via webviewReady.
    // If we reused it (it's ready), we can send immediately.
    // We can interpret `currentPanel.visible` or similar, but simpler:
    // If we reused the panel, the `webviewReady` message won't fire again (unless reloaded).
    // So we need to send it here IF the panel was reused.
    // BUT, if it's new, we should wait.

    // We need to know if we created a new panel or reused one.
    // We can rely on the fact that `openEditorWithFile` checks `if (currentPanel)`.
    // Let's refactor slightly:
    // The `pendingFileToLoad` logic above is only for the NEW panel block.
    // If we reused the panel, it is presumably ready.
    await sendFileContentToWebview(currentPanel, fileName);
  }
}

async function collectMiniInfoPayload(): Promise<{
  namesLine: string;
  appIdsLine: string;
  missingTip: string;
}> {
  const minis = await getMiniProgramsFromMiniConfig();

  // 确保一一对应：按 minis 的顺序拼接，不做排序；名称缺失时用占位符补齐
  const names = minis.map(m => {
    const n = (m.name || '').trim();
    return n ? n : '(未填写名称)';
  });
  const appIds = minis.map(m => m.appId);

  // 文本框内仅保留信息本体（不带“xxx：”前缀）
  const namesLine = names.join(',');
  const appIdsLine = appIds.join(',');

  // 缺失主题配置提示：以 themeJsonName 对应的 json 文件是否存在为准
  const themeConfigPath = await getThemeConfigPath();
  const existingThemeNames = new Set<string>();
  if (themeConfigPath) {
    try {
      const files = await fs.readdir(themeConfigPath);
      for (const f of files) {
        if (f.endsWith('.json') && isValidFileName(f)) {
          existingThemeNames.add(f.replace(/\.json$/, ''));
        }
      }
    } catch {
      // ignore
    }
  }

  const missing: string[] = [];
  for (const m of minis) {
    const displayName = (m.name || m.appId).trim();
    const themeName = (m.themeJsonName || '').trim();

    if (!themeConfigPath) {
      // 没有 themeConfig 目录时，无法判断具体缺失；不强行提示全部缺失
      continue;
    }
    if (!themeName) {
      missing.push(displayName);
      continue;
    }
    if (!existingThemeNames.has(themeName)) {
      missing.push(displayName);
    }
  }

  const missingTip =
    missing.length > 0
      ? `提示：${missing.join('、')}小程序没有主题配置文件，请尽快补充。`
      : '';

  return { namesLine, appIdsLine, missingTip };
}

// Mini Info Panel Singleton
let currentMiniInfoPanel: vscode.WebviewPanel | undefined = undefined;

export async function openMiniInfoPanel(context: vscode.ExtensionContext) {
  if (currentMiniInfoPanel) {
    currentMiniInfoPanel.reveal(vscode.ViewColumn.One);
  } else {
    currentMiniInfoPanel = vscode.window.createWebviewPanel(
      'themeMiniInfo',
      '小程序信息',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    currentMiniInfoPanel.webview.html = getMiniInfoWebviewContent(
      context,
      currentMiniInfoPanel,
    );

    currentMiniInfoPanel.onDidDispose(
      () => {
        currentMiniInfoPanel = undefined;
      },
      null,
      context.subscriptions,
    );

    // Initial push
    await pushMiniInfo(currentMiniInfoPanel);

    currentMiniInfoPanel.webview.onDidReceiveMessage(
      async (message: { command?: string; text?: string }) => {
        if (!currentMiniInfoPanel) return;
        try {
          switch (message.command) {
            case 'requestMiniInfo':
              await pushMiniInfo(currentMiniInfoPanel!);
              break;
            case 'copyToClipboard':
              await vscode.env.clipboard.writeText(message.text || '');
              vscode.window.showInformationMessage('已复制到剪贴板');
              break;
            default:
              break;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          if (currentMiniInfoPanel) {
            currentMiniInfoPanel.webview.postMessage({
              command: 'error',
              text: errorMsg,
            });
          }
        }
      },
      undefined,
      context.subscriptions,
    );
  }
}

async function pushMiniInfo(panel: vscode.WebviewPanel) {
  const payload = await collectMiniInfoPayload();
  panel.webview.postMessage({ command: 'miniInfo', ...payload });
}

/**
 * 激活扩展
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('品牌小程序助手 is now active!');

  // 注册树视图
  treeDataProvider = new ThemeConfigTreeProvider();
  const treeView = vscode.window.createTreeView('themeConfigExplorer', {
    treeDataProvider,
  });
  context.subscriptions.push(treeView);

  // 注册命令：打开编辑器
  const openEditorCommand = vscode.commands.registerCommand(
    'themeConfigEditor.open',
    () => openEditorWithFile(context),
  );

  const openMiniInfoCommand = vscode.commands.registerCommand(
    'themeConfigEditor.openMiniInfo',
    () => openMiniInfoPanel(context),
  );

  // 注册命令：刷新树
  const refreshCommand = vscode.commands.registerCommand(
    'themeConfigEditor.refreshTree',
    () => {
      treeDataProvider?.refresh();
    },
  );

  // 注册命令：创建新文件
  const createFileCommand = vscode.commands.registerCommand(
    'themeConfigEditor.createFile',
    async () => {
      const baseName = await vscode.window.showInputBox({
        prompt: '输入新配置文件名称（无需输入 .json）',
        placeHolder: '例如: brand_x',
        validateInput: value => {
          const trimmed = (value || '').trim();
          if (!trimmed) {
            return '文件名不能为空';
          }

          const normalizedFileName = trimmed.endsWith('.json')
            ? trimmed
            : `${trimmed}.json`;
          if (!isValidFileName(normalizedFileName)) {
            return '文件名不合法（仅允许字母、数字、下划线、连字符）';
          }
          return null;
        },
      });

      if (!baseName) {
        return;
      }

      const normalizedFileName = baseName.trim().endsWith('.json')
        ? baseName.trim()
        : `${baseName.trim()}.json`;

      try {
        // 仅打开“草稿”编辑器：不在此处落盘创建文件。
        // 文件会在 Webview 内点击保存后，通过 createFile 消息真正写入。
        await openEditorWithFile(context, normalizedFileName);
        vscode.window.showInformationMessage(
          '已打开新配置草稿：点击“保存”后才会生成文件',
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to create file: ${errorMsg}`);
      }
    },
  );

  // 注册命令：打开文件
  const openFileCommand = vscode.commands.registerCommand(
    'themeConfigEditor.openFile',
    async (arg?: unknown) => {
      // TreeItem.command.arguments 里传的是 fileName 字符串
      if (typeof arg === 'string' && arg) {
        await openEditorWithFile(context, arg);
        return;
      }
      // 兼容可能的 TreeItem 结构
      const anyArg = arg as { fileName?: string } | undefined;
      if (anyArg?.fileName) {
        await openEditorWithFile(context, anyArg.fileName);
      }
    },
  );

  // 注册命令：删除文件
  const deleteFileCommand = vscode.commands.registerCommand(
    'themeConfigEditor.deleteFile',
    async (arg?: unknown) => {
      const fileName =
        typeof arg === 'string'
          ? arg
          : (arg as { fileName?: string } | undefined)?.fileName;

      if (!fileName) {
        return;
      }

      const confirmed = await vscode.window.showWarningMessage(
        `确认删除 ${fileName} ?`,
        { modal: true },
        '删除',
      );

      if (confirmed !== '删除') {
        return;
      }

      try {
        await deleteFile(fileName);
        treeDataProvider?.refresh();
        vscode.window.showInformationMessage(`Deleted ${fileName}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to delete file: ${errorMsg}`);
      }
    },
  );

  context.subscriptions.push(
    openEditorCommand,
    openMiniInfoCommand,
    refreshCommand,
    createFileCommand,
    openFileCommand,
    deleteFileCommand,
  );
}

/**
 * 停用扩展
 */
export function deactivate() {
  console.log('品牌小程序助手 is now deactivated.');
}
