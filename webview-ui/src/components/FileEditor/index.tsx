import React, { useEffect, useState } from "react";
import styles from "./FileEditor.module.css";
import { Field } from "./Field";
import { ArrayField } from "./ArrayField";
import type { SchemaField, ThemeConfig, ValidationRule } from "../../types";

interface FileEditorProps {
  fileName: string;
  initialContent: ThemeConfig;
  schemaConfig: SchemaField[];
  onChange: (content: ThemeConfig) => void;
  onSave: (rules: ValidationRule[]) => void;
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  fileName,
  initialContent,
  schemaConfig,
  onChange,
  onSave,
}) => {
  const [content, setContent] = useState<ThemeConfig>(initialContent);
  const [dynamicKeys, setDynamicKeys] = useState<any[]>([]);

  useEffect(() => {
    const merged = { ...initialContent };
    let hasChanges = false;

    // Ensure all config keys exist
    schemaConfig.forEach((cfg) => {
      // @ts-ignore
      if (merged[cfg.key] === undefined || merged[cfg.key] === null) {
        if (cfg.defaultValue !== undefined) {
          // @ts-ignore
          merged[cfg.key] = cloneValue(cfg.defaultValue);
        } else if (cfg.type === "array") {
          // @ts-ignore
          merged[cfg.key] = [];
        } else if (cfg.type === "boolean") {
          // @ts-ignore
          merged[cfg.key] = false;
        } else if (cfg.type === "singleSelectWithCustomText") {
          // @ts-ignore
          merged[cfg.key] = cfg.defaultValue !== undefined
            ? cloneValue(cfg.defaultValue)
            : { type: 1, text: "" };
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
      if (!schemaConfig.find((cfg) => cfg.key === k)) {
        extraKeys.push({ key: k, label: k, type: "text" });
      }
    });
    setDynamicKeys(extraKeys);

    if (hasChanges) {
      onChange(merged);
    }
  }, [initialContent, fileName, onChange, schemaConfig]);

  const handleChange = (key: string, value: any) => {
    const newContent = { ...content, [key]: value };
    setContent(newContent);
    onChange(newContent);
  };

  const getValidationRules = (): ValidationRule[] => {
    return schemaConfig.map((field) => ({
      key: field.key,
      type: field.type,
      required: field.required ?? true,
      customOptionValue: field.customOptionValue,
      schema: field.schema?.map((subField: any) => ({
        key: subField.key,
        type: subField.type,
        required: subField.required ?? true,
      })),
    }));
  };

  return (
    <div style={{ paddingBottom: "90px" }}>
      <div id="formContainer">
        {schemaConfig.map((field) => {
          if (field.type === "array" && field.schema) {
            return (
              <ArrayField
                key={field.key}
                label={field.label}
                // @ts-ignore
                items={content[field.key] || []}
                schema={field.schema}
                onChange={(val) => handleChange(field.key, val)}
              />
            );
          }
          return (
            <Field
              key={field.key}
              label={field.label}
              type={field.type === "array" ? "text" : field.type}
              options={field.options}
              customOptionValue={field.customOptionValue}
              customTextPlaceholder={field.customTextPlaceholder}
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
          onClick={() => onSave(getValidationRules())}
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
