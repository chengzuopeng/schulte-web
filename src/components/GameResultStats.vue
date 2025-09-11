<template>
  <div class="result-stats">
    <!-- 用时 -->
    <div class="stat-item">
      <div class="stat-icon">⏱️</div>
      <div class="stat-content">
        <div class="stat-value">{{ formatDuration(duration) }}</div>
        <div class="stat-label">用时</div>
      </div>
    </div>
    
    <!-- 错误次数 -->
    <div class="stat-item">
      <div class="stat-icon">{{errorCount ? '❌' : '✅'}}</div>
      <div class="stat-content">
        <div class="stat-value">{{ errorCount }}</div>
        <div class="stat-label">错误次数</div>
      </div>
    </div>
    
    <!-- 分数 (仅Schulte显示) -->
    <div v-if="score !== undefined" class="stat-item score-item">
      <div class="stat-icon score-icon">🎯</div>
      <div class="stat-content">
        <div class="score-text">
          超过了 <span class="score-highlight">{{ score }}%</span> 的人
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  duration: number
  errorCount: number
  score?: number
}

const props = withDefaults(defineProps<Props>(), {
  score: undefined
})

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}
</script>

<style scoped>
/* 成绩统计容器 */
.result-stats {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 380px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px 28px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.08),
    0 8px 25px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  z-index: 1;
  margin-bottom: 32px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);
  transition: all 0.2s ease;
}

.stat-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.stat-item:hover {
  background: rgba(99, 102, 241, 0.04);
  margin: 0 -20px;
  padding-left: 20px;
  padding-right: 20px;
  border-radius: 16px;
}

.stat-icon {
  font-size: 28px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #0c04a4;
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  opacity: 0.9;
}

.score-item .stat-icon {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%);
}

.score-text {
  font-size: 18px;
  font-weight: 600;
  color: #4b5563;
  line-height: 1.4;
  width: 100%;
}

.score-highlight {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  display: inline-block;
  margin: 0 4px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}
</style>
