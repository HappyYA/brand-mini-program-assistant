import React, { useRef, useState } from 'react';
import styles from './FileEditor.module.css';
import { vscode } from '../../utils/vscode';

interface FieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'color' | 'image' | 'boolean';
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to upload image (using the global config which injects the URL)
  const handleUpload = async (file: File) => {
    const config = vscode.getConfig();
    if (!config.imageUploadUrl) {
      // In a real scenario, we might want to communicate this error better to the parent
      vscode.postMessage({
        command: 'showErrorMessage',
        text: '未配置图片上传接口地址，请在 VS Code 设置中配置: themeConfigEditor.imageUploadUrl',
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(config.imageUploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.message || '上传失败');
      }

      // Check if data is string or object with url
      const url =
        typeof result.data === 'string' ? result.data : result.data.url;
      onChange(url);
    } catch (error) {
      console.error('Upload failed:', error);
      vscode.postMessage({
        command: 'showErrorMessage',
        text:
          '上传图片失败: ' +
          (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (type === 'boolean') {
    return (
      <div className={styles.group}>
        <label className={styles.label}>
          {label}
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            style={{ marginLeft: '10px', verticalAlign: 'middle' }}
          />
        </label>
      </div>
    );
  }

  if (type === 'color') {
    return (
      <div className={styles.group}>
        <label className={styles.label}>{label}</label>
        <div className={styles.colorWrapper}>
          <input
            type="text"
            className={styles.input}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
          <input
            type="color"
            className={styles.colorInput}
            value={value || '#000000'}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={styles.group}>
        <label className={styles.label}>{label}</label>
        <div className={styles.imageWrapper}>
          <div className={styles.imageRow}>
            <input
              type="text"
              className={styles.input}
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder="输入图片地址或上传"
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={e => {
                if (e.target.files?.[0]) {
                  handleUpload(e.target.files[0]);
                  e.target.value = ''; // Reset
                }
              }}
            />
            <button
              className={styles.uploadBtn}
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}>
              {isUploading ? '上传中...' : '上传'}
            </button>
          </div>
          {value && (
            <img src={value} alt="Preview" className={styles.preview} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.group}>
      <label className={styles.label}>{label}</label>
      <input
        type="text"
        className={styles.input}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
};
