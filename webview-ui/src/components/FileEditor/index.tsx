import React, { useEffect, useState } from "react";
import styles from "./FileEditor.module.css";
import { Field } from "./Field";
import { ArrayField } from "./ArrayField";
import type { ThemeConfig } from "../../types";

interface FileEditorProps {
  fileName: string;
  initialContent: ThemeConfig;
  onChange: (content: ThemeConfig) => void;
  onSave: () => void;
}
// Default keys structure to know types
const KEYS_CONFIG = [
  { key: "appId", label: "App ID", type: "text" },
  { key: "brandCode", label: "Brand Code", type: "text" },
  { key: "groupCode", label: "Group Code", type: "text" },
  { key: "themeColor", label: "Theme Color", type: "color" },
  { key: "homeBg", label: "Home Bg", type: "image" },
  { key: "myHeaderBg", label: "My Header Bg", type: "image" },
  { key: "myHeaderTextColor", label: "My Header Text Color", type: "color" },
  {
    key: "myHeaderTextGrayColor",
    label: "My Header Text Gray Color",
    type: "text",
  },
  { key: "tabbarHomeBgColor", label: "Tabbar Home Bg Color", type: "color" },
  { key: "defaultAvatar", label: "Default Avatar", type: "image" },
  { key: "memberCard", label: "Member Card", type: "boolean" },
  {
    key: "tabbar",
    label: "TabBar Configuration",
    type: "array",
    schema: [
      { key: "pagePath", label: "Page Path", type: "text" },
      { key: "text", label: "Tab Text", type: "text" },
      { key: "hidden", label: "Hidden", type: "boolean" },
    ],
  },
] as const;

export const FileEditor: React.FC<FileEditorProps> = ({
  fileName,
  initialContent,
  onChange,
  onSave,
}) => {
  const [content, setContent] = useState<ThemeConfig>(initialContent);
  const [dynamicKeys, setDynamicKeys] = useState<any[]>([]);

  useEffect(() => {
    const merged = { ...initialContent };
    let hasChanges = false;

    // Ensure all config keys exist
    KEYS_CONFIG.forEach((cfg) => {
      // @ts-ignore
      if (merged[cfg.key] === undefined || merged[cfg.key] === null) {
        if (cfg.type === "array") {
          // @ts-ignore
          merged[cfg.key] = [];
        } else if (cfg.type === "boolean") {
          // @ts-ignore
          merged[cfg.key] = false;
        } else {
          // @ts-ignore
          merged[cfg.key] = "";
        }
        hasChanges = true;
      }
    });

    setContent(merged);

    // Identify extra keys that are not in KEYS_CONFIG
    const extraKeys: any[] = [];
    Object.keys(merged).forEach((k) => {
      // @ts-ignore
      if (!KEYS_CONFIG.find((cfg) => cfg.key === k)) {
        extraKeys.push({ key: k, label: k, type: "text" });
      }
    });
    setDynamicKeys(extraKeys);

    if (hasChanges) {
      onChange(merged);
    }
  }, [initialContent, fileName]);

  const handleChange = (key: string, value: any) => {
    const newContent = { ...content, [key]: value };
    setContent(newContent);
    onChange(newContent);
  };

  return (
    <div style={{ paddingBottom: "90px" }}>
      <div id="formContainer">
        {KEYS_CONFIG.map((field) => {
          if (field.type === "array" && field.schema) {
            return (
              <ArrayField
                key={field.key}
                label={field.label}
                // @ts-ignore
                items={content[field.key] || []}
                // @ts-ignore
                schema={field.schema}
                onChange={(val) => handleChange(field.key, val)}
              />
            );
          }
          return (
            <Field
              key={field.key}
              label={field.label}
              // @ts-ignore
              type={field.type}
              value={content[field.key]}
              onChange={(val) => handleChange(field.key, val)}
            />
          );
        })}

        {/* Dynamic keys (unknown fields) */}
        {dynamicKeys.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            type="text"
            value={content[field.key]}
            onChange={(val) => handleChange(field.key, val)}
          />
        ))}
      </div>

      <div
        className={styles.editorFooter}
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: "30px",
          padding: "16px 0",
          borderTop: "1px solid var(--vscode-panel-border)",
          background: "var(--vscode-editor-background)",
          zIndex: 10,
        }}
      >
        <button
          onClick={onSave}
          style={{
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
          保存
        </button>
      </div>
    </div>
  );
};
