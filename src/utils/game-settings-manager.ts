// 游戏设置管理工具
// 负责保存和加载用户的游戏选项设置

import type { GameType } from './game-data-manager'

// Schulte游戏设置接口
export interface SchulteSettings {
  sizeOption: number      // 方格尺寸选项索引
  selectedType: number    // 选中效果索引
  background: number      // 背景颜色索引
  vibrate: number         // 震动效果索引
  countdownType: number   // 倒计时索引
  audioType: number       // 音效索引
}

// Memory游戏设置接口
export interface MemorySettings {
  sizeOption: number
  selectedType: number
  background: number
  vibrate: number
  countdownType: number
  audioType: number
}

// Color游戏设置接口
export interface ColorSettings {
  option: number          // 选项数量索引
  interfere: number       // 文字干扰索引
  selectedType: number
  background: number
  vibrate: number
  countdownType: number
  audioType: number
}

// 游戏设置总接口
export interface GameSettings {
  schulte: SchulteSettings
  memory: MemorySettings
  color: ColorSettings
}

// 默认设置
const DEFAULT_SETTINGS: GameSettings = {
  schulte: {
    sizeOption: 0,
    selectedType: 0,
    background: 0,
    vibrate: 0,
    countdownType: 0,
    audioType: 0
  },
  memory: {
    sizeOption: 0,
    selectedType: 0,
    background: 0,
    vibrate: 0,
    countdownType: 0,
    audioType: 0
  },
  color: {
    option: 0,
    interfere: 0,
    selectedType: 0,
    background: 0,
    vibrate: 0,
    countdownType: 0,
    audioType: 0
  }
}

class GameSettingsManager {
  private readonly STORAGE_KEY = 'game_settings'

  // 安全地从localStorage读取数据
  private safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn(`Failed to read from localStorage: ${key}`, error)
      return null
    }
  }

  // 安全地向localStorage写入数据
  private safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`Failed to write to localStorage: ${key}`, error)
      return false
    }
  }

  // 获取所有游戏设置
  private getAllSettings(): GameSettings {
    try {
      const data = this.safeGetItem(this.STORAGE_KEY)
      if (!data) return DEFAULT_SETTINGS
      
      const settings = JSON.parse(data)
      if (typeof settings !== 'object' || settings === null) {
        return DEFAULT_SETTINGS
      }
      
      // 合并默认设置，确保所有字段都存在
      return {
        schulte: { ...DEFAULT_SETTINGS.schulte, ...settings.schulte },
        memory: { ...DEFAULT_SETTINGS.memory, ...settings.memory },
        color: { ...DEFAULT_SETTINGS.color, ...settings.color }
      }
    } catch (error) {
      console.warn('Failed to parse game settings', error)
      return DEFAULT_SETTINGS
    }
  }

  // 保存所有游戏设置
  private saveAllSettings(settings: GameSettings): boolean {
    try {
      return this.safeSetItem(this.STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to save game settings', error)
      return false
    }
  }

  // 获取特定游戏的设置
  getGameSettings(gameType: GameType): SchulteSettings | MemorySettings | ColorSettings {
    const allSettings = this.getAllSettings()
    return allSettings[gameType]
  }

  // 保存特定游戏的设置
  saveGameSettings(gameType: GameType, settings: SchulteSettings | MemorySettings | ColorSettings): boolean {
    try {
      const allSettings = this.getAllSettings()
      allSettings[gameType] = settings as any
      return this.saveAllSettings(allSettings)
    } catch (error) {
      console.warn(`Failed to save ${gameType} settings`, error)
      return false
    }
  }

  // 重置特定游戏的设置
  resetGameSettings(gameType: GameType): boolean {
    try {
      const allSettings = this.getAllSettings()
      allSettings[gameType] = DEFAULT_SETTINGS[gameType] as any
      return this.saveAllSettings(allSettings)
    } catch (error) {
      console.warn(`Failed to reset ${gameType} settings`, error)
      return false
    }
  }

  // 重置所有游戏设置
  resetAllSettings(): boolean {
    try {
      return this.saveAllSettings(DEFAULT_SETTINGS)
    } catch (error) {
      console.warn('Failed to reset all settings', error)
      return false
    }
  }

  // 导出设置（用于备份）
  exportSettings(): GameSettings {
    return this.getAllSettings()
  }

  // 导入设置（用于恢复）
  importSettings(settings: GameSettings): boolean {
    try {
      // 验证设置格式
      if (typeof settings !== 'object' || !settings.schulte || !settings.memory || !settings.color) {
        throw new Error('Invalid settings format')
      }
      
      return this.saveAllSettings(settings)
    } catch (error) {
      console.warn('Failed to import settings', error)
      return false
    }
  }
}

// 创建全局实例
export const gameSettingsManager = new GameSettingsManager()
