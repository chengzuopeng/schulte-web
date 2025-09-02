// 鸿蒙app桥接工具
// 兼容纯网页运行和鸿蒙app中运行

import { audioManager } from './audio-cache';

// 声明全局类型
declare global {
  interface Window {
    SchulteApp?: {
      isInApp(): boolean;
      getUserId(): Promise<string>;
      playSound(type: string): void;
      vibrate(duration: number): void;
      setStatusBarStyle?(style: string): void;
    };
  }
}

// 检测是否在鸿蒙app中运行
export function isInSchulteApp(): boolean {
  return !!(window.SchulteApp && typeof window.SchulteApp.isInApp === 'function' && window.SchulteApp.isInApp());
}

// 获取用户ID
export async function getUserId(): Promise<string | null> {
  try {
    if (isInSchulteApp()) {
      // 在原生应用中
      const userId = await window.SchulteApp!.getUserId();
      // 获取到鸿蒙app用户ID
      return userId;
    } else {
      // 在浏览器中，从本地存储获取或生成临时ID
      let tempId = localStorage.getItem('schulte_user_id');
      if (!tempId) {
        tempId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('schulte_user_id', tempId);
      }
      // 使用浏览器临时用户ID
      return tempId;
    }
  } catch (error) {
    console.error('获取用户ID失败:', error);
    // 使用备用方案
    const fallbackId = 'fallback_' + Date.now();
    localStorage.setItem('schulte_user_id', fallbackId);
    return fallbackId;
  }
}

// 播放声音
export function playSound(type: 'success' | 'warning' | 'button' | 'error', audioType: number = 1): void {
  // 使用音频缓存管理器播放
  audioManager.play(type, audioType);
}

// 震动反馈
export function vibrate(duration: number): void {
  try {
    if (isInSchulteApp()) {
      // 在原生应用中调用app的震动能力
      window.SchulteApp!.vibrate(duration);
      // 鸿蒙app震动
    } else {
      // 浏览器兼容方案
      if (navigator.vibrate) {
        navigator.vibrate(duration);
        // 浏览器震动
      }
    }
  } catch (error) {
    console.error('震动失败:', error);
    // 降级到浏览器方案
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }
}

// 短震动（100ms）
export function vibrateShort(): void {
  vibrate(100);
}

// 长震动（500ms）
export function vibrateLong(): void {
  vibrate(500);
}

// 成功反馈震动模式
export function vibrateSuccess(): void {
  if (isInSchulteApp()) {
    // 短-长-短的震动模式
    window.SchulteApp!.vibrate(100);
    setTimeout(() => {
      window.SchulteApp!.vibrate(300);
    }, 150);
    setTimeout(() => {
      window.SchulteApp!.vibrate(100);
    }, 500);
  } else {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 300, 50, 100]);
    }
  }
}

// 失败反馈震动模式
export function vibrateFailure(): void {
  if (isInSchulteApp()) {
    // 短-短-短的震动模式
    window.SchulteApp!.vibrate(100);
    setTimeout(() => {
      window.SchulteApp!.vibrate(100);
    }, 150);
    setTimeout(() => {
      window.SchulteApp!.vibrate(100);
    }, 300);
  } else {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  }
}

// 初始化app管理器
export class SchulteAppManager {
  private userId: string | null = null;
  private isApp: boolean = false;

  async init(): Promise<void> {
    this.isApp = isInSchulteApp();
    
    if (this.isApp) {
      try {
        this.userId = await getUserId();
        // 鸿蒙app初始化成功
      } catch (error) {
        console.error('鸿蒙app初始化失败:', error);
      }
    } else {
      // 在浏览器中运行，使用兼容方案
      this.userId = await getUserId();
    }
  }

  // 获取用户ID
  getUserId(): string | null {
    return this.userId;
  }

  // 检查是否在app中
  isInApp(): boolean {
    return this.isApp;
  }

  // 游戏成功反馈
  gameSuccess(audioType: number = 1, vibrateEnabled: boolean = true): void {
    if (audioType !== 0) {
      playSound('success', audioType);
    }
    if (vibrateEnabled) {
      vibrateSuccess();
    }
  }

  // 游戏失败反馈
  gameFailure(audioType: number = 1, vibrateEnabled: boolean = true): void {
    if (audioType !== 0) {
      playSound('warning', audioType);
    }
    if (vibrateEnabled) {
      vibrateFailure();
    }
  }

  // 按钮点击反馈
  buttonClick(audioType: number = 1, vibrateEnabled: boolean = true): void {
    if (audioType !== 0) {
      playSound('button', audioType);
    }
    if (vibrateEnabled) {
      vibrateShort();
    }
  }

  // 错误反馈
  errorFeedback(audioType: number = 1, vibrateEnabled: boolean = true): void {
    if (audioType !== 0) {
      playSound('error', audioType);
    }
    if (vibrateEnabled) {
      vibrateShort();
    }
  }
}

// 创建全局app管理器实例
export const appManager = new SchulteAppManager();
