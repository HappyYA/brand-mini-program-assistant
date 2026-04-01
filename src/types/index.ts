/**
 * 主题配置类型定义
 */
export interface ThemeConfig {
  appId?: string;
  brandCode?: string;
  groupCode?: string;
  themeColor?: string;
  myHeaderBg?: string;
  myHeaderTextColor?: string;
  myHeaderTextGrayColor?: string;
  tabbarHomeBgColor?: string;
  memberCard?: boolean;
  [key: string]: any;
}

export type FieldType =
  | 'text'
  | 'color'
  | 'image'
  | 'boolean'
  | 'singleSelectWithCustomText'
  | 'array';

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  defaultValue?: any;
  customOptionValue?: string | number;
  customTextPlaceholder?: string;
  schema?: SchemaField[];
}

export interface ValidationRule {
  key: string;
  type: FieldType;
  required?: boolean;
  customOptionValue?: string | number;
  schema?: ValidationRule[];
}

/**
 * Webview 消息类型
 */
export interface WebviewMessage {
  command: string;
  fileName?: string;
  content?: ThemeConfig | string;
  text?: string;
  validationRules?: ValidationRule[];
  schemaConfig?: SchemaField[];
}

/**
 * MiniConfig 配置项
 */
export interface MiniConfigItem {
  name: string;
  themeJsonName: string;
  version?: string;
  changeLog?: string;
  imgKey?: string;
  feishuUrl?: string;
  robot?: number;
}

/**
 * MiniConfig 映射
 */
export interface MiniConfig {
  [appId: string]: MiniConfigItem;
}
