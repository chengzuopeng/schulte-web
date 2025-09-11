<template>
  <div class="checkin-page">
    <!-- 页面头部 -->
    <div class="header">
      <h1 class="title">每日签到</h1>
      <div class="subtitle">坚持练习，成就更好的自己</div>
      <button class="share-btn" @click="shareCheckIn" :disabled="isGeneratingImage">
        <span v-if="isGeneratingImage">生成中...</span>
        <span v-else>📤 分享</span>
      </button>
    </div>

    <!-- 顶部综合状态区域 -->
    <div class="integrated-status-area">
      <!-- 今日签到状态和连续签到 -->
      <div class="main-status">
        <div class="today-section">
          <div class="status-icon">
            {{ isTodayCheckedIn ? '✅' : '📅' }}
          </div>
          <div class="status-content">
            <div class="status-title">
              {{ isTodayCheckedIn ? '今日已签到' : '今日未签到' }}
            </div>
            <div class="status-desc">
              {{ isTodayCheckedIn ? `通过${getTodayGameType()}游戏完成签到` : '完成任意一次游戏练习即可签到' }}
            </div>
          </div>
        </div>
        
        <div class="streak-section">
          <div class="streak-number">{{ stats.currentStreak }}</div>
          <div class="streak-label">连续签到天数</div>
        </div>
      </div>

      <!-- 统计网格 -->
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalDays }}</div>
            <div class="stat-label">总签到天数</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">🏆</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.maxStreak }}</div>
            <div class="stat-label">最长连续</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.thisWeekCount }}</div>
            <div class="stat-label">本周签到</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-value">{{ monthProgress }}%</div>
            <div class="stat-label">本月完成率</div>
          </div>
        </div>
      </div>

      <!-- 本月签到进度条 -->
      <div class="month-progress">
        <div class="progress-header">
          <span class="progress-label">本月签到进度</span>
          <span class="progress-value">{{ stats.thisMonthCount }}/{{ daysInCurrentMonth }}</span>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: monthProgress + '%' }"
          ></div>
        </div>
        <!-- <div class="progress-text">{{ monthProgress }}% 完成</div> -->
      </div>
    </div>

    <h1 class="s-title">签到日历</h1>

    <!-- 签到日历区域 -->
    <div class="calendar-section">
      <div class="calendar-header">
        <button class="nav-btn" @click="prevMonth" :disabled="!canGoPrev">
          ←
        </button>
        <h3 class="calendar-title">
          {{ currentYear }}年{{ currentMonth }}月
        </h3>
        <button class="nav-btn" @click="nextMonth" :disabled="!canGoNext">
          →
        </button>
      </div>

      <div class="calendar-grid">
        <!-- 星期标题 -->
        <div class="weekday-header">
          <div v-for="day in weekdays" :key="day" class="weekday">
            {{ day }}
          </div>
        </div>

        <!-- 日期网格 -->
        <div class="calendar-days">
          <!-- 前一个月的填充日期 -->
          <div 
            v-for="day in prevMonthDays" 
            :key="`prev-${day}`"
            class="calendar-day prev-month"
          >
            {{ day }}
          </div>

          <!-- 当前月的日期 -->
          <div 
            v-for="day in currentMonthDays"
            :key="`current-${day}`"
            class="calendar-day current-month"
            :class="{
              'today': isToday(day),
              'checked-in': isDateCheckedIn(day),
              'clickable': hasRecordForDate(day)
            }"
            @click="onDateClick(day)"
          >
            <div class="day-number">{{ day }}</div>
            <div v-if="isDateCheckedIn(day)" class="check-mark">✓</div>
          </div>

          <!-- 下一个月的填充日期 -->
          <div 
            v-for="day in nextMonthDays"
            :key="`next-${day}`"
            class="calendar-day next-month"
          >
            {{ day }}
          </div>
        </div>
      </div>
    </div>


    <!-- 签到详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="detail-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedDate }} 签到详情</h3>
          <button class="close-btn" @click="closeDetailModal">×</button>
        </div>
        <div class="modal-content">
          <div v-if="selectedDateRecord" class="record-info">
            <div class="info-item">
              <span class="info-label">签到时间：</span>
              <span class="info-value">{{ formatTime(selectedDateRecord.timestamp) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">游戏类型：</span>
              <span class="info-value">{{ getGameTypeName(selectedDateRecord.gameType) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">连续天数：</span>
              <span class="info-value">{{ selectedDateRecord.streak }} 天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { checkInManager, type CheckInRecord, type CheckInStats } from '@/utils/checkin-manager'
import type { GameType } from '@/utils/game-data-manager'
import html2canvas from 'html2canvas'

// 响应式数据
const stats = ref<CheckInStats>({
  totalDays: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastCheckIn: '',
  thisMonthCount: 0,
  thisWeekCount: 0
})

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1)
const calendarData = ref<Record<string, CheckInRecord>>({})
const showDetailModal = ref(false)
const selectedDate = ref('')
const selectedDateRecord = ref<CheckInRecord | null>(null)

// 分享功能相关
const isGeneratingImage = ref(false)

// 星期标题
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 计算属性
const isTodayCheckedIn = computed(() => {
  return checkInManager.isTodayCheckedIn()
})

const daysInCurrentMonth = computed(() => {
  return dayjs().daysInMonth()
})

const monthProgress = computed(() => {
  return Math.round((stats.value.thisMonthCount / daysInCurrentMonth.value) * 100)
})

const canGoPrev = computed(() => {
  // 可以往前查看历史记录，但不能超过有记录的最早月份
  return true // 暂时允许无限制查看
})

const canGoNext = computed(() => {
  // 不能查看未来月份
  const now = dayjs()
  return currentYear.value < now.year() || 
         (currentYear.value === now.year() && currentMonth.value < now.month() + 1)
})

// 日历计算
const currentMonthDays = computed(() => {
  const daysInMonth = dayjs(`${currentYear.value}-${currentMonth.value}-01`).daysInMonth()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
})

const prevMonthDays = computed(() => {
  const firstDay = dayjs(`${currentYear.value}-${currentMonth.value}-01`)
  const startOfWeek = firstDay.day() // 0 = 日, 1 = 一, ...
  
  if (startOfWeek === 0) return []
  
  const prevMonth = firstDay.subtract(1, 'month')
  const daysInPrevMonth = prevMonth.daysInMonth()
  
  return Array.from({ length: startOfWeek }, (_, i) => 
    daysInPrevMonth - startOfWeek + i + 1
  )
})

const nextMonthDays = computed(() => {
  const totalCells = 42 // 6 行 × 7 列
  const usedCells = prevMonthDays.value.length + currentMonthDays.value.length
  const remaining = totalCells - usedCells
  
  return Array.from({ length: remaining }, (_, i) => i + 1)
})

// 方法
const loadData = () => {
  stats.value = checkInManager.getStats()
  loadCalendarData()
}

const loadCalendarData = () => {
  calendarData.value = checkInManager.getCalendarData(currentYear.value, currentMonth.value)
}

const getTodayGameType = (): string => {
  const today = dayjs().format('YYYY-MM-DD')
  const record = calendarData.value[today]
  return record ? getGameTypeName(record.gameType) : ''
}

const getGameTypeName = (gameType: GameType): string => {
  const names = {
    'schulte': '舒尔特方格',
    'memory': '记忆力挑战',
    'color': '注意力挑战'
  }
  return names[gameType] || gameType
}

const getStreakProgress = (): number => {
  // 计算向下一个里程碑的进度
  const milestones = [7, 14, 30, 60, 100, 365]
  const current = stats.value.currentStreak
  
  const nextMilestone = milestones.find(m => m > current) || (current + 100)
  const prevMilestone = milestones.filter(m => m <= current).pop() || 0
  
  if (nextMilestone === prevMilestone) return 100
  
  return ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100
}

const getStreakText = (): string => {
  const milestones = [7, 14, 30, 60, 100, 365]
  const current = stats.value.currentStreak
  
  const nextMilestone = milestones.find(m => m > current)
  
  if (!nextMilestone) {
    return '已达成所有里程碑！'
  }
  
  return `距离 ${nextMilestone} 天还差 ${nextMilestone - current} 天`
}

const isToday = (day: number): boolean => {
  const today = dayjs()
  return today.year() === currentYear.value && 
         today.month() + 1 === currentMonth.value && 
         today.date() === day
}

const isDateCheckedIn = (day: number): boolean => {
  const dateStr = `${currentYear.value}-${currentMonth.value.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  return !!calendarData.value[dateStr]
}

const hasRecordForDate = (day: number): boolean => {
  return isDateCheckedIn(day)
}

const onDateClick = (day: number) => {
  if (!hasRecordForDate(day)) return
  
  const dateStr = `${currentYear.value}-${currentMonth.value.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  selectedDate.value = `${currentYear.value}年${currentMonth.value}月${day}日`
  selectedDateRecord.value = calendarData.value[dateStr]
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedDate.value = ''
  selectedDateRecord.value = null
}

const formatTime = (timestamp: number): string => {
  return dayjs(timestamp).format('HH:mm:ss')
}

const prevMonth = () => {
  if (!canGoPrev.value) return
  
  if (currentMonth.value === 1) {
    currentYear.value--
    currentMonth.value = 12
  } else {
    currentMonth.value--
  }
  
  loadCalendarData()
}

const nextMonth = () => {
  if (!canGoNext.value) return
  
  if (currentMonth.value === 12) {
    currentYear.value++
    currentMonth.value = 1
  } else {
    currentMonth.value++
  }
  
  loadCalendarData()
}

// 生成日历HTML
const generateCalendarHTML = () => {
  const year = currentYear.value
  const month = currentMonth.value
  const today = dayjs()
  const firstDay = dayjs().year(year).month(month - 1).date(1)
  const daysInMonth = firstDay.daysInMonth()
  const startDay = firstDay.day() // 0 = Sunday, 1 = Monday, etc.
  
  let html = ''
  
  // 空白格子（上个月的日期）
  for (let i = 0; i < startDay; i++) {
    html += '<div style="padding: 8px;"></div>'
  }
  
  // 当月的日期
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = dayjs().year(year).month(month - 1).date(day)
    const dateKey = currentDate.format('YYYY-MM-DD')
    const isCheckedIn = calendarData.value[dateKey]
    const isToday = currentDate.isSame(today, 'day')
    const isPast = currentDate.isBefore(today, 'day')
    
    let bgColor = 'transparent'
    let textColor = '#666'
    let borderColor = 'transparent'
    
    if (isToday) {
      borderColor = '#f59e0b'
      textColor = '#f59e0b'
    }
    
    if (isCheckedIn) {
      bgColor = '#22c55e'
      textColor = 'white'
    } else if (isPast && !isToday) {
      textColor = '#d1d5db'
    }
    
    html += `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: ${bgColor};
        color: ${textColor};
        border: 2px solid ${borderColor};
        font-size: 12px;
        font-weight: 500;
        margin: 0 auto;
      ">
        ${day}
      </div>
    `
  }
  
  return html
}

// 分享签到状态
const shareCheckIn = async () => {
  if (isGeneratingImage.value) return
  
  try {
    isGeneratingImage.value = true
    
    // 创建分享用的容器
    const shareContainer = document.createElement('div')
    shareContainer.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 750px;
      min-height: 1334px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    `
    
    // 添加内容
    shareContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 60px;">
        <h1 style="font-size: 48px; margin: 0 0 20px 0; font-weight: 700;">我的签到记录</h1>
        <div style="font-size: 24px; opacity: 0.9;">坚持练习，成就更好的自己</div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.95); border-radius: 24px; padding: 40px; margin-bottom: 40px; color: #333;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <div style="text-align: center;">
            <div style="font-size: 20px; color: #666; margin-bottom: 8px;">今日状态</div>
            <div style="font-size: 32px; font-weight: 700; color: ${isTodayCheckedIn.value ? '#22c55e' : '#ef4444'};">
              ${isTodayCheckedIn.value ? '✅ 已签到' : '⏰ 待签到'}
            </div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 20px; color: #666; margin-bottom: 8px;">连续签到</div>
            <div style="font-size: 32px; font-weight: 700; color: #f59e0b;">
              ${stats.value.currentStreak} 天
            </div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div style="text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.05); border-radius: 12px;">
            <div style="font-size: 16px; color: #666; margin-bottom: 8px;">累计签到</div>
            <div style="font-size: 28px; font-weight: 600; color: #3b82f6;">${stats.value.totalDays} 天</div>
          </div>
          <div style="text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.05); border-radius: 12px;">
            <div style="font-size: 16px; color: #666; margin-bottom: 8px;">本月签到</div>
            <div style="font-size: 28px; font-weight: 600; color: #10b981;">${stats.value.thisMonthCount} 天</div>
          </div>
        </div>
        
        <div style="margin-top: 30px;">
          <div style="background: #f3f4f6; border-radius: 12px; padding: 16px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 8px;">本月签到进度</div>
            <div style="background: #e5e7eb; height: 12px; border-radius: 6px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: ${monthProgress.value}%; transition: width 0.3s ease;"></div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #666; margin-top: 4px;">${monthProgress.value}% 完成</div>
          </div>
        </div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.95); border-radius: 20px; padding: 30px; margin-bottom: 30px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 20px; font-weight: 600; color: #333; margin-bottom: 16px;">${dayjs().format('YYYY年MM月')} 签到日历</div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; max-width: 420px; margin: 0 auto;">
          <!-- 星期标题 -->
          ${['日', '一', '二', '三', '四', '五', '六'].map(day => 
            `<div style="text-align: center; font-size: 12px; color: #666; font-weight: 600; padding: 8px 0;">${day}</div>`
          ).join('')}
          
          <!-- 日历格子 -->
          ${generateCalendarHTML()}
        </div>
      </div>
      
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <div style="font-size: 24px; margin-bottom: 20px; opacity: 0.9;">💪 每日训练，持续精进</div>
        <div style="font-size: 18px; opacity: 0.7;">${dayjs().format('YYYY年MM月DD日')}</div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.3);">
        <img src="/src/assets/image/schulte-logo.png" style="width: 48px; height: 48px; margin: 0 auto 8px auto; display: block; border-radius: 12px;" alt="Schulte Logo" />
        <div style="opacity: 0.6; font-size: 16px;">舒尔特方格训练 · 专注力提升</div>
      </div>
    `
    
    document.body.appendChild(shareContainer)
    
    // 生成图片
    const canvas = await html2canvas(shareContainer, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false
    })
    
    // 清理DOM
    document.body.removeChild(shareContainer)
    
    // 转换为base64格式
    const imageDataUrl = canvas.toDataURL('image/png')
    
    // 检查是否在App WebView中，如果是则使用JSBridge分享图片
    if (window.SchulteApp && typeof window.SchulteApp.shareImage === 'function') {
      try {
        const success = await window.SchulteApp.shareImage(
          imageDataUrl, 
          '我的签到记录'
        )
        if (success) {
          console.log('使用JSBridge分享图片成功')
          return
        } else {
          console.warn('JSBridge图片分享失败，使用下载方式')
        }
      } catch (error) {
        console.error('JSBridge图片分享异常:', error)
      }
    }
    
    // 降级到下载图片
    const link = document.createElement('a')
    link.download = `签到记录_${dayjs().format('YYYY-MM-DD')}.png`
    link.href = imageDataUrl
    link.click()
    
  } catch (error) {
    console.error('生成分享图片失败:', error)
    alert('生成分享图片失败，请稍后再试')
  } finally {
    isGeneratingImage.value = false
  }
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.checkin-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100%;
  overflow-y: auto;
}

/* 页面头部 */
.header {
  text-align: center;
  margin-bottom: 24px;
  color: white;
  position: relative;
}

.title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 16px;
  margin-top: 8px;
  opacity: 0.9;
}

.share-btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.share-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-50%) scale(1.05);
}

.share-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: translateY(-50%);
}

.share-btn:active:not(:disabled) {
  transform: translateY(-50%) scale(0.95);
}

/* 顶部综合状态区域 */
.integrated-status-area {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 16px 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 主要状态区域 - 今日签到和连续天数 */
.main-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.today-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.streak-section {
  text-align: center;
  flex-shrink: 0;
}

.status-icon {
  font-size: 48px;
  flex-shrink: 0;
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

.streak-number {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 4px;
}

.streak-label {
  font-size: 14px;
  color: #4b5563;
  font-weight: 600;
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

/* 本月签到进度条 */
.month-progress {
  margin-bottom: 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

.progress-value {
  font-size: 16px;
  font-weight: 600;
  color: #6b7280;
}

/* 进度条样式 */
.progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(229, 231, 235, 0.8);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  transition: width 0.5s ease;
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}


/* 日历 */
.s-title {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  margin-bottom: 8px;
}

.calendar-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.2);
  transform: scale(1.05);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.calendar-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.calendar-grid {
  width: 100%;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
  margin-bottom: 6px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  padding: 6px 2px;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  position: relative;
  transition: all 0.2s ease;
}

.calendar-day.prev-month,
.calendar-day.next-month {
  color: #d1d5db;
}

.calendar-day.current-month {
  color: #374151;
}

.calendar-day.today {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
}

.calendar-day.checked-in {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid #22c55e;
  color: #15803d;
  font-weight: 700;
}

.calendar-day.checked-in.today {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
}

.calendar-day.clickable {
  cursor: pointer;
}

.calendar-day.clickable:hover {
  transform: scale(1.1);
}

.day-number {
  font-size: 13px;
}

.check-mark {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: #22c55e;
  font-weight: 700;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.detail-modal {
  background: white;
  border-radius: 20px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.record-info {
  /* space-y removed as it's not a valid CSS property */
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 480px) {
  
  .title {
    font-size: 28px;
  }
  
  .streak-number {
    font-size: 48px;
  }
  
  .calendar-section {
    padding: 16px;
  }
}
</style>

