import React from "react";
import styles from "./FileEditor.module.css";
import { Field } from "./Field";
import type { SchemaField } from "../../types";

interface ArrayFieldProps {
  label: string;
  items: any[];
  schema: SchemaField[];
  onChange: (items: any[]) => void;
}

export const ArrayField: React.FC<ArrayFieldProps> = ({
  label,
  items = [],
  schema,
  onChange,
}) => {
  const handleAddItem = () => {
    // Create new item with empty/default values
    const newItem: any = {};
    schema.forEach((field) => {
      newItem[field.key] = field.type === "boolean" ? false : "";
    });
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleItemChange = (index: number, key: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    onChange(newItems);
  };

  return (
    <div className={styles.group}>
      <label className={styles.label}>{label}</label>
      <div className={styles.arrayContainer}>
        {items.map((item, index) => (
          <div key={index} className={styles.arrayItem}>
            <div className={styles.arrayItemHeader}>
              <span className={styles.arrayItemTitle}>#{index + 1}</span>
              <button
                className={styles.removeBtn}
                onClick={() => handleRemoveItem(index)}
              >
                Remove
              </button>
            </div>

            {schema.map((field) => (
              <div key={field.key} className={styles.arrayField}>
                <Field
                  label={field.label}
                  type={field.type === "array" ? "text" : field.type}
                  options={field.options}
                  customOptionValue={field.customOptionValue}
                  customTextPlaceholder={field.customTextPlaceholder}
                  value={item[field.key]}
                  onChange={(val) => handleItemChange(index, field.key, val)}
                />
              </div>
            ))}
          </div>
        ))}

        <button className={styles.addBtn} onClick={handleAddItem}>
          + Add Item
        </button>
      </div>
    </div>
  );
};
