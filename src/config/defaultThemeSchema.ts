import type { SchemaField } from '../types';

export const DEFAULT_THEME_SCHEMA: SchemaField[] = [
  { key: 'appId', label: '小程序App ID', type: 'text', required: true },
  { key: 'brandCode', label: 'Brand Code', type: 'text', required: true },
  { key: 'groupCode', label: 'Group Code', type: 'text', required: true },
  { key: 'themeColor', label: '主题颜色', type: 'color', required: true },
  {
    key: 'homeBackgroundImage',
    label: '首页背景图片',
    type: 'image',
    required: true,
  },
  {
    key: 'homeBackgroundImageMini',
    label: '首页背景图片(小图)',
    type: 'image',
    required: true,
  },
  {
    key: 'homeBackgroundColor',
    label: '首页背景颜色',
    type: 'color',
    required: true,
  },
  {
    key: 'myHeaderBg',
    label: '我的页面背景图片',
    type: 'image',
    required: true,
  },
  {
    key: 'myHeaderTextColor',
    label: '头像右侧文字正常颜色',
    type: 'color',
    required: true,
  },
  {
    key: 'myHeaderTextGrayColor',
    label: '头像右侧文字浅颜色',
    type: 'text',
    required: true,
  },
  { key: 'defaultAvatar', label: '默认头像图片', type: 'image', required: true },
  { key: 'realNameAuthBg', label: '实名认证背景图', type: 'image', required: true },
  { key: 'memberCard', label: '付费会员开关', type: 'boolean', required: true },
  {
    key: 'memberCardGradientBg',
    label:
      '付费会员梯度按钮背景色（示例：linear-gradient(90deg, #FFF6E2 0%, #FFFBF1 100%)）',
    type: 'text',
    required: false,
  },
  {
    key: 'memberCardTimerBg',
    label: '付费会员身份验证倒计时背景',
    type: 'image',
    required: false,
  },
  {
    key: 'cancelAccountTextType',
    label: '注销账号文案类型',
    type: 'singleSelectWithCustomText',
    required: true,
    options: [
      { value: 1, label: '显示资产' },
      { value: 2, label: '不显示资产' },
      { value: 3, label: '自定义' },
    ],
    defaultValue: { type: 1, text: '' },
    customOptionValue: 3,
    customTextPlaceholder: '请输入自定义文案',
  },
  {
    key: 'cancelAccountWay',
    label: '注销账号方式',
    type: 'singleSelectWithCustomText',
    required: true,
    options: [
      { value: 1, label: '自主注销' },
      { value: 2, label: '电话注销' },
    ],
    defaultValue: { type: 1, text: '' },
    customOptionValue: 2,
    customTextPlaceholder: '请输入品牌电话号码',
  },
  {
    key: 'tabbar',
    label: '底部导航栏配置',
    type: 'array',
    required: true,
    defaultValue: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        hidden: false,
      },
      {
        pagePath: 'pages/allOrder/index',
        text: '订单',
        hidden: false,
      },
      {
        pagePath: 'pages/memberCard/index',
        text: '付费会员',
        hidden: true,
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        hidden: false,
      },
    ],
    schema: [
      { key: 'pagePath', label: '页面路径', type: 'text', required: true },
      { key: 'text', label: '底部导航栏文字', type: 'text', required: true },
      { key: 'hidden', label: '是否隐藏显示', type: 'boolean', required: true },
    ],
  },
];
