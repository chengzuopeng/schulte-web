<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click="closeModal">
      <Transition name="modal-slide">
        <div v-if="visible" class="modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h2 class="modal-title">{{ gameTitle }}练习记录</h2>
            <button class="close-button" @click="closeModal">×</button>
          </div>
          
          <!-- 统计概览 -->
          <div class="stats-overview">
            <div class="stats-item">
              <div class="stats-label">练习次数</div>
              <div class="stats-value">{{ totalCount }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">最佳成绩</div>
              <div class="stats-value">{{ bestTime ? formatMilliseconds(bestTime) : '--' }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均用时</div>
              <div class="stats-value">{{ averageTime ? formatMilliseconds(averageTime) : '--' }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均错误</div>
              <div class="stats-value">{{ averageErrors !== null ? averageErrors.toFixed(1) : '--' }}</div>
            </div>
          </div>
          
          <!-- 记录列表 -->
          <div class="records-container">
            <div v-if="records.length === 0" class="empty-state">
              <div class="empty-icon">📊</div>
              <div class="empty-text">暂无练习记录</div>
            </div>
            
            <div v-else class="records-list">
              <div 
                v-for="(record, index) in records" 
                :key="index"
                class="record-item"
                :class="{ 'best-record': record.duration === bestTime }"
              >
                <div class="record-main">
                  <div class="record-left">
                    <div class="record-size">{{ formatSize(record.size) }}</div>
                    <div class="record-time">{{ formatCreatedTime(record.createdTime) }}</div>
                  </div>
                  <div class="record-right">
                    <div class="record-stats">
                      <div class="record-duration">{{ formatMilliseconds(record.duration) }}</div>
                      <div class="record-errors">{{ record.errorCount || 0 }} 错误</div>
                    </div>
                    <div v-if="record.duration === bestTime" class="best-badge">最佳</div>
                  </div>
                </div>
                
                <!-- Color游戏额外信息 -->
                <div v-if="gameType === 'color'" class="record-extra">
                  <span class="extra-tag">{{ (record as ColorRecord).option }}选项</span>
                  <span class="extra-tag">{{ (record as ColorRecord).interfere ? '有干扰' : '无干扰' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { formatMilliseconds } from '@/utils/time'
import { gameDataManager, type GameRecord, type GameType, type ColorRecord } from '@/utils/game-data-manager'

interface Props {
  visible: boolean
  gameType: GameType
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 游戏记录数据
const records = ref<GameRecord[]>([])

// 游戏标题映射
const gameTitles: Record<GameType, string> = {
  'schulte': '舒尔特方格',
  'memory': '记忆力挑战',
  'color': '注意力挑战'
}

// 计算属性
const gameTitle = computed(() => gameTitles[props.gameType])

const totalCount = computed(() => records.value.length)

const bestTime = computed(() => {
  if (records.value.length === 0) return null
  return Math.min(...records.value.map(r => r.duration))
})

const averageTime = computed(() => {
  if (records.value.length === 0) return null
  const total = records.value.reduce((sum, r) => sum + r.duration, 0)
  return Math.round(total / records.value.length)
})

const averageErrors = computed(() => {
  if (records.value.length === 0) return null
  const total = records.value.reduce((sum, r) => sum + (r.errorCount || 0), 0)
  return total / records.value.length
})

// 监听弹窗显示状态，加载数据
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    loadRecords()
  }
})

// 加载游戏记录
function loadRecords() {
  try {
    const data = gameDataManager.exportGameData(props.gameType)
    if (data) {
      // 按时间倒序排列（最新的在前）
      records.value = data.records.sort((a, b) => b.createdTime - a.createdTime)
    } else {
      records.value = []
    }
  } catch (error) {
    console.warn('加载游戏记录失败:', error)
    records.value = []
  }
}

// 格式化尺寸
function formatSize(size: number): string {
  if (props.gameType === 'color') {
    return `${size}题`
  }
  return `${size}×${size}`
}

// 格式化创建时间
function formatCreatedTime(timestamp: number): string {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 关闭弹窗
function closeModal() {
  emit('update:visible', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-container {
  width: 100%;
  max-height: 90vh;
  background-color: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #e8e8e8;
  color: #333;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr); 
  padding: 16px 20px;
  gap: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  flex-shrink: 0;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
}

.stats-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 0;
  font-weight: 800;
}

.stats-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  font-variant-numeric: tabular-nums;
}

.records-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: #999;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 20px;
}

.record-item {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 14px;
  transition: all 0.2s ease;
  position: relative;
}

.record-item:hover {
  border-color: #d0d0d0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.record-item.best-record {
  border-color: #ffd700;
  background: linear-gradient(135deg, #fffbf0 0%, #fff8e1 100%);
}

.record-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-size {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.record-time {
  font-size: 13px;
  color: #666;
  font-variant-numeric: tabular-nums;
}

.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.record-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.record-duration {
  font-size: 16px;
  font-weight: 600;
  color: #f09491;
  font-variant-numeric: tabular-nums;
}

.record-errors {
  font-size: 12px;
  color: #999;
  font-variant-numeric: tabular-nums;
}

.best-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #8b6914;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.record-extra {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.extra-tag {
  background: #f5f5f5;
  color: #666;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
}

/* 动画效果 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: transform 0.3s ease;
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  transform: translateY(100%);
}

</style>
