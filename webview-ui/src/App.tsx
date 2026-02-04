import { useEffect, useState, useCallback } from "react";
import styles from "./App.module.css";
import { vscode } from "./utils/vscode";
import type { ThemeConfig, WebviewMessage } from "./types.ts";
import { FileList } from "./components/FileList";
import { FileEditor } from "./components/FileEditor";
import { InputDialog } from "./components/InputDialog";

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<ThemeConfig>({});
  const [themeName, setThemeName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isDialogVisible, setIsDialogVisible] = useState(false);

  useEffect(() => {
    // Listen for messages from extension
    const removeListener = vscode.onMessage((message: WebviewMessage) => {
      switch (message.command) {
        case "fileList":
          if (message.files) setFiles(message.files);
          if (message.nameMap) setNameMap(message.nameMap);
          setError(null);
          break;
        case "fileContent":
          if (message.fileName && message.content) {
            setCurrentFile(message.fileName);
            setCurrentContent(message.content);
            setThemeName(message.themeName);
            setError(null);
          }
          break;
        case "error":
          setError(message.text || "Unknown error");
          break;
      }
    });

    // Request initial file list
    vscode.postMessage({ command: "getFiles" });
    vscode.postMessage({ command: "webviewReady" });

    return () => {
      removeListener();
    };
  }, []);

  const handleSelectFile = useCallback((fileName: string) => {
    vscode.postMessage({ command: "getFileContent", fileName });
  }, []);

  const handleSave = useCallback(() => {
    if (currentFile && currentContent) {
      vscode.postMessage({
        command: "saveFile",
        fileName: currentFile,
        content: currentContent,
      });
    }
  }, [currentFile, currentContent]);

  const handleCreateFile = useCallback((fileName: string) => {
    // 与“主题配置”入口右侧加号一致：这里只打开草稿，不落盘创建文件；
    // 真正创建与空值校验都在用户点击“保存”时发生（saveFile）。
    const normalized = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
    vscode.postMessage({ command: "getFileContent", fileName: normalized });
    setIsDialogVisible(false);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h3>主题配置文件</h3>
        <FileList
          files={files}
          nameMap={nameMap}
          activeFile={currentFile}
          onSelect={handleSelectFile}
        />
        <button
          onClick={() => setIsDialogVisible(true)}
          style={{
            width: "100%",
            marginTop: "15px",
            padding: "8px 16px",
            backgroundColor: "var(--vscode-button-background)",
            color: "var(--vscode-button-foreground)",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          + 新建配置
        </button>
      </div>
      <div className={styles.main}>
        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        )}
        <h2 id="currentFileName">{currentFile || "请选择一个文件"}</h2>
        {themeName && (
          <div
            style={{
              color: "var(--vscode-descriptionForeground)",
              fontSize: "14px",
              marginBottom: "15px",
            }}
          >
            主题: {themeName}
          </div>
        )}

        {currentFile && (
          <FileEditor
            fileName={currentFile}
            initialContent={currentContent}
            onChange={setCurrentContent}
            onSave={handleSave}
          />
        )}
      </div>

      {isDialogVisible && (
        <InputDialog
          onConfirm={handleCreateFile}
          onCancel={() => setIsDialogVisible(false)}
        />
      )}
    </div>
  );
}

export default App;
