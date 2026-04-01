# 品牌小程序助手

一个用于可视化编辑主题配置 JSON 文件、并查看小程序信息的 VS Code 扩展。

## 功能特性

- 📝 可视化编辑主题配置文件
- 🎨 支持颜色选择器
- 🖼️ 支持图片上传和预览
- 📋 支持数组字段的增删操作
- ✅ 实时预览配置效果

## 使用方法

1. 打开任意 JSON 文件
2. 通过命令面板执行 `打开品牌小程序助手` 命令
3. 在可视化界面中编辑配置
4. 点击保存按钮应用更改

## Schema 配置

推荐将 schema 写在项目根目录的 `.brand-mini-program-assistant.config.json` 中，并提交到仓库。

- 这样字段定义、默认值、数组子项结构都由项目自己维护，团队成员共享同一份约束
- 如果项目不想使用默认文件名，可以通过 VS Code 配置 `themeConfigEditor.schemaConfigPath` 指向其他相对路径或绝对路径
- 可参考示例文件：`.brand-mini-program-assistant.config.example.json`

`type` 当前支持：

- `text`
- `color`
- `image`
- `boolean`
- `singleSelectWithCustomText`
- `array`

## 支持的字段类型

- 文本字段
- 颜色字段（带颜色选择器）
- 图片字段（支持 URL 输入和本地上传）
- 数组字段（如 TabBar 配置）

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
npm run package
```

## 打包说明

本扩展支持离线安装，生成 `.vsix` 文件后可在无网络环境下安装。

## License

MIT
