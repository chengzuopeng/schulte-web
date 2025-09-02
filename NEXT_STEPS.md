# Schulte 鸿蒙应用 - 后续步骤指南

## 🚀 立即需要做的事情

### 1. 构建和部署应用

#### 使用 DevEco Studio 构建
1. 打开 DevEco Studio
2. 导入项目：`File` → `Open` → 选择项目文件夹
3. 等待项目同步完成
4. 连接鸿蒙设备或启动模拟器
5. 点击 `Run` 按钮构建并运行应用

#### 构建配置检查
- 确保 `build-profile.json5` 中的 SDK 版本正确
- 检查签名配置（如果需要发布到应用市场）
- 确认目标设备类型为 `phone`

### 2. 权限授权
首次运行应用时，系统会请求以下权限：
- **网络权限**：允许应用访问网络
- **震动权限**：允许应用提供触觉反馈
- **音频权限**：允许应用播放声音

请点击"允许"授权这些权限。

### 3. 功能测试
在真机上测试以下功能：
- H5页面是否正常加载
- 震动功能是否工作
- 音频播放是否正常
- 用户ID是否正确生成和保存

## 🌐 H5页面集成指南

### 1. 检测应用环境

首先在您的H5页面中添加环境检测：

```javascript
// 检查是否在鸿蒙原生应用中
function isInSchulteApp() {
  return !!(window.SchulteApp && window.SchulteApp.isInApp());
}

// 页面加载时检测
document.addEventListener('DOMContentLoaded', function() {
  if (isInSchulteApp()) {
    console.log('✅ 运行在Schulte鸿蒙应用中');
    // 初始化应用相关功能
    initAppFeatures();
  } else {
    console.log('🌐 运行在普通浏览器中');
    // 使用浏览器兼容方案
    initBrowserFeatures();
  }
});
```

### 2. 获取用户ID

```javascript
// 获取用户唯一标识
async function getUserId() {
  try {
    if (isInSchulteApp()) {
      // 在原生应用中
      const userId = await window.SchulteApp.getUserId();
      console.log('用户ID:', userId);
      return userId;
    } else {
      // 在浏览器中，生成临时ID
      const tempId = 'browser_' + Date.now();
      console.log('临时用户ID:', tempId);
      return tempId;
    }
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return null;
  }
}

// 使用示例
getUserId().then(userId => {
  if (userId) {
    // 将用户ID保存到本地存储或发送到服务器
    localStorage.setItem('schulte_user_id', userId);
    
    // 或者发送到您的服务器
    sendUserIdToServer(userId);
  }
});
```

### 3. 调用原生能力

#### 播放声音
```javascript
// 播放成功音效
function playSuccessSound() {
  if (isInSchulteApp()) {
    window.SchulteApp.playSound('success');
  } else {
    // 浏览器兼容方案
    playBrowserSound('success');
  }
}

// 播放警告音效
function playWarningSound() {
  if (isInSchulteApp()) {
    window.SchulteApp.playSound('warning');
  } else {
    playBrowserSound('warning');
  }
}

// 浏览器中的声音播放（使用Web Audio API）
function playBrowserSound(type) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置频率
    const frequency = type === 'success' ? 800 : 400;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // 设置音量
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('浏览器声音播放失败:', error);
  }
}
```

#### 震动反馈
```javascript
// 短震动（100ms）
function shortVibrate() {
  if (isInSchulteApp()) {
    window.SchulteApp.vibrate(100);
  } else {
    // 浏览器兼容方案
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }
}

// 长震动（500ms）
function longVibrate() {
  if (isInSchulteApp()) {
    window.SchulteApp.vibrate(500);
  } else {
    if (navigator.vibrate) {
      navigator.vibrate(500);
    }
  }
}

// 震动模式（成功反馈）
function vibrateSuccess() {
  if (isInSchulteApp()) {
    // 短-长-短的震动模式
    window.SchulteApp.vibrate(100);
    setTimeout(() => {
      window.SchulteApp.vibrate(300);
    }, 150);
    setTimeout(() => {
      window.SchulteApp.vibrate(100);
    }, 500);
  } else {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 300, 50, 100]);
    }
  }
}
```

### 4. 完整的集成示例

```javascript
// Schulte应用能力管理器
class SchulteAppManager {
  constructor() {
    this.userId = null;
    this.isApp = false;
    this.init();
  }
  
  async init() {
    this.isApp = isInSchulteApp();
    
    if (this.isApp) {
      try {
        this.userId = await window.SchulteApp.getUserId();
        console.log('应用初始化成功，用户ID:', this.userId);
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    } else {
      console.log('在浏览器中运行，使用兼容方案');
    }
  }
  
  // 游戏成功反馈
  gameSuccess() {
    this.playSound('success');
    this.vibrate(200);
    
    // 可以添加其他成功反馈
    this.showSuccessAnimation();
  }
  
  // 游戏失败反馈
  gameFailure() {
    this.playSound('warning');
    this.vibrate(100);
    
    // 可以添加其他失败反馈
    this.showFailureAnimation();
  }
  
  // 获取用户ID
  getUserId() {
    return this.userId;
  }
  
  // 播放声音
  playSound(type) {
    if (this.isApp) {
      window.SchulteApp.playSound(type);
    } else {
      this.playBrowserSound(type);
    }
  }
  
  // 震动
  vibrate(duration) {
    if (this.isApp) {
      window.SchulteApp.vibrate(duration);
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    }
  }
  
  // 浏览器兼容的声音播放
  playBrowserSound(type) {
    // 实现浏览器声音播放逻辑
  }
  
  // 成功动画
  showSuccessAnimation() {
    // 实现成功动画效果
  }
  
  // 失败动画
  showFailureAnimation() {
    // 实现失败动画效果
  }
}

// 使用示例
const appManager = new SchulteAppManager();

// 在游戏逻辑中使用
function onGameSuccess() {
  appManager.gameSuccess();
  
  // 获取用户ID用于记录
  const userId = appManager.getUserId();
  if (userId) {
    recordGameResult(userId, 'success');
  }
}

function onGameFailure() {
  appManager.gameFailure();
  
  const userId = appManager.getUserId();
  if (userId) {
    recordGameResult(userId, 'failure');
  }
}
```

## 🔧 技术细节

### 桥接机制工作原理
1. **页面加载**：WebView加载H5页面
2. **脚本注入**：页面加载完成后自动注入桥接脚本
3. **能力调用**：H5页面通过`window.SchulteApp`调用原生能力
4. **消息传递**：原生应用通过消息机制响应H5页面的请求

### 支持的消息类型
- `getUserId`: 获取用户ID
- `playSound`: 播放声音（参数：soundType）
- `vibrate`: 震动（参数：duration，单位：毫秒）

### 错误处理
```javascript
// 添加错误处理
try {
  const userId = await window.SchulteApp.getUserId();
  // 处理成功情况
} catch (error) {
  console.error('获取用户ID失败:', error);
  // 使用备用方案
  const fallbackId = generateFallbackId();
}
```

## 📱 测试和调试

### 1. 在真机上测试
- 确保设备支持震动功能
- 测试音频播放是否正常
- 验证用户ID的持久化存储

### 2. 调试技巧
- 使用 `console.log` 输出调试信息
- 检查浏览器控制台的错误信息
- 验证桥接脚本是否正确注入

### 3. 常见问题
- **权限被拒绝**：检查应用权限设置
- **声音不播放**：检查设备音量设置
- **震动不工作**：确认设备支持震动功能

## 🎯 下一步计划

1. **立即执行**：构建并部署应用到设备
2. **功能测试**：验证所有原生能力是否正常工作
3. **H5集成**：将桥接代码集成到您的H5页面中
4. **用户体验优化**：根据实际使用情况调整反馈效果
5. **功能扩展**：根据需要添加更多原生能力

## 📞 技术支持

如果在集成过程中遇到问题：
1. 检查控制台错误信息
2. 确认应用权限设置
3. 验证设备兼容性
4. 参考README.md中的技术说明

---

**注意**：请确保在真机上测试所有功能，模拟器可能无法完全模拟震动和音频功能。
