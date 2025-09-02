// Service Worker 管理器
// 负责注册、更新和监控Service Worker

class ServiceWorkerManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = 'serviceWorker' in navigator;
  private lastUpdateCheck = 0;
  private updateCheckInterval = 5 * 60 * 1000; // 5分钟检查一次更新

  // 注册Service Worker
  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ 当前浏览器不支持Service Worker');
      return false;
    }

    try {
      console.log('🎯 开始注册Service Worker...');
      
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // 禁用HTTP缓存，确保SW能及时更新
      });

      console.log('✅ Service Worker 注册成功:', this.swRegistration);

      // 监听更新
      this.setupUpdateListener();
      
      // 监听消息
      this.setupMessageListener();

      return true;
    } catch (error) {
      console.error('❌ Service Worker 注册失败:', error);
      return false;
    }
  }

  // 设置更新监听器
  private setupUpdateListener(): void {
    if (!this.swRegistration) return;

    // 监听Service Worker更新
    this.swRegistration.addEventListener('updatefound', () => {
      console.log('🔄 发现Service Worker更新...');
      
      const newWorker = this.swRegistration!.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🆕 新版本Service Worker已安装，等待激活...');
            // 不自动显示更新提示，避免频繁打扰用户
            this.handleUpdateAvailable();
          }
        });
      }
    });

    // 监听Service Worker状态变化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🎮 Service Worker 控制器已更改');
      // 可以在这里刷新页面或显示更新提示
    });
  }

  // 处理更新可用
  private handleUpdateAvailable(): void {
    // 检查是否应该显示更新提示
    const now = Date.now();
    if (now - this.lastUpdateCheck > this.updateCheckInterval) {
      this.lastUpdateCheck = now;
      // 可以选择性地显示更新提示
      console.log('🆕 有新版本可用，但不会自动提示用户');
    }
  }

  // 设置消息监听器
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CACHE_STATUS') {
        console.log('📊 缓存状态:', event.data);
      }
    });
  }

  // 显示更新通知（手动调用）
  showUpdateNotification(): void {
    // 可以在这里显示更新提示，让用户刷新页面
    console.log('🆕 有新版本可用，建议刷新页面');
    
    // 可选：显示用户友好的更新提示
    if (confirm('发现新版本，是否立即更新？')) {
      this.update();
    }
  }

  // 强制更新
  async update(): Promise<void> {
    if (!this.swRegistration) return;

    try {
      // 发送跳过等待消息
      if (this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // 刷新页面以应用新版本
      window.location.reload();
    } catch (error) {
      console.error('❌ 更新失败:', error);
    }
  }

  // 获取缓存状态
  async getCacheStatus(): Promise<any> {
    if (!this.swRegistration || !navigator.serviceWorker.controller) {
      return { error: 'Service Worker未就绪' };
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATUS') {
          resolve(event.data);
        }
      };

      const controller = navigator.serviceWorker.controller;
      if (controller) {
        controller.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [channel.port2]
        );
      }
    });
  }

  // 检查是否有更新（限制频率）
  async checkForUpdate(): Promise<boolean> {
    if (!this.swRegistration) return false;

    const now = Date.now();
    if (now - this.lastUpdateCheck < this.updateCheckInterval) {
      console.log('⏰ 更新检查过于频繁，跳过本次检查');
      return false;
    }

    try {
      this.lastUpdateCheck = now;
      await this.swRegistration.update();
      return this.swRegistration.installing !== null;
    } catch (error) {
      console.error('❌ 检查更新失败:', error);
      return false;
    }
  }

  // 清理缓存
  async clearCache(): Promise<void> {
    if (!this.isSupported) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('schulte-'))
          .map(name => caches.delete(name))
      );
      console.log('🗑️ 缓存清理完成');
    } catch (error) {
      console.error('❌ 缓存清理失败:', error);
    }
  }

  // 获取注册状态
  getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  // 检查是否支持
  isServiceWorkerSupported(): boolean {
    return this.isSupported;
  }

  // 检查是否已激活
  isActive(): boolean {
    return this.swRegistration?.active !== null;
  }

  // 手动触发更新检查（用于调试）
  async forceUpdateCheck(): Promise<boolean> {
    this.lastUpdateCheck = 0; // 重置时间限制
    return this.checkForUpdate();
  }
}

// 创建全局Service Worker管理器实例
export const swManager = new ServiceWorkerManager();
