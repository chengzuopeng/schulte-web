# 开发环境指南

## 🚀 本地开发

### 快速开始
```bash
# 纯前端开发（推荐）
npm run dev

# 完整环境开发（包含Worker）
npm run dev:full
```

### 开发模式说明

#### **1. 纯前端开发模式 (`npm run dev`)**
- ✅ **启动快速**：只启动Vite开发服务器
- ✅ **热更新**：代码修改即时生效
- ✅ **无Worker依赖**：不需要启动Cloudflare Worker
- ✅ **Service Worker禁用**：避免开发时的缓存干扰
- ⚠️ **API请求**：会通过代理转发到Worker（如果启动）

#### **2. 完整环境开发模式 (`npm run dev:full`)**
- ✅ **完整功能**：包含所有生产环境功能
- ✅ **Service Worker**：正常注册和缓存
- ✅ **Worker集成**：需要额外启动Worker
- ⚠️ **启动较慢**：需要加载更多插件

## 🔧 开发环境配置

### 环境变量
```typescript
// 开发环境
__DEV__: true
__PROD__: false

// 生产环境
__DEV__: false
__PROD__: true
```

### API代理配置
```typescript
// 开发时API请求会代理到Worker
proxy: {
  '/api': {
    target: 'http://localhost:8787',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

## 🎯 开发流程建议

### **日常开发**
```bash
# 1. 启动纯前端开发
npm run dev

# 2. 修改代码，热更新生效
# 3. 测试前端功能
# 4. 提交代码
```

### **API功能测试**
```bash
# 1. 启动Worker（新终端）
npm run worker:dev

# 2. 启动前端开发
npm run dev

# 3. 测试完整功能
# 4. 关闭Worker（Ctrl+C）
```

### **生产环境测试**
```bash
# 1. 构建项目
npm run build-only

# 2. 启动生产预览
npm run preview

# 3. 测试生产环境功能
```

## 📱 鸿蒙App集成测试

### **开发环境测试**
- Service Worker会注册但缓存策略简化
- 音频文件正常加载和播放
- 震动功能正常工作
- 用户ID生成正常

### **生产环境测试**
- Service Worker完整缓存策略
- 离线功能支持
- 性能优化生效
- 完整的App集成功能

## 🐛 常见问题

### **Q: 开发时Service Worker报错？**
A: 使用 `npm run dev` 启动，Service Worker会被禁用

### **Q: API请求失败？**
A: 检查Worker是否启动，或使用 `npm run dev:full`

### **Q: 音频文件404？**
A: 确保音频文件在 `public/audio/` 目录中

### **Q: 热更新不工作？**
A: 检查文件路径和语法错误

## 🔄 部署流程

### **开发完成**
```bash
# 1. 代码审查
npm run type-check

# 2. 构建测试
npm run build-only

# 3. 本地预览
npm run preview

# 4. 部署生产
npm run deploy
```

### **版本更新**
```bash
# 1. 更新版本号
# 2. 构建项目
npm run build-only

# 3. 部署到Cloudflare
npm run deploy

# 4. 验证生产环境
```

## 📊 性能对比

| 模式 | 启动速度 | 功能完整性 | 开发体验 | 适用场景 |
|------|----------|------------|----------|----------|
| **纯前端** | ⚡ 极快 | 🟡 部分 | 🟢 优秀 | 日常开发 |
| **完整环境** | 🟡 中等 | 🟢 完整 | 🟡 良好 | 集成测试 |
| **生产预览** | 🟡 中等 | 🟢 完整 | 🟡 良好 | 部署前测试 |

## 💡 最佳实践

1. **日常开发**：使用 `npm run dev`
2. **功能测试**：使用 `npm run dev:full`
3. **部署前**：使用 `npm run preview`
4. **生产环境**：使用 `npm run deploy`

---

**注意**：开发环境配置已优化，Service Worker在开发时会被禁用，避免缓存干扰。生产环境会正常启用所有功能。
