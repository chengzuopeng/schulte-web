# JSBridge 使用文档

## 概述

JSBridge 是 Web 页面与鸿蒙原生应用之间的桥接层，提供了丰富的原生能力供 H5 页面调用。

## 可用页面

以下页面已集成 JSBridge 功能：
- 专注力训练 (FocusTraining)
- 记忆力训练 (MemoryTraining) 
- 注意力训练 (AttentionTraining)
- 签到页面 (Checkin)
- 奖章页面 (Medal)

**注意：** 资料页面 (Docs) 不包含 JSBridge 功能。

## API 接口

### 1. 获取用户ID

```javascript
// 异步方式
window.SchulteApp.getUserId().then(userId => {
    console.log('用户ID:', userId);
}).catch(error => {
    console.error('获取用户ID失败:', error);
});

// 同步方式（直接调用原生接口）
const userId = window.SchulteNative.getUserId();
```

### 2. 震动功能

```javascript
// 震动 100 毫秒（默认）
const success = window.SchulteApp.vibrate(100);
console.log('震动结果:', success);

// 震动时长范围：10-1000 毫秒
const success2 = window.SchulteApp.vibrate(500);
```

### 3. 音效播放

```javascript
// 播放默认音效
const success = window.SchulteApp.playSound('default');

// 播放指定类型音效
const success2 = window.SchulteApp.playSound('button1');
const success3 = window.SchulteApp.playSound('error1');
```

### 4. 页面跳转 🆕

```javascript
// 跳转到指定页面
const success = window.SchulteApp.navigateToPage('focus');

// 支持的页面名称：
// 'focus' - 专注力训练
// 'memory' - 记忆力训练  
// 'attention' - 注意力训练
// 'checkin' - 签到页面
// 'medal' - 奖章页面
// 'docs' - 资料页面
// 'home' - 首页

// 示例：跳转到首页
window.SchulteApp.navigateToPage('home');

// 示例：跳转到签到页面
window.SchulteApp.navigateToPage('checkin');
```

### 5. 分享功能 🆕

#### 5.1 分享文本内容

```javascript
// 分享内容
const success = window.SchulteApp.shareContent('分享标题', '分享内容描述');

// 示例：分享训练成绩
window.SchulteApp.shareContent(
    '我的舒尔特训练成绩', 
    '我在舒尔特专注训练中取得了新的突破！用时25秒完成3x3方格训练。'
);

// 示例：分享奖章
window.SchulteApp.shareContent(
    '获得新奖章', 
    '恭喜我获得了"专注大师"奖章！坚持训练30天达成。'
);
```

#### 5.2 分享图片 🆕

```javascript
// 分享图片（异步方法）
window.SchulteApp.shareImage('images/poster.jpg', '我的训练海报')
    .then(success => {
        if (success) {
            console.log('图片分享成功');
        } else {
            console.log('图片分享失败');
        }
    })
    .catch(error => {
        console.error('图片分享出错:', error);
    });

// 支持的图片路径格式：

// 1. 相对路径（相对于应用沙箱）
window.SchulteApp.shareImage('images/achievement.png', '成就截图');

// 2. 网络图片URL（会自动下载到本地再分享）
window.SchulteApp.shareImage('https://example.com/poster.jpg', '网络海报');

// 3. 绝对路径
window.SchulteApp.shareImage('/data/storage/el2/base/cache/my_image.jpg');

// 简化调用（不带标题）
window.SchulteApp.shareImage('images/score.png');
```

#### 分享功能使用场景

```javascript
// 场景1：分享训练成绩截图
function shareTrainingResult() {
    // 假设页面上有成绩图表
    const canvas = document.getElementById('scoreChart');
    
    // 将 canvas 转换为图片并分享
    canvas.toBlob(blob => {
        // 这里需要将 blob 保存为本地文件，然后分享
        // 具体实现取决于应用的文件管理策略
        window.SchulteApp.shareImage('temp/score_chart.png', '我的训练成绩');
    });
}

// 场景2：分享奖章图片
function shareMedal(medalImagePath) {
    window.SchulteApp.shareImage(medalImagePath, '获得新奖章！')
        .then(success => {
            if (success) {
                // 可以显示分享成功的提示
                showToast('分享成功！');
            }
        })
        .catch(error => {
            showToast('分享失败，请重试');
        });
}

// 场景3：错误处理的完整示例
async function shareImageSafely(imagePath, title) {
    try {
        // 检查分享功能是否可用
        if (!window.SchulteApp || !window.SchulteApp.shareImage) {
            throw new Error('图片分享功能不可用');
        }
        
        const result = await window.SchulteApp.shareImage(imagePath, title);
        
        if (result) {
            console.log('图片分享成功');
            return true;
        } else {
            console.warn('图片分享被取消或失败');
            return false;
        }
    } catch (error) {
        console.error('图片分享异常:', error);
        // 可以在这里实现降级方案，比如复制图片链接到剪贴板
        return false;
    }
}
```

### 6. 应用信息

```javascript
// 检查是否在应用内
const isInApp = window.SchulteApp.isInApp(); // 返回 true

// 获取应用信息
const appInfo = window.SchulteApp.getAppInfo();
console.log(appInfo);
// 输出：
// {
//   isInApp: true,
//   platform: 'HarmonyOS',
//   version: '1.0.0',
//   timestamp: 1694234567890
// }
```

## 错误处理

所有 API 调用都包含错误处理机制：

```javascript
// 推荐的调用方式
try {
    const result = window.SchulteApp.navigateToPage('focus');
    if (result) {
        console.log('页面跳转成功');
    } else {
        console.log('页面跳转失败');
    }
} catch (error) {
    console.error('API 调用异常:', error);
}

// 异步 API 的错误处理
window.SchulteApp.getUserId()
    .then(userId => {
        console.log('获取成功:', userId);
    })
    .catch(error => {
        console.error('获取失败:', error);
    });
```

## 兼容性检查

在调用 API 之前，建议先检查是否支持：

```javascript
// 检查基础 JSBridge 是否可用
if (window.SchulteApp) {
    console.log('JSBridge 可用');
    
    // 检查特定功能是否支持
    if (typeof window.SchulteApp.navigateToPage === 'function') {
        console.log('页面跳转功能可用');
    }
    
    if (typeof window.SchulteApp.shareContent === 'function') {
        console.log('文本分享功能可用');
    }
    
    if (typeof window.SchulteApp.shareImage === 'function') {
        console.log('图片分享功能可用');
    }
} else {
    console.log('当前环境不支持 JSBridge');
}
```

## 事件监听

JSBridge 会在初始化完成后发送用户ID消息：

```javascript
// 监听来自原生的消息
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'userId') {
        console.log('接收到用户ID:', event.data.userId);
    }
});
```

## 最佳实践

### 1. 功能检测优先

```javascript
function safeNavigate(pageName) {
    if (window.SchulteApp && window.SchulteApp.navigateToPage) {
        return window.SchulteApp.navigateToPage(pageName);
    } else {
        console.warn('页面跳转功能不可用');
        return false;
    }
}
```

### 2. 优雅降级

```javascript
function playFeedback() {
    // 尝试播放原生音效
    if (window.SchulteApp && window.SchulteApp.playSound('success')) {
        return;
    }
    
    // 降级到 Web Audio API
    if (window.AudioContext) {
        // Web 音效播放逻辑
        console.log('使用 Web 音效');
    }
}
```

### 3. 用户反馈

```javascript
// 文本分享示例
function shareAchievement(title, content) {
    if (window.SchulteApp && window.SchulteApp.shareContent) {
        const success = window.SchulteApp.shareContent(title, content);
        if (success) {
            // 可以添加成功提示
            console.log('分享调用成功');
        } else {
            // 分享失败的处理
            console.log('分享调用失败');
        }
    } else {
        // 提示用户功能不可用
        alert('分享功能在当前环境下不可用');
    }
}

// 图片分享示例
async function shareImageWithFeedback(imagePath, title) {
    if (window.SchulteApp && window.SchulteApp.shareImage) {
        try {
            const success = await window.SchulteApp.shareImage(imagePath, title);
            if (success) {
                // 可以添加成功提示
                console.log('图片分享成功');
                showToast('分享成功！');
            } else {
                console.log('图片分享被取消');
                showToast('分享已取消');
            }
        } catch (error) {
            console.error('图片分享失败:', error);
            showToast('分享失败，请重试');
        }
    } else {
        // 提示用户功能不可用
        alert('图片分享功能在当前环境下不可用');
    }
}
```

## 版本信息

- **当前版本**: 1.0.0
- **支持平台**: HarmonyOS
- **更新日期**: 2024年

## 更新记录

### v1.0.0
- ✅ 基础功能：获取用户ID、震动、音效播放
- ✅ 页面跳转：支持应用内页面导航
- ✅ 文本分享：分享文本内容到系统分享界面
- ✅ 图片分享：支持本地图片、网络图片的系统分享
- ✅ 支持所有训练页面和功能页面（除资料页面外）
- ✅ 完善错误处理和兼容性检查
- ✅ 异步API支持，提供Promise接口
