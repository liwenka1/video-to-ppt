# Video to PPT

一个基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具，支持屏幕录制、本地视频处理和在线视频分析。

## ✨ 功能特性

### 📹 视频处理能力
- **屏幕录制**: 实时屏幕录制，支持系统音频和麦克风
- **本地视频分析**: 上传本地视频文件进行智能分析
- **在线视频处理**: 支持 YouTube、Bilibili、Vimeo 等平台链接
- **智能帧提取**: 基于差异检测算法自动提取关键帧
- **动态阈值计算**: 自适应视频内容计算最佳差异阈值

### 🎯 核心技术栈
- **WebAV**: 使用最新的 WebCodecs 技术进行高性能视频处理
- **FFmpeg.wasm**: 视频格式转换和编码处理
- **Next.js 15**: 现代化的 React 框架
- **TypeScript**: 类型安全的开发体验
- **Tailwind CSS v4**: 现代化的样式设计
- **Shadcn/ui**: 高质量的 UI 组件库

### 🚀 高级功能
- **实时截图**: 录制过程中自动截图和差异检测
- **智能分析**: WebAV 驱动的视频内容分析
- **PPT 生成**: 一键导出为 PowerPoint 演示文稿
- **进度跟踪**: 实时显示处理进度和状态
- **响应式设计**: 适配各种设备和屏幕尺寸

## 🛠️ 技术改进

### 从原版 video2ppt 的改进

1. **现代化架构**
   - 从纯 JavaScript 迁移到 TypeScript + Next.js
   - 使用 WebAV 替代传统视频处理方式
   - 保持 FFmpeg 用于格式转换

2. **用户体验优化**
   - nvg8.io 风格的现代化 UI 设计
   - 深色主题与渐变背景
   - 流畅的动画和交互反馈
   - 玻璃态效果和现代排版

3. **性能提升**
   - WebCodecs 技术提供更高性能
   - 客户端处理保护隐私
   - 智能算法减少冗余帧
   - 动态阈值提高准确性

4. **功能增强**
   - 三种视频来源支持
   - 实时预览和进度显示
   - 错误处理和状态管理
   - 批量处理能力

## 📦 安装使用

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm
- 现代浏览器 (Chrome 102+)

### 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 浏览器兼容性

由于使用了 WebCodecs 和 SharedArrayBuffer，需要现代浏览器支持：
- Chrome 102+
- Edge 102+
- 需要 HTTPS 环境（本地开发除外）

## 🏗️ 项目结构

```
video-to-ppt/
├── app/                      # Next.js App Router
│   ├── (site)/              # 站点页面
│   │   ├── screen-recording/ # 屏幕录制页面
│   │   ├── local-video/     # 本地视频页面
│   │   ├── online-video/    # 在线视频页面
│   │   └── page.tsx         # 首页
│   ├── globals.css          # 全局样式（已废弃）
│   └── layout.tsx           # 应用布局
├── components/              # 可复用组件
│   └── ui/                  # Shadcn/ui 组件
├── lib/                     # 核心逻辑
│   ├── video-processing.ts  # 视频处理核心
│   ├── ppt-generation.ts    # PPT 生成逻辑
│   └── utils.ts            # 工具函数
├── styles/                  # 样式文件
│   └── globals.css         # 全局样式
├── public/                  # 静态资源
├── next.config.ts          # Next.js 配置
├── package.json            # 项目配置
└── README.md              # 项目文档
```

## 🔧 核心算法

### 智能差异检测

```typescript
// 计算帧间差异
function calculateImageDifference(imgData1: ImageData, imgData2: ImageData): number {
  let sumOfSquares = 0;
  const length = imgData1.data.length;

  for (let i = 0; i < length; i += 4) {
    // 转换为亮度值
    const luminance1 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const luminance2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    
    const diff = luminance1 - luminance2;
    sumOfSquares += diff * diff;
  }

  return Math.sqrt(sumOfSquares / (length / 4));
}
```

### 动态阈值计算

```typescript
// 预处理计算最佳阈值
async function preprocessVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<number> {
  // 采样视频帧
  const sampleCount = Math.min(50, Math.max(20, Math.floor(duration / 10)));
  
  // 计算差异度分布
  const differences: number[] = [];
  
  // 使用中位数作为基准阈值
  const medianDiff = sortedDifferences[Math.floor(differences.length / 2)];
  
  // 设置合理边界
  return Math.max(10, Math.min(medianDiff, 60));
}
```

## 🎨 UI 设计特色

### nvg8.io 风格设计
- **深色主题**: 专业的深色配色方案
- **渐变背景**: 蓝色/紫色/青色渐变
- **玻璃态效果**: backdrop-blur 和半透明元素
- **现代动画**: 流畅的过渡和反馈动画
- **响应式布局**: 适配桌面和移动设备

### 组件设计原则
- **功能优先**: 清晰的视觉层次
- **状态反馈**: 实时的处理状态显示
- **错误处理**: 友好的错误提示界面
- **可访问性**: 支持键盘导航和屏幕阅读器

## 🚨 故障排除

### 常见问题

1. **FFmpeg 导入错误**
   ```
   Module not found: Can't resolve <dynamic>
   ```
   **解决方案**: 已在 `next.config.ts` 中配置 webpack 解决

2. **WebAV 类型错误**
   ```
   Cannot find module '@webav/av-cliper'
   ```
   **解决方案**: 确保安装了正确版本的 WebAV 包

3. **SharedArrayBuffer 错误**
   ```
   SharedArrayBuffer is not defined
   ```
   **解决方案**: 已配置正确的 CORS 头部支持

### 开发环境设置

确保浏览器支持以下特性：
- WebCodecs API
- SharedArrayBuffer
- 屏幕共享 API
- Web Workers

## 🤝 贡献指南

### 开发工作流

1. Fork 项目仓库
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 提交 Pull Request

### 代码规范

项目使用以下工具确保代码质量：
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查
- **Tailwind CSS**: 样式规范

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 原始 video2ppt 项目提供的核心算法灵感
- WebAV 团队提供的强大视频处理能力
- FFmpeg.wasm 社区的 WebAssembly 移植工作
- Shadcn/ui 提供的优秀组件库

---

**注意**: 本项目需要现代浏览器支持，建议使用 Chrome 102+ 或 Edge 102+ 获得最佳体验。
