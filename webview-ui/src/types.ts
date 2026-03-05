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
  tabbar?: any[];
  [key: string]: any;
}

export interface ValidationRule {
  key: string;
  type: "text" | "color" | "image" | "boolean" | "singleSelectWithCustomText" | "array";
  required?: boolean;
  customOptionValue?: number;
  schema?: ValidationRule[];
}

export interface WebviewMessage {
  command: string;
  fileName?: string;
  files?: string[];
  nameMap?: Record<string, string>;
  content?: ThemeConfig;
  themeName?: string;
  text?: string;
  namesLine?: string;
  appIdsLine?: string;
  missingTip?: string;
  validationRules?: ValidationRule[];
}

export interface WebviewState {
  view: "list" | "editor";
  currentFile: string | null;
  files: string[];
  nameMap: Record<string, string>;
  content: ThemeConfig;
  themeName?: string;
}
