import type { WebviewApi } from "vscode-webview";
import type { WebviewMessage } from "../types";

// Define the global types for our specific window extensions
declare global {
  interface Window {
    vscodeConfig: {
      imageUploadUrl: string | "";
    };
    vscodeInitialView?: "editor" | "miniInfo";
    acquireVsCodeApi: <T = unknown>() => WebviewApi<T>;
  }
}

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // Check if running in VS Code Webview
    if (typeof window.acquireVsCodeApi === "function") {
      this.vsCodeApi = window.acquireVsCodeApi();
    }
  }

  /**
   * Post a message to the extension
   */
  public postMessage(message: any) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log("Mock postMessage:", message);
      this.handleMockMessage(message);
    }
  }

  /**
   * Add a listener for messages from the extension
   */
  public onMessage(callback: (message: WebviewMessage) => void) {
    const listener = (event: MessageEvent) => {
      callback(event.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }

  /**
   * Get the global config injected by index.html
   */
  public getConfig() {
    return window.vscodeConfig || { imageUploadUrl: "" };
  }

  private handleMockMessage(message: any) {
    // Simulate delay
    setTimeout(() => {
      switch (message.command) {
        case "getFiles":
          this.dispatch({
            command: "fileList",
            files: ["brand_a.json", "brand_b.json"],
            nameMap: {
              "brand_a.json": "Brand A (Mock)",
              "brand_b.json": "Brand B (Mock)",
            },
          });
          break;

        case "webviewReady":
          // No-op for mock, but we could trigger an initial load if we had tracking
          break;

        case "getFileContent":
          const fileName = message.fileName;
          this.dispatch({
            command: "fileContent",
            fileName: fileName,
            content: {
              appId: "wx1234567890abcdef",
              brandCode: "BRAND_CODE_MOCK",
              themeColor: "#FF0000",
              tabbar: [
                { pagePath: "pages/home/index", text: "首页", hidden: false },
                { pagePath: "pages/mine/index", text: "我的", hidden: false },
              ],
              memberCard: true,
            },
            themeName:
              fileName === "brand_a.json" ? "Brand A (Mock)" : "Brand B (Mock)",
          });
          break;

        case "saveFile":
          console.log("Mock Save:", message.fileName, message.content);
          // Simulate strict empty check validaton locally if needed, or just success
          this.dispatch({
            command: "fileList", // Refresh list
            files: ["brand_a.json", "brand_b.json"],
            nameMap: {
              "brand_a.json": "Brand A (Mock)",
              "brand_b.json": "Brand B (Mock)",
            },
          });
          break;

        case "createFile":
          console.log("Mock Create:", message.fileName, message.content);
          this.dispatch({
            command: "fileList",
            files: ["brand_a.json", "brand_b.json", message.fileName],
            nameMap: {
              "brand_a.json": "Brand A (Mock)",
              "brand_b.json": "Brand B (Mock)",
            },
          });
          break;

        case "requestMiniInfo":
          this.dispatch({
            command: "miniInfo",
            namesLine: "Mini Program A, Mini Program B",
            appIdsLine: "wx123, wx456",
            missingTip: "提示：Mini Program C没有主题配置文件",
          });
          break;

        case "copyToClipboard":
          console.log("Mock Copy to Clipboard:", message.text);
          break;
      }
    }, 100);
  }

  private dispatch(message: WebviewMessage) {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: message,
      }),
    );
  }
}

export const vscode = new VSCodeAPIWrapper();
