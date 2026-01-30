import { useEffect, useState } from "react";
import styles from "./MiniInfoApp.module.css";
import { vscode } from "./utils/vscode";
import type { WebviewMessage } from "./types";

function MiniInfoApp() {
  const [names, setNames] = useState("");
  const [appIds, setAppIds] = useState("");
  const [missingTip, setMissingTip] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const removeListener = vscode.onMessage((message: WebviewMessage) => {
      switch (message.command) {
        case "miniInfo":
          setError(null);
          setNames(message.namesLine || "");
          setAppIds(message.appIdsLine || "");
          setMissingTip(message.missingTip || "");
          break;
        case "error":
          setError(message.text || "Unknown error");
          break;
      }
    });

    // Request initial data
    vscode.postMessage({ command: "requestMiniInfo" });

    return () => {
      removeListener();
    };
  }, []);

  const handleRefresh = () => {
    vscode.postMessage({ command: "requestMiniInfo" });
  };

  const handleCopy = (text: string) => {
    vscode.postMessage({
      command: "copyToClipboard",
      text: text,
    });
  };

  return (
    <div className={styles.container}>
      <h2>小程序信息</h2>
      <div className={styles.desc}>
        从 <b>scripts/miniConfig.js</b>{" "}
        读取小程序信息，按相同顺序输出“小程序名称”和“小程序appid”，确保一一对应。
      </div>

      <div className={styles.toolbar}>
        <button onClick={handleRefresh} className={styles.secondary}>
          刷新
        </button>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <div className={styles.label}>小程序名称：</div>
          <textarea className={styles.textarea} value={names} readOnly />
          <button onClick={() => handleCopy(names)} className={styles.primary}>
            复制名称
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <div className={styles.label}>小程序appid：</div>
          <textarea className={styles.textarea} value={appIds} readOnly />
          <button onClick={() => handleCopy(appIds)} className={styles.primary}>
            复制appid
          </button>
        </div>
      </div>

      {missingTip && <div className={styles.warn}>{missingTip}</div>}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

export default MiniInfoApp;
