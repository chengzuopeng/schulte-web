<template>
  <div class="personal-stats">
    <!-- 个人最佳 -->
    <div v-if="personalBest > 0" class="detail-row">
      <div class="detail-icon">🏆</div>
      <div class="detail-content">
        <div class="detail-label">个人最佳</div>
        <div class="detail-value">{{ formatDuration(personalBest) }}</div>
      </div>
    </div>
    
    <!-- 今日练习 -->
    <div class="detail-row">
      <div class="detail-icon">📅</div>
      <div class="detail-content">
        <div class="detail-label">今日练习</div>
        <div class="detail-value">第{{ todayCount }}次</div>
      </div>
    </div>
    
    <!-- 今日最佳 -->
    <div v-if="todayBest > 0" class="detail-row">
      <div class="detail-icon">⭐</div>
      <div class="detail-content">
        <div class="detail-label">今日最佳</div>
        <div class="detail-value">{{ formatDuration(todayBest) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  personalBest: number
  todayCount: number
  todayBest: number
}

const props = defineProps<Props>()

const formatDuration = (ms: number): string => {
  if (ms === 0 || ms === Infinity) {
    return '--'
  }
  
  const totalSeconds = (ms / 1000).toFixed(2)
  const seconds = parseFloat(totalSeconds)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(2)
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
}
</script>

<style scoped>
/* 详细统计 */
.personal-stats {
  width: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  border-radius: 18px;
  padding: 12px 24px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  z-index: 1;
  position: relative;
}

.detail-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);
  transition: all 0.2s ease;
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-row:hover {
  background: rgba(99, 102, 241, 0.04);
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
  border-radius: 12px;
}

.detail-icon {
  font-size: 22px;
  margin-right: 18px;
  width: 28px;
  text-align: center;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.detail-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 16px;
  font-weight: 500;
  color: #4b5563;
  opacity: 0.9;
}

.detail-value {
  font-size: 16px;
  font-weight: 700;
  color: #0c04a4;
}
</style>
