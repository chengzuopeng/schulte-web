<template>
  <div class="medal-page">
    <!-- 页面头部 -->
    <div class="header">
      <h1 class="title">奖章收藏</h1>
      <div class="subtitle">记录你的每一个成就时刻</div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stats-card">
        <div class="stats-main">
          <div class="unlock-progress">
            <div class="progress-circle">
              <svg class="progress-svg" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  stroke-width="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#gradient)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="progressOffset"
                  transform="rotate(-90 60 60)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b"/>
                    <stop offset="100%" style="stop-color:#ef4444"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="progress-content">
                <div class="progress-number">{{ unlockedCount }}</div>
                <div class="progress-total">/{{ totalCount }}</div>
              </div>
            </div>
          </div>
          <div class="stats-text">
            <div class="stats-title">已解锁奖章</div>
            <div class="stats-desc">完成度 {{ unlockPercentage }}%</div>
          </div>
        </div>

        <!-- 稀有度统计 -->
        <div class="rarity-stats">
          <div 
            v-for="(info, rarity) in rarityStats" 
            :key="rarity"
            class="rarity-item"
          >
            <div class="rarity-icon" :class="`rarity-${rarity}`">
              {{ getRarityIcon(rarity) }}
            </div>
            <div class="rarity-count">{{ info.unlocked }}/{{ info.total }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters">
      <div class="filter-tabs">
        <button 
          v-for="category in filterCategories"
          :key="category.value"
          class="filter-tab"
          :class="{ active: selectedCategory === category.value }"
          @click="selectedCategory = category.value"
        >
          <span class="tab-icon">{{ category.icon }}</span>
          <span class="tab-label">{{ category.label }}</span>
        </button>
      </div>
      
      <div class="filter-rarity">
        <select v-model="selectedRarity" class="rarity-select">
          <option value="">全部稀有度</option>
          <option v-for="rarity in rarityOptions" :key="rarity.value" :value="rarity.value">
            {{ rarity.icon }} {{ rarity.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 奖章网格 -->
    <div class="medals-grid">
      <div 
        v-for="medal in filteredMedals"
        :key="medal.id"
        class="medal-card"
        :class="{
          'unlocked': medal.unlocked,
          [`rarity-${medal.rarity}`]: medal.unlocked
        }"
        @click="openMedalDetail(medal)"
      >
        <div class="medal-card-content">
          <div class="medal-icon-container">
            <div class="medal-icon">{{ medal.icon }}</div>
            <div v-if="medal.unlocked" class="unlock-badge">✓</div>
            <div v-if="!medal.unlocked" class="progress-ring">
              <svg viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  stroke-width="2"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  :stroke-dasharray="100"
                  :stroke-dashoffset="100 - medal.progress"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
          </div>
          <div class="medal-content">
            <h3 class="medal-name">{{ medal.name }}</h3>
            <div class="medal-rarity">{{ getRarityLabel(medal.rarity) }}</div>
            <div v-if="medal.unlocked && medal.unlockedAt" class="unlock-time">
              {{ formatUnlockTime(medal.unlockedAt) }}
            </div>
          </div>
        </div>
        <div class="medal-description-content">
          <div class="medal-description">{{ medal.description }}</div>
          <div v-if="!medal.unlocked" class="medal-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: medal.progress + '%' }"
              ></div>
            </div>
            <div class="progress-text">{{ Math.round(medal.progress) }}%</div>
          </div>
        </div>
        
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredMedals.length === 0" class="empty-state">
      <div class="empty-icon">🏆</div>
      <div class="empty-title">暂无奖章</div>
      <div class="empty-desc">当前筛选条件下没有找到奖章</div>
    </div>

    <!-- 奖章详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="detail-modal" @click.stop>
        <div class="modal-header">
          <button class="close-btn" @click="closeDetailModal">×</button>
        </div>
        
        <div v-if="selectedMedal" class="modal-content">
          <div class="medal-detail-header">
            <div class="medal-detail-icon" :class="{ 'unlocked': selectedMedal.unlocked }">
              {{ selectedMedal.icon }}
            </div>
            <div class="medal-detail-info">
              <h2 class="medal-detail-name">{{ selectedMedal.name }}</h2>
              <div class="medal-detail-rarity" :class="`rarity-${selectedMedal.rarity}`">
                {{ getRarityIcon(selectedMedal.rarity) }} {{ getRarityLabel(selectedMedal.rarity) }}
              </div>
            </div>
          </div>

          <div class="medal-detail-body">
            <div class="detail-section">
              <h4 class="section-title">获得条件</h4>
              <p class="section-content">{{ selectedMedal.description }}</p>
            </div>

            <div v-if="selectedMedal.unlocked" class="detail-section">
              <h4 class="section-title">解锁时间</h4>
              <p class="section-content">{{ formatDetailTime(selectedMedal.unlockedAt!) }}</p>
            </div>

            <div v-if="!selectedMedal.unlocked" class="detail-section">
              <h4 class="section-title">完成进度</h4>
              <div class="progress-detail">
                <div class="progress-bar large">
                  <div 
                    class="progress-fill" 
                    :style="{ width: selectedMedal.progress + '%' }"
                  ></div>
                </div>
                <div class="progress-percentage">{{ Math.round(selectedMedal.progress) }}%</div>
              </div>
              <div class="progress-hint">{{ getProgressHint(selectedMedal) }}</div>
            </div>

            <div class="detail-section">
              <h4 class="section-title">分类</h4>
              <div class="category-tag">
                {{ getCategoryIcon(selectedMedal.category) }} {{ getCategoryLabel(selectedMedal.category) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 解锁庆祝动画 -->
    <div v-if="showCelebration" class="celebration-overlay">
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <div class="celebration-title">恭喜解锁新奖章!</div>
        <div v-if="newUnlockedMedal" class="celebration-medal">
          <div class="celebration-medal-icon">{{ newUnlockedMedal.icon }}</div>
          <div class="celebration-medal-name">{{ newUnlockedMedal.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { medalManager, MedalCategory, MedalRarity, type MedalConfig } from '@/utils/medal-manager'
import { gameDataManager } from '@/utils/game-data-manager'

// 类型定义
type MedalWithUserData = MedalConfig & {
  unlocked: boolean
  unlockedAt?: number
  progress: number
}

// 响应式数据
const allMedals = ref<MedalWithUserData[]>([])
const selectedCategory = ref<string>('')
const selectedRarity = ref<string>('')
const showDetailModal = ref(false)
const selectedMedal = ref<MedalWithUserData | null>(null)
const showCelebration = ref(false)
const newUnlockedMedal = ref<MedalWithUserData | null>(null)

// 筛选选项
const filterCategories = [
  { value: '', label: '全部', icon: '🏆' },
  { value: MedalCategory.SPEED, label: '速度', icon: '⚡' },
  { value: MedalCategory.ACCURACY, label: '准确', icon: '🎯' },
  { value: MedalCategory.PERSISTENCE, label: '坚持', icon: '📅' },
  { value: MedalCategory.MASTERY, label: '精通', icon: '🌟' },
  { value: MedalCategory.SPECIAL, label: '特殊', icon: '🎉' }
]

const rarityOptions = [
  { value: MedalRarity.BRONZE, label: '青铜', icon: '🥉' },
  { value: MedalRarity.SILVER, label: '白银', icon: '🥈' },
  { value: MedalRarity.GOLD, label: '黄金', icon: '🥇' },
  { value: MedalRarity.PLATINUM, label: '铂金', icon: '💎' },
  { value: MedalRarity.DIAMOND, label: '钻石', icon: '💍' }
]

// 计算属性
const filteredMedals = computed(() => {
  let filtered = allMedals.value

  if (selectedCategory.value) {
    filtered = filtered.filter(medal => medal.category === selectedCategory.value)
  }

  if (selectedRarity.value) {
    filtered = filtered.filter(medal => medal.rarity === selectedRarity.value)
  }

  // 按解锁状态和稀有度排序
  return filtered.sort((a, b) => {
    // 已解锁的排在前面
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1
    }
    
    // 稀有度排序
    const rarityOrder = [
      MedalRarity.BRONZE,
      MedalRarity.SILVER,
      MedalRarity.GOLD,
      MedalRarity.PLATINUM,
      MedalRarity.DIAMOND
    ]
    
    return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  })
})

const totalCount = computed(() => allMedals.value.length)
const unlockedCount = computed(() => allMedals.value.filter(medal => medal.unlocked).length)
const unlockPercentage = computed(() => 
  totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0
)

const circumference = 2 * Math.PI * 50
const progressOffset = computed(() => {
  const progress = unlockPercentage.value / 100
  return circumference * (1 - progress)
})

const rarityStats = computed(() => {
  const stats = medalManager.getMedalStats()
  return stats.byRarity
})

// 方法
const loadMedals = () => {
  allMedals.value = medalManager.getAllUserMedals()
}

const getRarityIcon = (rarity: MedalRarity): string => {
  const icons = {
    [MedalRarity.BRONZE]: '🥉',
    [MedalRarity.SILVER]: '🥈',
    [MedalRarity.GOLD]: '🥇',
    [MedalRarity.PLATINUM]: '💎',
    [MedalRarity.DIAMOND]: '💍'
  }
  return icons[rarity] || '🏆'
}

const getRarityLabel = (rarity: MedalRarity): string => {
  const labels = {
    [MedalRarity.BRONZE]: '青铜',
    [MedalRarity.SILVER]: '白银',
    [MedalRarity.GOLD]: '黄金',
    [MedalRarity.PLATINUM]: '铂金',
    [MedalRarity.DIAMOND]: '钻石'
  }
  return labels[rarity] || rarity
}

const getCategoryIcon = (category: MedalCategory): string => {
  const icons = {
    [MedalCategory.SPEED]: '⚡',
    [MedalCategory.ACCURACY]: '🎯',
    [MedalCategory.PERSISTENCE]: '📅',
    [MedalCategory.MASTERY]: '🌟',
    [MedalCategory.SPECIAL]: '🎉'
  }
  return icons[category] || '🏆'
}

const getCategoryLabel = (category: MedalCategory): string => {
  const labels = {
    [MedalCategory.SPEED]: '速度类',
    [MedalCategory.ACCURACY]: '准确性类',
    [MedalCategory.PERSISTENCE]: '坚持类',
    [MedalCategory.MASTERY]: '精通类',
    [MedalCategory.SPECIAL]: '特殊类'
  }
  return labels[category] || category
}

const formatUnlockTime = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD')
}

const formatDetailTime = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY年MM月DD日 HH:mm:ss')
}

const getProgressHint = (medal: MedalWithUserData): string => {
  if (medal.progress >= 100) return '即将解锁！'
  if (medal.progress >= 80) return '快要完成了，加油！'
  if (medal.progress >= 50) return '已经完成一半了'
  if (medal.progress >= 20) return '继续努力练习'
  return '开始你的挑战之旅'
}

const openMedalDetail = (medal: MedalWithUserData) => {
  selectedMedal.value = medal
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedMedal.value = null
}

const showUnlockCelebration = (medal: MedalWithUserData) => {
  newUnlockedMedal.value = medal
  showCelebration.value = true
  
  setTimeout(() => {
    showCelebration.value = false
    newUnlockedMedal.value = null
  }, 3000)
}

// 设置奖章解锁回调
const setupMedalCallback = () => {
  gameDataManager.setMedalUnlockedCallback((medalIds: string[]) => {
    // 重新加载奖章数据
    loadMedals()
    
    // 显示庆祝动画
    const newlyUnlocked = allMedals.value.find(medal => 
      medalIds.includes(medal.id) && medal.unlocked
    )
    
    if (newlyUnlocked) {
      showUnlockCelebration(newlyUnlocked)
    }
  })
}

// 生命周期
onMounted(() => {
  loadMedals()
  setupMedalCallback()
})

// 监听页面可见性变化，重新加载数据
watch(() => document.visibilityState, (visibilityState) => {
  if (visibilityState === 'visible') {
    loadMedals()
  }
})
</script>

<style scoped>
.medal-page {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100%;
  overflow-y: auto;
}

/* 页面头部 */
.header {
  text-align: center;
  margin-bottom: 16px;
  color: white;
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

/* 统计概览 */
.stats-overview {
  margin-bottom: 16px;
}

.stats-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 24px;
  padding: 16px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.stats-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.unlock-progress {
  flex-shrink: 0;
}

.progress-circle {
  position: relative;
  width: 100px;
  height: 100px;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-number {
  font-size: 28px;
  font-weight: 900;
  color: #1f2937;
  line-height: 1;
}

.progress-total {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
}

.stats-text {
  flex: 1;
}

.stats-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
}

.stats-desc {
  font-size: 14px;
  color: #6b7280;
}

.rarity-stats {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.rarity-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rarity-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid;
}

.rarity-icon.rarity-bronze {
  background: rgba(205, 127, 50, 0.1);
  border-color: #cd7f32;
}

.rarity-icon.rarity-silver {
  background: rgba(192, 192, 192, 0.1);
  border-color: #c0c0c0;
}

.rarity-icon.rarity-gold {
  background: rgba(255, 215, 0, 0.1);
  border-color: #ffd700;
}

.rarity-icon.rarity-platinum {
  background: rgba(229, 228, 226, 0.1);
  border-color: #e5e4e2;
}

.rarity-icon.rarity-diamond {
  background: rgba(185, 242, 255, 0.1);
  border-color: #b9f2ff;
}

.rarity-count {
  font-size: 14px;
  font-weight: 600;
  color: #4b5563;
}

/* 筛选器 */
.filters {
  margin-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border: none;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  color: #4b5563;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.filter-tab.active {
  background: rgba(255, 255, 255, 1);
  color: #1f2937;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  font-size: 16px;
}

.filter-rarity {
  display: flex;
  justify-content: center;
}

.rarity-select {
  padding: 6px 12px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #4b5563;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  backdrop-filter: blur(10px);
  min-width: 160px;
}

/* 奖章网格 */
.medals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.medal-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.medal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.medal-card.unlocked {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.1);
}

.medal-card.unlocked::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  /* background: linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%); */
}

.medal-card-content {
  display: flex;
  justify-content: space-around;
}

.medal-icon-container {
  position: relative;
  width: 56px;
  height: 56px;
}

.medal-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  filter: grayscale(1);
  transition: all 0.3s ease;
}

.medal-card.unlocked .medal-icon {
  filter: grayscale(0);
  background: rgba(34, 197, 94, 0.1);
}

.unlock-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 24px;
  height: 24px;
  background: #22c55e;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: rgba(59, 130, 246, 0.6);
}

.progress-ring svg {
  width: 100%;
  height: 100%;
}

.medal-content {
  text-align: center;
}

.medal-description-content {
  text-align: center;
  margin-top: 8px;
}

.medal-name {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.medal-rarity {
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.medal-description {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

.medal-progress {
  margin-top: 12px;
  display: flex;
  align-items: center;
  height: 14px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(229, 231, 235, 0.8);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar.large {
  height: 8px;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  transition: width 0.5s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  width: 50px;
}

.unlock-time {
  font-size: 12px;
  color: #22c55e;
  font-weight: 600;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.8);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 16px;
  opacity: 0.8;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.detail-modal {
  background: white;
  border-radius: 24px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.close-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.medal-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
}

.medal-detail-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  filter: grayscale(1);
  flex-shrink: 0;
}

.medal-detail-icon.unlocked {
  filter: grayscale(0);
  background: rgba(34, 197, 94, 0.1);
}

.medal-detail-info {
  flex: 1;
  min-width: 0;
}

.medal-detail-name {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.medal-detail-rarity {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.section-content {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
  margin: 0;
}

.progress-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.progress-percentage {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  min-width: 40px;
}

.progress-hint {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

/* 庆祝动画 */
.celebration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: celebrationFadeIn 0.5s ease-out;
}

.celebration-content {
  text-align: center;
  color: white;
  animation: celebrationZoomIn 0.8s ease-out;
}

.celebration-icon {
  font-size: 80px;
  margin-bottom: 20px;
  animation: celebrationBounce 1s ease-in-out infinite;
}

.celebration-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}

.celebration-medal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.celebration-medal-icon {
  font-size: 64px;
  animation: celebrationRotate 2s ease-in-out infinite;
}

.celebration-medal-name {
  font-size: 20px;
  font-weight: 600;
}

@keyframes celebrationFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes celebrationZoomIn {
  from { 
    opacity: 0;
    transform: scale(0.8);
  }
  to { 
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes celebrationBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes celebrationRotate {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(10deg); }
  75% { transform: rotate(-10deg); }
  100% { transform: rotate(0deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .medal-page {
    padding: 16px;
  }

  .stats-main {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .rarity-stats {
    gap: 16px;
  }

  .filter-tabs {
    gap: 6px;
  }

  .filter-tab {
    font-size: 13px;
  }

  .medals-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .medal-detail-header {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .detail-modal {
    padding: 24px;
    margin: 16px;
  }
}
</style>
