// 签到系统管理工具
// 负责用户签到数据的存储、统计和管理

import dayjs from 'dayjs'
import type { GameType } from './game-data-manager'

// 签到记录接口
export interface CheckInRecord {
  date: string        // 签到日期 YYYY-MM-DD
  timestamp: number   // 签到时间戳
  gameType: GameType  // 触发签到的游戏类型
  streak: number      // 当时的连续签到天数
}

// 签到统计数据
export interface CheckInStats {
  totalDays: number       // 总签到天数
  currentStreak: number   // 当前连续签到天数
  maxStreak: number      // 最长连续签到天数
  lastCheckIn: string    // 最后签到日期 YYYY-MM-DD
  thisMonthCount: number // 本月签到天数
  thisWeekCount: number  // 本周签到天数
}

class CheckInManager {
  private readonly STORAGE_KEY = 'checkin_records'
  private readonly STATS_KEY = 'checkin_stats'

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

  // 获取所有签到记录
  private getCheckInRecords(): CheckInRecord[] {
    try {
      const data = this.safeGetItem(this.STORAGE_KEY)
      if (!data) return []
      
      const records = JSON.parse(data)
      if (!Array.isArray(records)) return []
      
      return records
    } catch (error) {
      console.warn('Failed to parse check-in records', error)
      return []
    }
  }

  // 保存签到记录
  private saveCheckInRecords(records: CheckInRecord[]): boolean {
    try {
      return this.safeSetItem(this.STORAGE_KEY, JSON.stringify(records))
    } catch (error) {
      console.warn('Failed to save check-in records', error)
      return false
    }
  }

  // 获取签到统计数据
  private getCheckInStats(): CheckInStats {
    try {
      const data = this.safeGetItem(this.STATS_KEY)
      if (!data) {
        return {
          totalDays: 0,
          currentStreak: 0,
          maxStreak: 0,
          lastCheckIn: '',
          thisMonthCount: 0,
          thisWeekCount: 0
        }
      }
      
      const stats = JSON.parse(data)
      return {
        totalDays: stats.totalDays || 0,
        currentStreak: stats.currentStreak || 0,
        maxStreak: stats.maxStreak || 0,
        lastCheckIn: stats.lastCheckIn || '',
        thisMonthCount: stats.thisMonthCount || 0,
        thisWeekCount: stats.thisWeekCount || 0
      }
    } catch (error) {
      console.warn('Failed to parse check-in stats', error)
      return {
        totalDays: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastCheckIn: '',
        thisMonthCount: 0,
        thisWeekCount: 0
      }
    }
  }

  // 保存签到统计数据
  private saveCheckInStats(stats: CheckInStats): boolean {
    try {
      return this.safeSetItem(this.STATS_KEY, JSON.stringify(stats))
    } catch (error) {
      console.warn('Failed to save check-in stats', error)
      return false
    }
  }

  // 计算连续签到天数
  private calculateStreak(records: CheckInRecord[], currentDate: string): number {
    if (records.length === 0) return 1

    // 按日期排序（最新的在前）
    const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp)
    
    let streak = 1
    let checkDate = dayjs(currentDate)
    
    for (const record of sortedRecords) {
      const recordDate = dayjs(record.date)
      const expectedDate = checkDate.subtract(1, 'day')
      
      if (recordDate.format('YYYY-MM-DD') === expectedDate.format('YYYY-MM-DD')) {
        streak++
        checkDate = expectedDate
      } else {
        break
      }
    }
    
    return streak
  }

  // 检查今天是否已签到
  isTodayCheckedIn(): boolean {
    const today = dayjs().format('YYYY-MM-DD')
    const records = this.getCheckInRecords()
    
    return records.some(record => record.date === today)
  }

  // 执行签到
  checkIn(gameType: GameType): boolean {
    const today = dayjs().format('YYYY-MM-DD')
    const now = Date.now()
    
    // 检查今天是否已签到
    if (this.isTodayCheckedIn()) {
      return false // 已经签到过了
    }

    try {
      const records = this.getCheckInRecords()
      const stats = this.getCheckInStats()
      
      // 计算连续签到天数
      const currentStreak = this.calculateStreak(records, today)
      
      // 创建新的签到记录
      const newRecord: CheckInRecord = {
        date: today,
        timestamp: now,
        gameType,
        streak: currentStreak
      }
      
      // 更新记录
      records.push(newRecord)
      
      // 更新统计数据
      const newStats: CheckInStats = {
        totalDays: stats.totalDays + 1,
        currentStreak,
        maxStreak: Math.max(stats.maxStreak, currentStreak),
        lastCheckIn: today,
        thisMonthCount: this.getThisMonthCount(records),
        thisWeekCount: this.getThisWeekCount(records)
      }
      
      // 保存数据
      const recordsSaved = this.saveCheckInRecords(records)
      const statsSaved = this.saveCheckInStats(newStats)
      
      return recordsSaved && statsSaved
    } catch (error) {
      console.warn('Failed to check in', error)
      return false
    }
  }

  // 获取本月签到天数
  private getThisMonthCount(records: CheckInRecord[]): number {
    const thisMonth = dayjs().format('YYYY-MM')
    return records.filter(record => 
      dayjs(record.date).format('YYYY-MM') === thisMonth
    ).length
  }

  // 获取本周签到天数
  private getThisWeekCount(records: CheckInRecord[]): number {
    const startOfWeek = dayjs().startOf('week')
    const endOfWeek = dayjs().endOf('week')
    
    return records.filter(record => {
      const recordDate = dayjs(record.date)
      return recordDate.isAfter(startOfWeek) && recordDate.isBefore(endOfWeek)
    }).length
  }

  // 获取签到统计（公开方法）
  getStats(): CheckInStats {
    const stats = this.getCheckInStats()
    const records = this.getCheckInRecords()
    
    // 实时计算本月和本周数据
    return {
      ...stats,
      thisMonthCount: this.getThisMonthCount(records),
      thisWeekCount: this.getThisWeekCount(records)
    }
  }

  // 获取指定月份的签到记录
  getMonthRecords(year: number, month: number): CheckInRecord[] {
    const records = this.getCheckInRecords()
    const targetMonth = dayjs(`${year}-${month.toString().padStart(2, '0')}-01`)
    
    return records.filter(record => {
      const recordDate = dayjs(record.date)
      return recordDate.year() === year && recordDate.month() === month - 1
    })
  }

  // 获取指定日期范围的签到记录
  getRecordsByDateRange(startDate: string, endDate: string): CheckInRecord[] {
    const records = this.getCheckInRecords()
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    
    return records.filter(record => {
      const recordDate = dayjs(record.date)
      return recordDate.isAfter(start.subtract(1, 'day')) && 
             recordDate.isBefore(end.add(1, 'day'))
    })
  }

  // 获取所有签到记录（公开方法）
  getAllRecords(): CheckInRecord[] {
    return this.getCheckInRecords()
  }

  // 检查是否需要重置连续签到（用于处理跨天情况）
  checkAndResetStreak(): void {
    const stats = this.getCheckInStats()
    const today = dayjs().format('YYYY-MM-DD')
    
    if (stats.lastCheckIn) {
      const lastCheckInDate = dayjs(stats.lastCheckIn)
      const yesterday = dayjs().subtract(1, 'day')
      
      // 如果最后签到不是昨天，则重置连续签到
      if (lastCheckInDate.isBefore(yesterday, 'day')) {
        const newStats: CheckInStats = {
          ...stats,
          currentStreak: 0
        }
        this.saveCheckInStats(newStats)
      }
    }
  }

  // 获取签到日历数据（用于日历组件）
  getCalendarData(year: number, month: number): Record<string, CheckInRecord> {
    const records = this.getMonthRecords(year, month)
    const calendarData: Record<string, CheckInRecord> = {}
    
    records.forEach(record => {
      calendarData[record.date] = record
    })
    
    return calendarData
  }
}

// 创建全局实例
export const checkInManager = new CheckInManager()
