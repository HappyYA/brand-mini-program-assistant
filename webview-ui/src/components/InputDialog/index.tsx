import { useState, useRef, useEffect } from "react";
import styles from "./InputDialog.module.css";

interface InputDialogProps {
  onConfirm: (fileName: string) => void;
  onCancel: () => void;
}

export const InputDialog: React.FC<InputDialogProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = () => {
    const fileName = value.trim();
    if (!fileName) {
      setError("文件名不能为空");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(fileName)) {
      setError("文件名不合法：仅允许字母、数字、连字符、下划线。");
      return;
    }
    onConfirm(fileName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h3>新建主题配置</h3>
        <p>请输入文件名（仅允许：字母、数字、连字符、下划线）</p>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="例如：brand_x"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.buttons}>
          <button className={styles.secondary} onClick={onCancel}>
            取消
          </button>
          <button onClick={handleConfirm}>创建</button>
        </div>
      </div>
    </div>
  );
};
