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

/**
 * Webview 消息类型
 */
export interface WebviewMessage {
  command: string;
  fileName?: string;
  content?: ThemeConfig | string;
  text?: string;
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
