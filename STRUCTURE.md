# 项目结构说明

## 代码模块化重构

为了提高代码的可维护性和可扩展性，我们将原本的单文件 `extension.ts` (543行) 拆分为多个模块。

## 目录结构

```
src/
├── extension.ts                    # 主入口文件，负责激活扩展和注册命令
├── types/
│   └── index.ts                    # TypeScript 类型定义
├── utils/
│   ├── validators.ts               # 输入验证工具
│   └── config.ts                   # 配置和路径管理
├── providers/
│   └── treeDataProvider.ts         # 树视图数据提供器
└── webview/
    ├── index.html                  # Webview UI 界面
    └── webviewManager.ts           # Webview 管理和消息处理
```

## 模块说明

### 1. `types/index.ts` - 类型定义

定义了整个扩展使用的 TypeScript 接口：

- `ThemeConfig`: 主题配置对象
- `WebviewMessage`: Webview 消息格式
- `MiniConfigItem`: miniConfig.js 配置项
- `MiniConfig`: 完整的 miniConfig 映射

### 2. `utils/validators.ts` - 验证工具

文件名和输入验证：

- `isValidFileName()`: 验证文件名安全性，防止路径遍历攻击

### 3. `utils/config.ts` - 配置与路径管理

路径和配置相关工具：

- `getThemeConfigPath()`: 获取主题配置目录路径
- `getMiniConfigMapping()`: 读取并解析 miniConfig.js，返回主题名称映射

### 4. `providers/treeDataProvider.ts` - 树视图提供器

实现侧边栏树视图：

- `ThemeConfigTreeItem`: 树节点项类
- `ThemeConfigTreeProvider`: 树数据提供器，实现 VS Code TreeDataProvider 接口

补充说明（视图位置）：

- 本扩展的视图 `themeConfigExplorer` 贡献到 VS Code 内置的 `explorer` 容器中，因此会显示在「资源管理器(Explorer)」面板内。
- 如果未来希望显示在活动栏（和资源管理器同级的新图标面板），需要在 `package.json` 使用 `viewsContainers.activitybar` 创建自定义容器并将 view 挂载到该容器。

### 5. `webview/webviewManager.ts` - Webview 管理

管理 Webview 面板和文件操作：

- `sendFilesToWebview()`: 发送文件列表到 Webview
- `sendFileContentToWebview()`: 发送文件内容到 Webview
- `saveFile()`: 保存文件
- `createFile()`: 创建新文件
- `getWebviewContent()`: 获取 Webview HTML 内容

### 6. `extension.ts` - 主入口

扩展激活和命令注册：

- `activate()`: 激活扩展，注册命令和树视图
- `openEditorWithFile()`: 打开编辑器并处理 Webview 消息
- `deactivate()`: 停用扩展

补充说明（命令与激活）：

- 命令（`package.json -> contributes.commands`）：
  - `themeConfigEditor.open`: 打开可视化编辑器
  - `themeConfigEditor.openMiniInfo`: 打开小程序信息面板（读取 `scripts/miniConfig.js`）
  - `themeConfigEditor.openFile`: 从树视图打开指定 JSON
  - `themeConfigEditor.refreshTree`: 刷新树视图
  - `themeConfigEditor.createFile`: 新建配置（仅打开草稿；点击保存后才会落盘生成 JSON）
- 激活事件（`package.json -> activationEvents`）：
  - `onView:themeConfigExplorer`（打开资源管理器里的该视图时激活）
  - 以及上述命令对应的 `onCommand:*`

补充说明（Webview 消息协议）：

- Webview -> Extension：`getFiles` / `getFileContent` / `saveFile` / `createFile`
- Extension -> Webview：`fileList` / `fileContent` / `error`

小程序信息面板：

- Webview -> Extension：`requestMiniInfo` / `copyToClipboard`
- Extension -> Webview：`miniInfo` / `error`

## 优势

1. **关注点分离**: 每个模块负责特定功能，降低耦合度
2. **易于维护**: 代码分散到小文件，更容易定位和修改
3. **可测试性**: 独立的模块可以单独测试
4. **可扩展性**: 添加新功能时只需新增或修改相关模块
5. **代码复用**: 工具函数可以在多处复用

## 构建和运行

```bash
# 编译 TypeScript
npm run compile

# 监听模式（开发）
npm run watch

# 打包扩展
npm run package
```
