# 舒尔特专注训练 - Web端JSBridge调用指南

## 概述

本项目基于鸿蒙5.1.1框架，采用官方推荐的 `javaScriptProxy` 机制实现Web与原生应用的双向通信。Web页面可以通过 `window.SchulteNative` 对象调用原生能力，无需额外的第三方SDK。

## 支持的页面

以下页面已集成JSBridge功能：
- **专注力训练页面** (`FocusTraining`) - `https://schulte.kiteblog.cn/index.html`
- **记忆力训练页面** (`MemoryTraining`) - `https://schulte.kiteblog.cn/index.html/#/memory`
- **注意力训练页面** (`AttentionTraining`) - `https://schulte.kiteblog.cn/index.html/#/color`
- **签到页面** (`Checkin`) - `https://schulte.kiteblog.cn/index.html/#/checkin`
- **奖章页面** (`Medal`) - `https://schulte.kiteblog.cn/index.html/#/medal`

> **注意：** 资料页面 (`Docs`) 不包含JSBridge功能，仅用于静态内容展示。

---

## JSBridge对象介绍

### 全局对象名称
```javascript
window.SchulteNative
```

### 可用方法列表
- `getUserId()` - 获取用户唯一标识
- `vibrate(duration)` - 设备震动
- `playSound(soundType)` - 播放音效
- `navigateToPage(pageName)` - 页面跳转
- `shareContent(title, content)` - 分享文本内容
- `isInApp()` - 检查是否在应用内运行
- `getAppInfo()` - 获取应用信息

---

## 详细API说明

### 1. 获取用户ID

**方法签名：**
```javascript
getUserId(): string
```

**功能说明：**
获取当前用户的全局唯一标识符，该ID在应用首次启动时生成，后续保持不变。

**使用示例：**
```javascript
// 获取用户ID
const userId = window.SchulteNative.getUserId();
console.log('当前用户ID:', userId);

// 在训练记录中使用
function saveTrainingRecord(score, timeUsed) {
    const record = {
        userId: window.SchulteNative.getUserId(),
        score: score,
        timeUsed: timeUsed,
        timestamp: Date.now()
    };
    // 保存到本地存储或发送到服务器
    localStorage.setItem('lastRecord', JSON.stringify(record));
}
```

### 2. 设备震动

**方法签名：**
```javascript
vibrate(duration: number): boolean
```

**参数说明：**
- `duration`: 震动时长，单位毫秒，范围 10-1000ms

**返回值：**
- `true`: 震动调用成功
- `false`: 震动调用失败

**使用示例：**
```javascript
// 短震动反馈（100ms）
function shortVibrate() {
    const success = window.SchulteNative.vibrate(100);
    if (success) {
        console.log('震动反馈成功');
    }
}

// 长震动反馈（500ms）
function longVibrate() {
    window.SchulteNative.vibrate(500);
}

// 在游戏中的使用场景
function onCorrectAnswer() {
    // 正确答案时的短震动反馈
    window.SchulteNative.vibrate(50);
}

function onWrongAnswer() {
    // 错误答案时的长震动反馈
    window.SchulteNative.vibrate(200);
}

function onGameComplete() {
    // 游戏完成时的震动序列
    window.SchulteNative.vibrate(100);
    setTimeout(() => window.SchulteNative.vibrate(100), 150);
    setTimeout(() => window.SchulteNative.vibrate(100), 300);
}
```

### 3. 音效播放

**方法签名：**
```javascript
playSound(soundType: string): boolean
```

**参数说明：**
- `soundType`: 音效类型标识符，如 'button1', 'error1', 'success' 等

**返回值：**
- `true`: 音效播放调用成功
- `false`: 音效播放调用失败

**使用示例：**
```javascript
// 播放按钮点击音效
function playButtonSound() {
    window.SchulteNative.playSound('button1');
}

// 播放错误音效
function playErrorSound() {
    window.SchulteNative.playSound('error1');
}

// 在游戏中的使用
function handleCellClick(cellNumber) {
    // 播放点击音效
    window.SchulteNative.playSound('button1');
    
    if (isCorrectSequence(cellNumber)) {
        window.SchulteNative.playSound('success');
    } else {
        window.SchulteNative.playSound('error1');
    }
}
```

### 4. 页面跳转

**方法签名：**
```javascript
navigateToPage(pageName: string): boolean
```

**支持的页面名称：**
- `'focus'` - 专注力训练页面
- `'memory'` - 记忆力训练页面
- `'attention'` - 注意力训练页面
- `'checkin'` - 签到页面
- `'medal'` - 奖章页面
- `'docs'` - 资料页面
- `'home'` - 首页

**返回值：**
- `true`: 跳转调用成功
- `false`: 跳转调用失败

**使用示例：**
```javascript
// 跳转到首页
function goHome() {
    const success = window.SchulteNative.navigateToPage('home');
    if (!success) {
        console.error('跳转失败');
    }
}

// 完成训练后跳转到奖章页面
function onTrainingComplete() {
    // 保存成绩
    saveScore();
    
    // 跳转到奖章页面查看成就
    window.SchulteNative.navigateToPage('medal');
}

// 创建导航菜单
function createNavigationMenu() {
    const menuItems = [
        { name: '专注力训练', page: 'focus' },
        { name: '记忆力训练', page: 'memory' },
        { name: '注意力训练', page: 'attention' },
        { name: '签到', page: 'checkin' },
        { name: '奖章', page: 'medal' }
    ];

    menuItems.forEach(item => {
        const button = document.createElement('button');
        button.textContent = item.name;
        button.onclick = () => window.SchulteNative.navigateToPage(item.page);
        document.body.appendChild(button);
    });
}
```

### 5. 分享功能

**方法签名：**
```javascript
shareContent(title: string, content: string): boolean
```

**参数说明：**
- `title`: 分享标题
- `content`: 分享内容

**返回值：**
- `true`: 分享调用成功
- `false`: 分享调用失败

**使用示例：**
```javascript
// 分享训练成绩
function shareTrainingResult(score, timeUsed) {
    const title = '我的舒尔特训练成绩';
    const content = `我在舒尔特专注训练中取得了新突破！用时${timeUsed}秒完成训练，得分${score}分。快来挑战吧！`;
    
    const success = window.SchulteNative.shareContent(title, content);
    if (success) {
        console.log('分享成功');
    } else {
        console.log('分享失败');
    }
}

// 分享里程碑成就
function shareMilestone(achievement) {
    const title = '获得新成就！';
    const content = `我在舒尔特专注训练中获得了"${achievement}"成就！坚持训练，挑战自我！`;
    
    window.SchulteNative.shareContent(title, content);
}

// 带确认的分享功能
function shareWithConfirmation(title, content) {
    if (confirm('是否要分享这个内容？')) {
        const success = window.SchulteNative.shareContent(title, content);
        if (success) {
            alert('分享成功！');
        } else {
            alert('分享失败，请重试。');
        }
    }
}
```

### 6. 应用环境检查

**方法签名：**
```javascript
isInApp(): boolean
getAppInfo(): object
```

**使用示例：**
```javascript
// 检查运行环境
function checkEnvironment() {
    if (window.SchulteNative && window.SchulteNative.isInApp()) {
        console.log('运行在鸿蒙应用内');
        
        const appInfo = window.SchulteNative.getAppInfo();
        console.log('应用信息:', appInfo);
        // 输出示例: { isInApp: true, platform: 'HarmonyOS', version: '1.0.0', timestamp: 1694234567890 }
    } else {
        console.log('运行在浏览器中');
        // 在浏览器中禁用某些功能
        disableNativeFeatures();
    }
}

// 功能降级处理
function enableFeatureBasedOnEnvironment() {
    if (window.SchulteNative && window.SchulteNative.isInApp()) {
        // 在应用内启用所有功能
        enableVibration();
        enableShare();
        enableNativeNavigation();
    } else {
        // 在浏览器中使用替代方案
        enableWebVibration();
        enableWebShare();
        enableWebNavigation();
    }
}
```

---

## 完整使用示例

### 舒尔特方格游戏示例

```html
<!DOCTYPE html>
<html>
<head>
    <title>舒尔特方格训练</title>
    <style>
        .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
            width: 300px;
            height: 300px;
            margin: 20px auto;
        }
        .cell {
            background: #f0f0f0;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
        }
        .cell:hover {
            background: #e0e0e0;
        }
        .cell.completed {
            background: #90EE90;
        }
    </style>
</head>
<body>
    <div id="app">
        <h1>舒尔特方格训练</h1>
        <div id="score">当前目标: 1</div>
        <div id="timer">用时: 0s</div>
        <div class="grid" id="grid"></div>
        <div id="controls">
            <button onclick="startGame()">开始游戏</button>
            <button onclick="shareResult()" id="shareBtn" style="display:none;">分享成绩</button>
            <button onclick="goToMedals()">查看奖章</button>
        </div>
    </div>

    <script>
        let currentNumber = 1;
        let startTime = 0;
        let endTime = 0;
        let gameActive = false;
        let timerInterval;

        // 初始化检查
        function init() {
            console.log('初始化游戏...');
            
            if (window.SchulteNative) {
                console.log('JSBridge可用');
                const userId = window.SchulteNative.getUserId();
                console.log('用户ID:', userId);
                
                // 获取应用信息
                const appInfo = window.SchulteNative.getAppInfo();
                console.log('应用信息:', appInfo);
            } else {
                console.log('JSBridge不可用，运行在浏览器模式');
            }
            
            initializeGrid();
        }

        // 初始化方格
        function initializeGrid() {
            const grid = document.getElementById('grid');
            grid.innerHTML = '';
            
            const numbers = Array.from({length: 9}, (_, i) => i + 1);
            shuffleArray(numbers);
            
            numbers.forEach(num => {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = num;
                cell.onclick = () => handleCellClick(num, cell);
                grid.appendChild(cell);
            });
        }

        // 数组乱序
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        // 开始游戏
        function startGame() {
            currentNumber = 1;
            gameActive = true;
            startTime = Date.now();
            
            document.getElementById('score').textContent = '当前目标: 1';
            document.getElementById('shareBtn').style.display = 'none';
            
            // 播放开始音效
            if (window.SchulteNative) {
                window.SchulteNative.playSound('button1');
            }
            
            // 启动计时器
            timerInterval = setInterval(updateTimer, 100);
            
            initializeGrid();
        }

        // 更新计时器
        function updateTimer() {
            if (gameActive) {
                const elapsed = (Date.now() - startTime) / 1000;
                document.getElementById('timer').textContent = `用时: ${elapsed.toFixed(1)}s`;
            }
        }

        // 处理方格点击
        function handleCellClick(number, cellElement) {
            if (!gameActive) return;
            
            if (number === currentNumber) {
                // 正确点击
                cellElement.classList.add('completed');
                currentNumber++;
                
                // 播放成功音效和震动反馈
                if (window.SchulteNative) {
                    window.SchulteNative.playSound('success');
                    window.SchulteNative.vibrate(50);
                }
                
                if (currentNumber <= 9) {
                    document.getElementById('score').textContent = `当前目标: ${currentNumber}`;
                } else {
                    // 游戏完成
                    gameComplete();
                }
            } else {
                // 错误点击
                if (window.SchulteNative) {
                    window.SchulteNative.playSound('error1');
                    window.SchulteNative.vibrate(200);
                }
                
                // 视觉反馈
                cellElement.style.background = '#ffcccc';
                setTimeout(() => {
                    cellElement.style.background = '#f0f0f0';
                }, 200);
            }
        }

        // 游戏完成
        function gameComplete() {
            gameActive = false;
            endTime = Date.now();
            clearInterval(timerInterval);
            
            const totalTime = ((endTime - startTime) / 1000).toFixed(1);
            const score = Math.max(1000 - parseInt(totalTime * 10), 100);
            
            document.getElementById('score').textContent = `游戏完成！用时: ${totalTime}s，得分: ${score}`;
            document.getElementById('shareBtn').style.display = 'inline-block';
            
            // 完成震动反馈
            if (window.SchulteNative) {
                window.SchulteNative.vibrate(100);
                setTimeout(() => window.SchulteNative.vibrate(100), 150);
                setTimeout(() => window.SchulteNative.vibrate(100), 300);
            }
            
            // 保存成绩
            saveScore(totalTime, score);
        }

        // 保存成绩
        function saveScore(time, score) {
            const userId = window.SchulteNative ? window.SchulteNative.getUserId() : 'web_user';
            
            const record = {
                userId: userId,
                time: time,
                score: score,
                date: new Date().toISOString(),
                gameType: 'schulte_3x3'
            };
            
            // 保存到本地存储
            const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
            history.push(record);
            localStorage.setItem('gameHistory', JSON.stringify(history));
            
            console.log('成绩已保存:', record);
        }

        // 分享成绩
        function shareResult() {
            const scoreText = document.getElementById('score').textContent;
            const title = '我的舒尔特训练成绩';
            const content = `${scoreText} 快来挑战舒尔特专注训练，提升你的认知能力！`;
            
            if (window.SchulteNative) {
                const success = window.SchulteNative.shareContent(title, content);
                if (success) {
                    console.log('分享成功');
                } else {
                    console.log('分享失败');
                }
            } else {
                // 浏览器降级方案
                if (navigator.share) {
                    navigator.share({ title, text: content });
                } else {
                    // 复制到剪贴板
                    navigator.clipboard.writeText(`${title}\n${content}`);
                    alert('成绩已复制到剪贴板！');
                }
            }
        }

        // 跳转到奖章页面
        function goToMedals() {
            if (window.SchulteNative) {
                window.SchulteNative.navigateToPage('medal');
            } else {
                alert('奖章功能仅在应用内可用');
            }
        }

        // 页面加载时初始化
        window.onload = init;
    </script>
</body>
</html>
```

---

## 最佳实践建议

### 1. 功能检测优先

```javascript
// 总是先检查JSBridge是否可用
function safeCall(functionName, ...args) {
    if (window.SchulteNative && typeof window.SchulteNative[functionName] === 'function') {
        try {
            return window.SchulteNative[functionName](...args);
        } catch (error) {
            console.error(`调用${functionName}失败:`, error);
            return false;
        }
    } else {
        console.warn(`${functionName} 方法不可用`);
        return false;
    }
}

// 使用示例
function safeVibrate(duration) {
    return safeCall('vibrate', duration);
}

function safeNavigate(page) {
    return safeCall('navigateToPage', page);
}
```

### 2. 优雅降级

```javascript
// 根据环境提供不同的实现
function universalVibrate(duration) {
    if (window.SchulteNative) {
        // 原生震动
        return window.SchulteNative.vibrate(duration);
    } else if (navigator.vibrate) {
        // Web API震动
        return navigator.vibrate(duration);
    } else {
        // 视觉反馈作为降级方案
        document.body.style.animation = 'shake 0.1s';
        setTimeout(() => document.body.style.animation = '', 100);
        return true;
    }
}

function universalShare(title, content) {
    if (window.SchulteNative) {
        return window.SchulteNative.shareContent(title, content);
    } else if (navigator.share) {
        navigator.share({ title, text: content });
        return true;
    } else {
        // 降级到剪贴板
        navigator.clipboard.writeText(`${title}\n${content}`);
        alert('内容已复制到剪贴板');
        return true;
    }
}
```

### 3. 错误处理

```javascript
// 包装所有JSBridge调用
class SchulteBridge {
    static call(method, ...args) {
        try {
            if (!window.SchulteNative) {
                throw new Error('JSBridge不可用');
            }
            
            if (typeof window.SchulteNative[method] !== 'function') {
                throw new Error(`方法 ${method} 不存在`);
            }
            
            const result = window.SchulteNative[method](...args);
            console.log(`调用 ${method} 成功:`, result);
            return result;
            
        } catch (error) {
            console.error(`调用 ${method} 失败:`, error);
            return null;
        }
    }
    
    static vibrate(duration = 100) {
        return this.call('vibrate', duration) !== null;
    }
    
    static navigate(page) {
        return this.call('navigateToPage', page) !== null;
    }
    
    static share(title, content) {
        return this.call('shareContent', title, content) !== null;
    }
    
    static getUserId() {
        return this.call('getUserId') || 'unknown';
    }
}

// 使用示例
if (SchulteBridge.vibrate(200)) {
    console.log('震动成功');
}

if (SchulteBridge.navigate('home')) {
    console.log('跳转成功');
}
```

### 4. 性能优化

```javascript
// 缓存JSBridge可用性检查
let bridgeAvailable = null;

function isBridgeAvailable() {
    if (bridgeAvailable === null) {
        bridgeAvailable = !!(window.SchulteNative && window.SchulteNative.isInApp && window.SchulteNative.isInApp());
    }
    return bridgeAvailable;
}

// 批量操作优化
function performMultipleActions() {
    if (!isBridgeAvailable()) return;
    
    // 减少重复检查
    const bridge = window.SchulteNative;
    bridge.playSound('start');
    bridge.vibrate(100);
    // ... 其他操作
}
```

---

## 调试技巧

### 1. 控制台调试

```javascript
// 在浏览器开发者工具中测试
console.log('JSBridge可用性:', !!window.SchulteNative);
console.log('可用方法:', window.SchulteNative ? Object.keys(window.SchulteNative) : 'N/A');

// 测试所有方法
if (window.SchulteNative) {
    console.log('用户ID:', window.SchulteNative.getUserId());
    console.log('应用信息:', window.SchulteNative.getAppInfo());
    console.log('震动测试:', window.SchulteNative.vibrate(100));
}
```

### 2. 模拟JSBridge

```javascript
// 在浏览器中模拟JSBridge进行开发测试
if (!window.SchulteNative) {
    window.SchulteNative = {
        getUserId: () => 'test_user_' + Date.now(),
        vibrate: (duration) => { console.log(`模拟震动 ${duration}ms`); return true; },
        playSound: (type) => { console.log(`模拟播放音效: ${type}`); return true; },
        navigateToPage: (page) => { console.log(`模拟跳转到: ${page}`); return true; },
        shareContent: (title, content) => { console.log(`模拟分享: ${title} - ${content}`); return true; },
        isInApp: () => false,
        getAppInfo: () => ({ isInApp: false, platform: 'Web', version: '1.0.0', timestamp: Date.now() })
    };
}
```

---

## 常见问题

### Q1: JSBridge方法调用没有反应？
**A1:** 检查以下几点：
- 确认页面是否在支持JSBridge的WebView中运行
- 检查浏览器控制台是否有错误信息
- 确认方法名称拼写是否正确
- 验证参数类型和数量是否匹配

### Q2: 在浏览器中如何测试？
**A2:** 可以使用上面提供的模拟JSBridge代码，或者实现自己的降级方案。

### Q3: 如何处理异步操作？
**A3:** 当前JSBridge方法都是同步的，如果需要异步处理，可以在Web端使用Promise包装：

```javascript
function asyncVibrate(duration) {
    return new Promise((resolve) => {
        const result = window.SchulteNative.vibrate(duration);
        resolve(result);
    });
}

// 使用
asyncVibrate(100).then(success => {
    console.log('震动完成:', success);
});
```

### Q4: 如何确保所有设备都支持震动？
**A4:** 震动功能在某些设备上可能不可用，建议总是检查返回值：

```javascript
function tryVibrate(duration) {
    if (window.SchulteNative) {
        const success = window.SchulteNative.vibrate(duration);
        if (!success) {
            console.log('设备不支持震动或震动被禁用');
        }
        return success;
    }
    return false;
}
```

---

## 技术支持

如果在使用过程中遇到问题，请检查：
1. 确认应用版本是否为最新版本
2. 查看浏览器开发者工具的控制台错误信息
3. 确认页面URL是否在支持的页面列表中
4. 检查设备的相关权限设置（如震动权限）

本文档基于舒尔特专注训练应用 v1.0.0，适用于鸿蒙5.1.1系统。
