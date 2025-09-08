// 游戏数据管理工具
// 负责localStorage的数据存储、读取和统计分析

import dayjs from 'dayjs'

// 游戏类型
export type GameType = 'schulte' | 'memory' | 'color'

// 基础游戏记录接口
export interface BaseGameRecord {
  duration: number
  size: number
  createdTime: number
  errorCount: number  // 错误次数
}

// Schulte游戏记录
export interface SchulteRecord extends BaseGameRecord {}

// Memory游戏记录
export interface MemoryRecord extends BaseGameRecord {}

// Color游戏记录
export interface ColorRecord extends BaseGameRecord {
  option: number     // 选项数量
  interfere: number  // 是否开启文字干扰 (0/1)
}

// 游戏记录联合类型
export type GameRecord = SchulteRecord | MemoryRecord | ColorRecord

// 个人最佳记录类型
export interface PersonalBest {
  [size: number]: number  // size -> duration
}

// 游戏统计数据
export interface GameStatistics {
  currentDuration: number      // 本次练习用时
  currentErrors: number        // 本次错误次数
  personalBest: number | null  // 个人最好成绩
  todayCount: number          // 今天第几次练习
  todayBest: number | null    // 当天最好成绩
  averageErrors: number | null // 平均错误次数
}

class GameDataManager {
  private readonly MAX_RECORDS = 1000  // 最多存储1000条记录

  // 获取游戏记录的localStorage key
  private getRecordsKey(gameType: GameType): string {
    return `${gameType}_records`
  }

  // 获取个人最佳记录的localStorage key
  private getBestKey(gameType: GameType): string {
    return `${gameType}_best`
  }

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

  // 读取游戏记录
  private getGameRecords(gameType: GameType): GameRecord[] {
    try {
      const key = this.getRecordsKey(gameType)
      const data = this.safeGetItem(key)
      if (!data) return []
      
      const records = JSON.parse(data)
      if (!Array.isArray(records)) return []
      
      return records
    } catch (error) {
      console.warn(`Failed to parse game records for ${gameType}`, error)
      return []
    }
  }

  // 保存游戏记录
  private saveGameRecords(gameType: GameType, records: GameRecord[]): boolean {
    try {
      const key = this.getRecordsKey(gameType)
      // 限制记录数量，只保留最近的1000条
      const limitedRecords = records.slice(-this.MAX_RECORDS)
      return this.safeSetItem(key, JSON.stringify(limitedRecords))
    } catch (error) {
      console.warn(`Failed to save game records for ${gameType}`, error)
      return false
    }
  }

  // 读取个人最佳记录
  private getPersonalBest(gameType: GameType): PersonalBest {
    try {
      const key = this.getBestKey(gameType)
      const data = this.safeGetItem(key)
      if (!data) return {}
      
      const best = JSON.parse(data)
      if (typeof best !== 'object' || best === null) return {}
      
      return best
    } catch (error) {
      console.warn(`Failed to parse personal best for ${gameType}`, error)
      return {}
    }
  }

  // 保存个人最佳记录
  private savePersonalBest(gameType: GameType, best: PersonalBest): boolean {
    try {
      const key = this.getBestKey(gameType)
      return this.safeSetItem(key, JSON.stringify(best))
    } catch (error) {
      console.warn(`Failed to save personal best for ${gameType}`, error)
      return false
    }
  }

  // 检查是否是同一天
  private isSameDay(timestamp1: number, timestamp2: number): boolean {
    return dayjs(timestamp1).format('YYYY-MM-DD') === dayjs(timestamp2).format('YYYY-MM-DD')
  }

  // 添加游戏记录
  addGameRecord(gameType: GameType, record: GameRecord): boolean {
    try {
      // 读取现有记录
      const records = this.getGameRecords(gameType)
      
      // 添加新记录
      records.push(record)
      
      // 保存记录
      const saved = this.saveGameRecords(gameType, records)
      if (!saved) return false

      // 更新个人最佳记录
      this.updatePersonalBest(gameType, record.size, record.duration)
      
      return true
    } catch (error) {
      console.warn(`Failed to add game record for ${gameType}`, error)
      return false
    }
  }

  // 更新个人最佳记录
  private updatePersonalBest(gameType: GameType, size: number, duration: number): void {
    try {
      const best = this.getPersonalBest(gameType)
      
      // 如果没有该size的记录，或者新时间更好，则更新
      if (!best[size] || duration < best[size]) {
        best[size] = duration
        this.savePersonalBest(gameType, best)
      }
    } catch (error) {
      console.warn(`Failed to update personal best for ${gameType}`, error)
    }
  }

  // 获取游戏统计数据
  getGameStatistics(gameType: GameType, currentDuration: number, currentSize: number, currentErrors: number = 0): GameStatistics {
    try {
      const records = this.getGameRecords(gameType)
      const best = this.getPersonalBest(gameType)
      const now = Date.now()
      
      // 个人最好成绩（当前size）
      const personalBest = best[currentSize] || null
      
      // 今天的练习次数 (当前记录已经在records中了)
      const todayRecords = records.filter(record => 
        this.isSameDay(record.createdTime, now)
      )
      const todayCount = todayRecords.length
      
      // 当天最好成绩（当前size）
      const todaySizeRecords = todayRecords.filter(record => 
        record.size === currentSize
      )
      let todayBest: number | null = null
      if (todaySizeRecords.length > 0) {
        todayBest = Math.min(...todaySizeRecords.map(r => r.duration))
        // 如果当前成绩更好，则更新
        if (currentDuration < todayBest) {
          todayBest = currentDuration
        }
      } else {
        // 今天第一次玩这个size
        todayBest = currentDuration
      }
      
      // 计算平均错误次数
      let averageErrors: number | null = null
      if (records.length > 0) {
        const totalErrors = records.reduce((sum, r) => sum + (r.errorCount || 0), 0)
        averageErrors = Math.round((totalErrors / records.length) * 10) / 10 // 保留1位小数
      }
      
      return {
        currentDuration,
        currentErrors,
        personalBest,
        todayCount,
        todayBest,
        averageErrors
      }
    } catch (error) {
      console.warn(`Failed to get game statistics for ${gameType}`, error)
      // 返回安全的默认值
      return {
        currentDuration,
        currentErrors,
        personalBest: null,
        todayCount: 1,
        todayBest: null,
        averageErrors: null
      }
    }
  }

  // 清理过期数据（可选功能，用于清理太旧的数据）
  cleanOldRecords(gameType: GameType, daysToKeep: number = 365): boolean {
    try {
      const records = this.getGameRecords(gameType)
      const cutoffTime = dayjs().subtract(daysToKeep, 'day').valueOf()
      
      const filteredRecords = records.filter(record => 
        record.createdTime >= cutoffTime
      )
      
      return this.saveGameRecords(gameType, filteredRecords)
    } catch (error) {
      console.warn(`Failed to clean old records for ${gameType}`, error)
      return false
    }
  }

  // 导出数据（用于备份）
  exportGameData(gameType: GameType): { records: GameRecord[], best: PersonalBest } | null {
    try {
      const records = this.getGameRecords(gameType)
      const best = this.getPersonalBest(gameType)
      
      return { records, best }
    } catch (error) {
      console.warn(`Failed to export game data for ${gameType}`, error)
      return null
    }
  }

  // 导入数据（用于恢复）
  importGameData(gameType: GameType, data: { records: GameRecord[], best: PersonalBest }): boolean {
    try {
      const savedRecords = this.saveGameRecords(gameType, data.records)
      const savedBest = this.savePersonalBest(gameType, data.best)
      
      return savedRecords && savedBest
    } catch (error) {
      console.warn(`Failed to import game data for ${gameType}`, error)
      return false
    }
  }

  // 获取所有游戏记录（公开方法）
  getAllGameRecords(gameType: GameType): GameRecord[] {
    return this.getGameRecords(gameType)
  }
}

// 创建全局实例
export const gameDataManager = new GameDataManager()
