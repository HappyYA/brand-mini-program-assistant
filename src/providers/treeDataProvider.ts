import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { getThemeConfigPath, getMiniConfigMapping } from '../utils/config';
import { isValidFileName } from '../utils/validators';

/**
 * 树节点项
 */
export class ThemeConfigTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fileName?: string,
    public readonly themeName?: string,
  ) {
    super(label, collapsibleState);

    if (fileName) {
      this.contextValue = 'themeFile';
      this.tooltip = themeName ? `${fileName} - ${themeName}` : fileName;
      this.description = themeName;
      this.command = {
        command: 'themeConfigEditor.openFile',
        title: '打开配置文件',
        arguments: [fileName],
      };
      this.iconPath = new vscode.ThemeIcon('file-code');
    } else {
      if (label === '主题配置') {
        this.contextValue = 'themeGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
        return;
      }

      if (label === '小程序信息') {
        this.contextValue = 'miniInfo';
        this.tooltip = '展示 scripts/miniConfig.js 中的小程序名称与 appid 信息';
        this.command = {
          command: 'themeConfigEditor.openMiniInfo',
          title: '打开小程序信息',
        };
        this.iconPath = new vscode.ThemeIcon('info');
        return;
      }

      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

/**
 * 树数据提供器
 */
export class ThemeConfigTreeProvider implements vscode.TreeDataProvider<ThemeConfigTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    ThemeConfigTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ThemeConfigTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ThemeConfigTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ThemeConfigTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: ThemeConfigTreeItem,
  ): Promise<ThemeConfigTreeItem[]> {
    if (!element) {
      // 根节点：只展示分组节点
      return this.getRootGroups();
    }

    // 分组节点：展开后展示文件列表
    if (element.label === '主题配置' && !element.fileName) {
      return this.getThemeConfigItems();
    }

    return [];
  }

  private async getRootGroups(): Promise<ThemeConfigTreeItem[]> {
    const themeConfigPath = await getThemeConfigPath();
    if (!themeConfigPath) {
      // 即使没有 themeConfig 目录，也允许打开“小程序信息”
      return [
        new ThemeConfigTreeItem(
          '主题配置',
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
        new ThemeConfigTreeItem(
          '小程序信息',
          vscode.TreeItemCollapsibleState.None,
        ),
        new ThemeConfigTreeItem(
          '未找到 scripts/themeConfig 目录',
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    return [
      new ThemeConfigTreeItem(
        '主题配置',
        vscode.TreeItemCollapsibleState.Collapsed,
      ),
      new ThemeConfigTreeItem(
        '小程序信息',
        vscode.TreeItemCollapsibleState.None,
      ),
    ];
  }

  private async getThemeConfigItems(): Promise<ThemeConfigTreeItem[]> {
    const items: ThemeConfigTreeItem[] = [];

    try {
      const themeConfigPath = await getThemeConfigPath();
      if (!themeConfigPath) {
        return [
          new ThemeConfigTreeItem(
            '未找到 scripts/themeConfig 目录',
            vscode.TreeItemCollapsibleState.None,
          ),
        ];
      }

      const files = await fs.readdir(themeConfigPath);
      const jsonFiles = files.filter(
        file => file.endsWith('.json') && isValidFileName(file),
      );

      if (jsonFiles.length === 0) {
        return [
          new ThemeConfigTreeItem(
            '暂无配置文件',
            vscode.TreeItemCollapsibleState.None,
          ),
        ];
      }

      const miniConfigMapping = await getMiniConfigMapping();
      for (const file of jsonFiles) {
        const themeJsonName = file.replace('.json', '');
        const themeName = miniConfigMapping.get(themeJsonName);
        items.push(
          new ThemeConfigTreeItem(
            file,
            vscode.TreeItemCollapsibleState.None,
            file,
            themeName,
          ),
        );
      }
    } catch (error) {
      console.error('加载主题配置文件失败:', error);
      return [
        new ThemeConfigTreeItem(
          '加载失败',
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    return items;
  }
}
