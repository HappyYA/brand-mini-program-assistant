import * as vscode from "vscode";
import * as path from "path";
import { promises as fs, existsSync } from "fs";
import { ThemeConfig, WebviewMessage } from "../types";
import {
  getThemeConfigPath,
  getMiniConfigMapping,
  getThemeSchemaConfig,
} from "../utils/config";
import { isValidFileName } from "../utils/validators";

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getDefaultThemeConfig(): Promise<ThemeConfig> {
  const schemaConfig = await getThemeSchemaConfig();
  return schemaConfig.reduce<ThemeConfig>((result, field) => {
    if (field.defaultValue !== undefined) {
      result[field.key] = cloneValue(field.defaultValue);
    }
    return result;
  }, {});
}

async function applyDefaultsForNewFile(content: ThemeConfig): Promise<ThemeConfig> {
  const schemaConfig = await getThemeSchemaConfig();
  const merged = { ...content };

  for (const field of schemaConfig) {
    if (
      merged[field.key] === undefined &&
      field.defaultValue !== undefined
    ) {
      merged[field.key] = cloneValue(field.defaultValue);
    }
  }

  return merged;
}

/**
 * 发送文件列表到 Webview
 */
export async function sendFilesToWebview(panel: vscode.WebviewPanel) {
  const dirPath = await getThemeConfigPath();
  if (!dirPath) {
    panel.webview.postMessage({
      command: "error",
      text: "scripts/themeConfig folder not found in workspace",
    });
    return;
  }

  try {
    const allFiles = await fs.readdir(dirPath);
    const jsonFiles = allFiles.filter(
      (file) => file.endsWith(".json") && isValidFileName(file),
    );

    const miniConfigMapping = await getMiniConfigMapping();
    const nameMap: Record<string, string> = {};
    for (const file of jsonFiles) {
      const themeJsonName = file.replace(/\.json$/i, "");
      const themeName = miniConfigMapping.get(themeJsonName);
      if (themeName) {
        nameMap[file] = themeName;
      }
    }

    panel.webview.postMessage({
      command: "fileList",
      files: jsonFiles,
      nameMap,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("读取主题配置目录失败:", err);
    panel.webview.postMessage({
      command: "error",
      text: `Failed to read directory: ${errorMsg}`,
    });
  }
}

/**
 * 发送文件内容到 Webview
 */
export async function sendFileContentToWebview(
  panel: vscode.WebviewPanel,
  fileName: string,
) {
  const dirPath = await getThemeConfigPath();
  if (!dirPath) {
    panel.webview.postMessage({
      command: "error",
      text: "主题配置目录不存在",
    });
    return;
  }

  const filePath = path.join(dirPath, fileName);
  // 确保文件路径在允许的目录内
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(dirPath)) {
    panel.webview.postMessage({ command: "error", text: "Invalid file path" });
    return;
  }

  try {
    const schemaConfig = await getThemeSchemaConfig();
    if (existsSync(filePath)) {
      const content = await fs.readFile(filePath, "utf-8");
      try {
        const parsed = JSON.parse(content);

        // 获取主题名称映射
        const miniConfigMapping = await getMiniConfigMapping();
        const themeJsonName = fileName.replace(".json", "");
        const themeName = miniConfigMapping.get(themeJsonName);

        console.log(
          `Loading file: ${fileName}, themeJsonName: ${themeJsonName}, themeName: ${themeName}`,
        );

        panel.webview.postMessage({
          command: "fileContent",
          fileName,
          content: parsed,
          themeName: themeName || undefined,
          schemaConfig,
        });
      } catch (parseErr) {
        panel.webview.postMessage({
          command: "error",
          text: `Invalid JSON in ${fileName}`,
        });
      }
    } else {
      // New file template
      panel.webview.postMessage({
        command: "fileContent",
        fileName,
        content: await getDefaultThemeConfig(),
        schemaConfig,
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to read file ${fileName}:`, err);
    panel.webview.postMessage({
      command: "error",
      text: `Failed to read ${fileName}: ${errorMsg}`,
    });
  }
}

/**
 * 保存文件
 */
export async function saveFile(fileName: string, content: ThemeConfig) {
  const dirPath = await getThemeConfigPath();
  if (!dirPath) {
    throw new Error("主题配置目录不存在");
  }

  const filePath = path.join(dirPath, fileName);
  // 确保文件路径在允许的目录内
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(dirPath)) {
    throw new Error("Invalid file path");
  }

  try {
    const jsonContent = JSON.stringify(content, null, 2);
    await fs.writeFile(filePath, jsonContent, "utf-8");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to save file ${fileName}:`, err);
    throw new Error(`Failed to save file: ${errorMsg}`);
  }
}

/**
 * 创建文件
 */
export async function createFile(fileName: string, content: ThemeConfig) {
  await saveFile(fileName, await applyDefaultsForNewFile(content));
}

/**
 * 删除文件
 */
export async function deleteFile(fileName: string) {
  const dirPath = await getThemeConfigPath();
  if (!dirPath) {
    throw new Error("主题配置目录不存在");
  }
  if (!isValidFileName(fileName)) {
    throw new Error("Invalid file name");
  }

  const filePath = path.join(dirPath, fileName);
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(dirPath)) {
    throw new Error("Invalid file path");
  }

  try {
    if (!existsSync(filePath)) {
      return;
    }
    await fs.unlink(filePath);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to delete file ${fileName}:`, err);
    throw new Error(`Failed to delete file: ${errorMsg}`);
  }
}

/**
 * 获取 Webview 内容
 */
/**
 * Process HTML with common replacements (CSP, base, config)
 */
function processWebviewHtml(
  html: string,
  webviewRootUri: vscode.Uri,
  cspSource: string,
  initialView: "editor" | "miniInfo",
  configProvider?: {
    uploadUrl: string;
    connectSrc: string;
  },
): string {
  // Inject base href and initial view
  const baseTag = `<base href="${webviewRootUri}/">`;
  const viewScript = `<script>window.vscodeInitialView = '${initialView}';</script>`;
  html = html.replace("<head>", `<head>\n    ${baseTag}\n    ${viewScript}`);

  // Update CSP
  // Allow 'self', cspSource (vscode-webview-resource:), and https/data
  const extraCsp = `${cspSource} https: data:`;

  const cspKeys = ["script-src", "style-src", "img-src"];
  for (const key of cspKeys) {
    const extraVal = key === "script-src" ? "'unsafe-eval'" : "";
    html = html.replace(
      new RegExp(`${key} 'unsafe-inline' 'self'`, "g"),
      `${key} 'unsafe-inline' 'self' ${extraVal} ${extraCsp}`,
    );
    // Also handle img-src special case from previous regex?
    // The previous regex for img-src was /img-src https: http: data:/g
    // which is different from standard unsafe-inline self.
    // Let's stick to a map for clarity.
  }

  const replacements = [
    {
      pattern: /script-src 'unsafe-inline' 'self'/g,
      replacement: `script-src 'unsafe-inline' 'self' 'unsafe-eval' ${extraCsp}`,
    },
    {
      pattern: /style-src 'unsafe-inline' 'self'/g,
      replacement: `style-src 'unsafe-inline' 'self' ${extraCsp}`,
    },
    {
      pattern: /img-src https: http: data:/g,
      replacement: `img-src https: http: data: ${extraCsp}`,
    },
  ];

  for (const { pattern, replacement } of replacements) {
    html = html.replace(pattern, replacement);
  }

  // Remove crossorigin
  html = html.replace(/crossorigin/g, "");

  // Inject Config
  const uploadUrl = configProvider ? configProvider.uploadUrl : "";
  const connectSrc = configProvider ? configProvider.connectSrc : "'none'";

  html = html
    .replace(/__IMAGE_UPLOAD_URL_JSON__/g, JSON.stringify(uploadUrl))
    .replace(/__CONNECT_SRC__/g, connectSrc);

  return html;
}

/**
 * 获取 Webview 内容
 */
export function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
): string {
  const outHtmlPath = path.join(
    context.extensionPath,
    "out",
    "webview",
    "index.html",
  );

  try {
    if (!existsSync(outHtmlPath)) {
      console.error(`Webview HTML not found at ${outHtmlPath}`);
      return "<html><body><h1>Error loading webview: index.html not found</h1></body></html>";
    }
    let html = require("fs").readFileSync(outHtmlPath, "utf-8") as string;

    const webviewRoot = vscode.Uri.file(path.dirname(outHtmlPath));
    const webviewRootUri = panel.webview.asWebviewUri(webviewRoot);

    // Prepare Config
    const config = vscode.workspace.getConfiguration("themeConfigEditor");
    const uploadUrl = String(config.get("imageUploadUrl") || "").trim();
    const configuredConnectSrc = (config.get("webviewConnectSrc") ||
      []) as unknown;
    const connectSrcFromUser = Array.isArray(configuredConnectSrc)
      ? configuredConnectSrc
          .filter((v) => typeof v === "string")
          .map((v) => String(v).trim())
      : [];

    const sanitizeCspToken = (token: string) =>
      token && !/["';]/.test(token) ? token : "";

    const connectSrcSet = new Set<string>(
      connectSrcFromUser.map(sanitizeCspToken).filter(Boolean),
    );

    if (uploadUrl) {
      try {
        const origin = new URL(uploadUrl).origin;
        const sanitized = sanitizeCspToken(origin);
        if (sanitized) connectSrcSet.add(sanitized);
      } catch {
        // ignore
      }
    }

    const connectSrcValue =
      connectSrcSet.size > 0 ? Array.from(connectSrcSet).join(" ") : "'none'";

    return processWebviewHtml(
      html,
      webviewRootUri,
      panel.webview.cspSource,
      "editor",
      { uploadUrl, connectSrc: connectSrcValue },
    );
  } catch (error) {
    console.error("Failed to read webview HTML:", error);
    return "<html><body><h1>Error loading webview</h1></body></html>";
  }
}

/**
 * 获取“小程序信息” Webview 内容
 */
export function getMiniInfoWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
): string {
  const outHtmlPath = path.join(
    context.extensionPath,
    "out",
    "webview",
    "index.html",
  );

  try {
    if (!existsSync(outHtmlPath)) {
      console.error(`Webview HTML not found at ${outHtmlPath}`);
      return "<html><body><h1>Error loading webview: index.html not found</h1></body></html>";
    }
    let html = require("fs").readFileSync(outHtmlPath, "utf-8") as string;

    const webviewRoot = vscode.Uri.file(path.dirname(outHtmlPath));
    const webviewRootUri = panel.webview.asWebviewUri(webviewRoot);

    return processWebviewHtml(
      html,
      webviewRootUri,
      panel.webview.cspSource,
      "miniInfo",
    );
  } catch (error) {
    console.error("Failed to read miniInfo webview HTML:", error);
    return "<html><body><h1>Error loading mini info webview</h1></body></html>";
  }
}
