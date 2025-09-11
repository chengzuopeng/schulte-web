// 奖章系统管理工具
// 负责奖章数据的存储、检查和管理

import dayjs from 'dayjs'
import type { SchulteRecord, GameType, BaseGameRecord } from './game-data-manager'

// 奖章稀有度
export enum MedalRarity {
  BRONZE = 'bronze',
  SILVER = 'silver', 
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

// 奖章分类
export enum MedalCategory {
  SPEED = 'speed',
  ACCURACY = 'accuracy',
  PERSISTENCE = 'persistence',
  MASTERY = 'mastery',
  SPECIAL = 'special'
}

// 奖章配置接口
export interface MedalConfig {
  id: string
  name: string
  description: string
  icon: string
  category: MedalCategory
  rarity: MedalRarity
  checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => boolean
  getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => number
  requirement: any // 具体要求数据，用于显示进度
}

// 用户奖章数据
export interface UserMedal {
  id: string
  unlocked: boolean
  unlockedAt?: number
  progress: number
}

// 奖章配置定义
const MEDAL_CONFIGS: MedalConfig[] = [
  // 速度类奖章
  {
    id: 'lightning_rookie',
    name: '闪电新手',
    description: '在专注练习3x3网格中，用时少于4秒',
    icon: '⚡',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.BRONZE,
    requirement: { gridSize: 3, targetTime: 4000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 3 && record.duration < 4000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 3)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 4000) return 100
      
      // 进度计算：假设30秒为起点，4秒为目标
      const startTime = 30000
      const targetTime = 4000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  {
    id: 'swift_youth',
    name: '疾风少年',
    description: '在专注练习4x4网格中，用时少于13秒完成',
    icon: '⚡',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.SILVER,
    requirement: { gridSize: 4, targetTime: 13000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 4 && record.duration < 13000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 4)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 13000) return 100
      
      const startTime = 60000
      const targetTime = 13000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  {
    id: 'speed_master',
    name: '速度大师',
    description: '在专注练习5x5网格中，用时少于24秒完成',
    icon: '🚀',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.GOLD,
    requirement: { gridSize: 5, targetTime: 24000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 5 && record.duration < 24000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 5)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 24000) return 100
      
      const startTime = 120000
      const targetTime = 24000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  // 准确性类奖章
  {
    id: 'perfect_shot',
    name: '零失误者',
    description: '连续10次游戏零错误完成',
    icon: '🎯',
    category: MedalCategory.ACCURACY,
    rarity: MedalRarity.SILVER,
    requirement: { consecutiveCount: 10 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      if (allRecords.length < 10) return false
      
      // 检查最近10次游戏是否都是零错误
      const recent10 = allRecords.slice(-10)
      return recent10.every(record => (record.errorCount || 0) === 0)
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      
      // 从最后一条记录开始往前计算连续零错误次数
      let consecutiveCount = 0
      for (let i = allRecords.length - 1; i >= 0; i--) {
        if ((allRecords[i].errorCount || 0) === 0) {
          consecutiveCount++
        } else {
          break
        }
      }
      
      return Math.min(100, (consecutiveCount / 10) * 100)
    }
  },

  {
    id: 'perfectionist',
    name: '完美主义',
    description: '累计完成100次零错误游戏',
    icon: '💎',
    category: MedalCategory.ACCURACY,
    rarity: MedalRarity.PLATINUM,
    requirement: { totalCount: 100 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const zeroErrorCount = allRecords.filter(record => 
        (record.errorCount || 0) === 0
      ).length
      
      return zeroErrorCount >= 100
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const zeroErrorCount = allRecords.filter(record => 
        (record.errorCount || 0) === 0
      ).length
      
      return Math.min(100, (zeroErrorCount / 100) * 100)
    }
  },

  // 坚持类奖章
  {
    id: 'diligent_trainer',
    name: '勤奋习者',
    description: '连续7天每天至少完成1次训练',
    icon: '📅',
    category: MedalCategory.PERSISTENCE,
    rarity: MedalRarity.BRONZE,
    requirement: { consecutiveDays: 7 },
    checkCondition: (records: SchulteRecord[]) => {
      if (records.length === 0) return false
      
      // 按日期分组
      const dailyRecords: Record<string, SchulteRecord[]> = {}
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = []
        }
        dailyRecords[date].push(record)
      })
      
      const dates = Object.keys(dailyRecords).sort()
      if (dates.length < 7) return false
      
      // 检查是否有连续7天
      let consecutiveDays = 1
      let maxConsecutive = 1
      
      for (let i = 1; i < dates.length; i++) {
        const prevDate = dayjs(dates[i - 1])
        const currentDate = dayjs(dates[i])
        
        if (currentDate.diff(prevDate, 'day') === 1) {
          consecutiveDays++
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
        } else {
          consecutiveDays = 1
        }
      }
      
      return maxConsecutive >= 7
    },
    getProgress: (records: SchulteRecord[]) => {
      if (records.length === 0) return 0
      
      const dailyRecords: Record<string, SchulteRecord[]> = {}
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = []
        }
        dailyRecords[date].push(record)
      })
      
      const dates = Object.keys(dailyRecords).sort()
      if (dates.length === 0) return 0
      
      let consecutiveDays = 1
      let maxConsecutive = 1
      
      for (let i = 1; i < dates.length; i++) {
        const prevDate = dayjs(dates[i - 1])
        const currentDate = dayjs(dates[i])
        
        if (currentDate.diff(prevDate, 'day') === 1) {
          consecutiveDays++
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
        } else {
          consecutiveDays = 1
        }
      }
      
      return Math.min(100, (maxConsecutive / 7) * 100)
    }
  },

  {
    id: 'hundred_forged',
    name: '百炼成钢',
    description: '累计完成500次训练',
    icon: '🏆',
    category: MedalCategory.PERSISTENCE,
    rarity: MedalRarity.GOLD,
    requirement: { totalCount: 500 },
    checkCondition: (records: SchulteRecord[]) => {
      return records.length >= 500
    },
    getProgress: (records: SchulteRecord[]) => {
      return Math.min(100, (records.length / 500) * 100)
    }
  },

  // 精通类奖章
  {
    id: 'all_rounder',
    name: '全能选手',
    description: '在专注练习3x3到8x8所有网格尺寸中都有记录',
    icon: '🌟',
    category: MedalCategory.MASTERY,
    rarity: MedalRarity.SILVER,
    requirement: { allSizes: [3, 4, 5, 6, 7, 8] },
    checkCondition: (records: SchulteRecord[]) => {
      const sizes = new Set(records.map(record => record.size))
      const requiredSizes = [3, 4, 5, 6, 7, 8]
      
      return requiredSizes.every(size => sizes.has(size))
    },
    getProgress: (records: SchulteRecord[]) => {
      const sizes = new Set(records.map(record => record.size))
      const requiredSizes = [3, 4, 5, 6, 7, 8]
      const completedSizes = requiredSizes.filter(size => sizes.has(size))
      
      return (completedSizes.length / requiredSizes.length) * 100
    }
  },

  {
    id: 'royal_glory',
    name: '王者荣耀',
    description: '在专注练习任意网格尺寸中达到"王者"段位',
    icon: '👑',
    category: MedalCategory.MASTERY,
    rarity: MedalRarity.DIAMOND,
    requirement: { targetScore: 99 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => (record.score || 0) >= 99)
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const maxScore = Math.max(...allRecords.map(r => r.score || 0).concat([0]))
      
      if (maxScore >= 99) return 100
      
      // 以85分为起点，99分为目标
      const startScore = 85
      const targetScore = 99
      const progress = Math.max(0, (maxScore - startScore) / (targetScore - startScore) * 100)
      return Math.min(100, progress)
    }
  },

  // 特殊类奖章
  {
    id: 'first_breakthrough',
    name: '首次突破',
    description: '完成第一次训练',
    icon: '🎉',
    category: MedalCategory.SPECIAL,
    rarity: MedalRarity.BRONZE,
    requirement: { firstGame: true },
    checkCondition: (records: SchulteRecord[]) => {
      return records.length >= 1
    },
    getProgress: (records: SchulteRecord[]) => {
      return records.length >= 1 ? 100 : 0
    }
  },

  {
    id: 'rising_star',
    name: '进步之星',
    description: '单日内在同一网格尺寸中，最后一次成绩比第一次成绩提升50%以上',
    icon: '⭐',
    category: MedalCategory.SPECIAL,
    rarity: MedalRarity.GOLD,
    requirement: { improvementRate: 50 },
    checkCondition: (records: SchulteRecord[]) => {
      // 按日期和网格尺寸分组
      const dailyRecords: Record<string, Record<number, SchulteRecord[]>> = {}
      
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = {}
        }
        if (!dailyRecords[date][record.size]) {
          dailyRecords[date][record.size] = []
        }
        dailyRecords[date][record.size].push(record)
      })
      
      // 检查每一天的每个尺寸
      for (const date in dailyRecords) {
        for (const size in dailyRecords[date]) {
          const dayRecords = dailyRecords[date][size]
          if (dayRecords.length >= 2) {
            // 按时间排序
            dayRecords.sort((a, b) => a.createdTime - b.createdTime)
            const firstRecord = dayRecords[0]
            const lastRecord = dayRecords[dayRecords.length - 1]
            
            // 计算提升幅度
            const improvement = (firstRecord.duration - lastRecord.duration) / firstRecord.duration * 100
            if (improvement >= 50) {
              return true
            }
          }
        }
      }
      
      return false
    },
    getProgress: (records: SchulteRecord[]) => {
      let maxImprovement = 0
      
      const dailyRecords: Record<string, Record<number, SchulteRecord[]>> = {}
      
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = {}
        }
        if (!dailyRecords[date][record.size]) {
          dailyRecords[date][record.size] = []
        }
        dailyRecords[date][record.size].push(record)
      })
      
      for (const date in dailyRecords) {
        for (const size in dailyRecords[date]) {
          const dayRecords = dailyRecords[date][size]
          if (dayRecords.length >= 2) {
            dayRecords.sort((a, b) => a.createdTime - b.createdTime)
            const firstRecord = dayRecords[0]
            const lastRecord = dayRecords[dayRecords.length - 1]
            
            const improvement = (firstRecord.duration - lastRecord.duration) / firstRecord.duration * 100
            maxImprovement = Math.max(maxImprovement, improvement)
          }
        }
      }
      
      return Math.min(100, (maxImprovement / 50) * 100)
    }
  },

  // 新增的9个奖章
  
  // 速度类 (3个)
  {
    id: 'legend_speed',
    name: '极速传说',
    description: '在专注练习6x6网格中，用时少于60秒',
    icon: '⚡',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.PLATINUM,
    requirement: { gridSize: 6, targetTime: 60000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 6 && record.duration < 60000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 6)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 60000) return 100
      
      const startTime = 300000
      const targetTime = 60000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  {
    id: 'storm_eye',
    name: '风暴之眼',
    description: '在专注练习7x7网格中，用时少于150秒',
    icon: '🌪️',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.PLATINUM,
    requirement: { gridSize: 7, targetTime: 150000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 7 && record.duration < 150000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 7)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 150000) return 100
      
      const startTime = 600000
      const targetTime = 150000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  {
    id: 'light_speed',
    name: '光速突破',
    description: '在专注练习8x8网格中，用时少于300秒',
    icon: '⭐',
    category: MedalCategory.SPEED,
    rarity: MedalRarity.DIAMOND,
    requirement: { gridSize: 8, targetTime: 300000 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size === 8 && record.duration < 300000
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const bestTime = Math.min(...allRecords
        .filter(r => r.size === 8)
        .map(r => r.duration)
        .concat([Infinity]))
      
      if (bestTime === Infinity) return 0
      if (bestTime < 300000) return 100
      
      const startTime = 1200000
      const targetTime = 300000
      const progress = Math.max(0, (startTime - bestTime) / (startTime - targetTime) * 100)
      return Math.min(100, progress)
    }
  },

  // 准确性类 (2个) - 三个游戏共有
  {
    id: 'sharpshooter',
    name: '神射手',
    description: '单次游戏中完成高难度训练且零错误',
    icon: '🎯',
    category: MedalCategory.ACCURACY,
    rarity: MedalRarity.GOLD,
    requirement: { consecutiveCorrect: 50 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      // 这个奖章需要在游戏过程中实时检查，这里简化为检查大网格的零错误记录
      const allRecords = currentRecord ? [...records, currentRecord] : records
      return allRecords.some(record => 
        record.size >= 6 && (record.errorCount || 0) === 0
      )
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const largeGridZeroError = allRecords.filter(record => 
        record.size >= 6 && (record.errorCount || 0) === 0
      ).length
      
      return Math.min(100, (largeGridZeroError / 1) * 100)
    }
  },

  {
    id: 'flawless_master',
    name: '完美无瑕',
    description: '累计完成500次零错误训练',
    icon: '💯',
    category: MedalCategory.ACCURACY,
    rarity: MedalRarity.PLATINUM,
    requirement: { totalCount: 500 },
    checkCondition: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const zeroErrorCount = allRecords.filter(record => 
        (record.errorCount || 0) === 0
      ).length
      
      return zeroErrorCount >= 500
    },
    getProgress: (records: SchulteRecord[], currentRecord?: SchulteRecord) => {
      const allRecords = currentRecord ? [...records, currentRecord] : records
      const zeroErrorCount = allRecords.filter(record => 
        (record.errorCount || 0) === 0
      ).length
      
      return Math.min(100, (zeroErrorCount / 500) * 100)
    }
  },

  // 坚持类 (2个) - 三个游戏共有
  {
    id: 'monthly_warrior',
    name: '月度勇士',
    description: '连续30天每天至少完成1次训练',
    icon: '🔥',
    category: MedalCategory.PERSISTENCE,
    rarity: MedalRarity.GOLD,
    requirement: { consecutiveDays: 30 },
    checkCondition: (records: SchulteRecord[]) => {
      if (records.length === 0) return false
      
      const dailyRecords: Record<string, SchulteRecord[]> = {}
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = []
        }
        dailyRecords[date].push(record)
      })
      
      const dates = Object.keys(dailyRecords).sort()
      if (dates.length < 30) return false
      
      let consecutiveDays = 1
      let maxConsecutive = 1
      
      for (let i = 1; i < dates.length; i++) {
        const prevDate = dayjs(dates[i - 1])
        const currentDate = dayjs(dates[i])
        
        if (currentDate.diff(prevDate, 'day') === 1) {
          consecutiveDays++
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
        } else {
          consecutiveDays = 1
        }
      }
      
      return maxConsecutive >= 30
    },
    getProgress: (records: SchulteRecord[]) => {
      if (records.length === 0) return 0
      
      const dailyRecords: Record<string, SchulteRecord[]> = {}
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = []
        }
        dailyRecords[date].push(record)
      })
      
      const dates = Object.keys(dailyRecords).sort()
      if (dates.length === 0) return 0
      
      let consecutiveDays = 1
      let maxConsecutive = 1
      
      for (let i = 1; i < dates.length; i++) {
        const prevDate = dayjs(dates[i - 1])
        const currentDate = dayjs(dates[i])
        
        if (currentDate.diff(prevDate, 'day') === 1) {
          consecutiveDays++
          maxConsecutive = Math.max(maxConsecutive, consecutiveDays)
        } else {
          consecutiveDays = 1
        }
      }
      
      return Math.min(100, (maxConsecutive / 30) * 100)
    }
  },

  {
    id: 'annual_legend',
    name: '年度传奇',
    description: '累计完成2000次训练',
    icon: '👑',
    category: MedalCategory.PERSISTENCE,
    rarity: MedalRarity.DIAMOND,
    requirement: { totalCount: 2000 },
    checkCondition: (records: SchulteRecord[]) => {
      return records.length >= 2000
    },
    getProgress: (records: SchulteRecord[]) => {
      return Math.min(100, (records.length / 2000) * 100)
    }
  },

  // 特殊类 (2个) - 三个游戏共有
  {
    id: 'multi_master',
    name: '多元大师',
    description: '在同一天内完成所有不同难度的训练',
    icon: '🎊',
    category: MedalCategory.SPECIAL,
    rarity: MedalRarity.PLATINUM,
    requirement: { allSizesOneDay: [3, 4, 5, 6, 7, 8] },
    checkCondition: (records: SchulteRecord[]) => {
      const dailyRecords: Record<string, Set<number>> = {}
      
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = new Set()
        }
        dailyRecords[date].add(record.size)
      })
      
      const requiredSizes = [3, 4, 5, 6, 7, 8]
      
      for (const date in dailyRecords) {
        const sizesInDay = dailyRecords[date]
        if (requiredSizes.every(size => sizesInDay.has(size))) {
          return true
        }
      }
      
      return false
    },
    getProgress: (records: SchulteRecord[]) => {
      const dailyRecords: Record<string, Set<number>> = {}
      
      records.forEach(record => {
        const date = dayjs(record.createdTime).format('YYYY-MM-DD')
        if (!dailyRecords[date]) {
          dailyRecords[date] = new Set()
        }
        dailyRecords[date].add(record.size)
      })
      
      const requiredSizes = [3, 4, 5, 6, 7, 8]
      let maxSizesInOneDay = 0
      
      for (const date in dailyRecords) {
        const sizesInDay = dailyRecords[date]
        const completedSizes = requiredSizes.filter(size => sizesInDay.has(size))
        maxSizesInOneDay = Math.max(maxSizesInOneDay, completedSizes.length)
      }
      
      return (maxSizesInOneDay / requiredSizes.length) * 100
    }
  },

  {
    id: 'time_traveler',
    name: '时间旅行者',
    description: '在不同时段都有训练记录，累计跨越7个不同的小时段',
    icon: '🌟',
    category: MedalCategory.SPECIAL,
    rarity: MedalRarity.GOLD,
    requirement: { timeSlots: 7 },
    checkCondition: (records: SchulteRecord[]) => {
      const hourSlots = new Set<number>()
      
      records.forEach(record => {
        const hour = dayjs(record.createdTime).hour()
        hourSlots.add(hour)
      })
      
      return hourSlots.size >= 7
    },
    getProgress: (records: SchulteRecord[]) => {
      const hourSlots = new Set<number>()
      
      records.forEach(record => {
        const hour = dayjs(record.createdTime).hour()
        hourSlots.add(hour)
      })
      
      return Math.min(100, (hourSlots.size / 7) * 100)
    }
  }
]

class MedalManager {
  private readonly STORAGE_KEY = 'user_medals'

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

  // 获取用户奖章数据
  private getUserMedals(): Record<string, UserMedal> {
    try {
      const data = this.safeGetItem(this.STORAGE_KEY)
      if (!data) return {}
      
      const medals = JSON.parse(data)
      if (typeof medals !== 'object' || medals === null) return {}
      
      return medals
    } catch (error) {
      console.warn('Failed to parse user medals', error)
      return {}
    }
  }

  // 保存用户奖章数据
  private saveUserMedals(medals: Record<string, UserMedal>): boolean {
    try {
      return this.safeSetItem(this.STORAGE_KEY, JSON.stringify(medals))
    } catch (error) {
      console.warn('Failed to save user medals', error)
      return false
    }
  }

  // 检查奖章状态（支持三个游戏类型）
  checkMedalsForAllGames(gameType: GameType, existingRecords: BaseGameRecord[], newRecord: BaseGameRecord): string[] {
    // 将所有记录转换为SchulteRecord格式进行检查
    const convertedExisting = this.convertToSchulteRecords(existingRecords)
    const convertedNew = this.convertToSchulteRecord(newRecord)
    
    return this.checkMedals(convertedExisting, convertedNew)
  }

  // 将BaseGameRecord转换为SchulteRecord格式
  private convertToSchulteRecords(records: BaseGameRecord[]): SchulteRecord[] {
    return records.map(record => this.convertToSchulteRecord(record))
  }

  private convertToSchulteRecord(record: BaseGameRecord): SchulteRecord {
    return {
      duration: record.duration,
      size: record.size,
      createdTime: record.createdTime,
      errorCount: record.errorCount || 0,
      score: (record as any).score || 0
    }
  }

  // 检查并更新奖章状态
  checkMedals(records: SchulteRecord[], currentRecord?: SchulteRecord): string[] {
    const userMedals = this.getUserMedals()
    const newlyUnlocked: string[] = []
    
    MEDAL_CONFIGS.forEach(config => {
      const currentMedal = userMedals[config.id] || {
        id: config.id,
        unlocked: false,
        progress: 0
      }
      
      // 更新进度
      const newProgress = config.getProgress(records, currentRecord)
      currentMedal.progress = newProgress
      
      // 检查是否解锁
      if (!currentMedal.unlocked && config.checkCondition(records, currentRecord)) {
        currentMedal.unlocked = true
        currentMedal.unlockedAt = Date.now()
        newlyUnlocked.push(config.id)
      }
      
      userMedals[config.id] = currentMedal
    })
    
    // 保存更新后的数据
    this.saveUserMedals(userMedals)
    
    return newlyUnlocked
  }

  // 获取所有奖章配置
  getAllMedalConfigs(): MedalConfig[] {
    return MEDAL_CONFIGS
  }

  // 获取奖章配置
  getMedalConfig(medalId: string): MedalConfig | undefined {
    return MEDAL_CONFIGS.find(config => config.id === medalId)
  }

  // 获取用户特定奖章数据
  getUserMedal(medalId: string): UserMedal | undefined {
    const userMedals = this.getUserMedals()
    return userMedals[medalId]
  }

  // 获取所有用户奖章数据（结合配置）
  getAllUserMedals(): Array<MedalConfig & UserMedal> {
    const userMedals = this.getUserMedals()
    
    return MEDAL_CONFIGS.map(config => {
      const userMedal = userMedals[config.id] || {
        id: config.id,
        unlocked: false,
        progress: 0
      }
      
      return {
        ...config,
        ...userMedal
      }
    })
  }

  // 获取奖章统计
  getMedalStats(): {
    total: number
    unlocked: number
    byRarity: Record<MedalRarity, { total: number; unlocked: number }>
    byCategory: Record<MedalCategory, { total: number; unlocked: number }>
  } {
    const userMedals = this.getUserMedals()
    
    const stats = {
      total: MEDAL_CONFIGS.length,
      unlocked: 0,
      byRarity: {} as Record<MedalRarity, { total: number; unlocked: number }>,
      byCategory: {} as Record<MedalCategory, { total: number; unlocked: number }>
    }
    
    // 初始化统计
    Object.values(MedalRarity).forEach(rarity => {
      stats.byRarity[rarity] = { total: 0, unlocked: 0 }
    })
    Object.values(MedalCategory).forEach(category => {
      stats.byCategory[category] = { total: 0, unlocked: 0 }
    })
    
    // 计算统计数据
    MEDAL_CONFIGS.forEach(config => {
      const userMedal = userMedals[config.id]
      const isUnlocked = userMedal?.unlocked || false
      
      if (isUnlocked) {
        stats.unlocked++
      }
      
      stats.byRarity[config.rarity].total++
      if (isUnlocked) {
        stats.byRarity[config.rarity].unlocked++
      }
      
      stats.byCategory[config.category].total++
      if (isUnlocked) {
        stats.byCategory[config.category].unlocked++
      }
    })
    
    return stats
  }
}

// 创建全局实例
export const medalManager = new MedalManager()
