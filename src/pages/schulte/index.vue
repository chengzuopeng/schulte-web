<template>
  <div class="container">
    <!-- 开始界面 -->
    <div v-if="state === 1" class="start-screen">
      <div class="option-label">方格尺寸</div>
      <SegmentedControl 
        activeColor="#f09491" 
        :current="sizeOption" 
        :values="sizeItems" 
        @clickItem="(e: ClickItemEvent) => sizeOption = e.currentIndex" 
      />
      
      <div class="option-label">选中效果</div>
      <SegmentedControl 
        activeColor="#f79066" 
        :current="selectedType" 
        :values="selectItems" 
        @clickItem="(e: ClickItemEvent) => selectedType = e.currentIndex" 
      />
      
      <div class="option-label">方格背景颜色</div>
      <SegmentedControl 
        activeColor="#73c2c4" 
        :current="background" 
        :values="bgItems" 
        @clickItem="(e: ClickItemEvent) => background = e.currentIndex" 
      />
      
      <div class="option-label">震动效果</div>
      <SegmentedControl 
        activeColor="#e9635d" 
        :current="vibrate" 
        :values="vibrateItems" 
        @clickItem="(e: ClickItemEvent) => vibrate = e.currentIndex" 
      />
      
      <div class="option-label">倒计时</div>
      <SegmentedControl 
        activeColor="#6BB2CC" 
        :current="countdownType" 
        :values="countdownItems" 
        @clickItem="(e: ClickItemEvent) => countdownType = e.currentIndex" 
      />
      
      <div class="option-label">音效</div>
      <SegmentedControl 
        activeColor="#f09491" 
        :current="audioType" 
        :values="audioItems" 
        @clickItem="(e: ClickItemEvent) => audioType = e.currentIndex" 
      />
      
      <div class="option-label">&nbsp;</div>
      <button class="start-button" @click="start">开始</button>
      
      <!-- 数据统计图标 -->
      <button class="stats-icon" @click="showStatsModal = true">
        📊
      </button>
    </div>

    <!-- 游戏界面 -->
    <div class="game-section" v-else-if="state === 2">
      <div class="score-bar">
        <div class="score-item">
          <div>下一个</div>
          <div>{{ currentIndex }}</div>
        </div>
        <div class="score-item">
          <div>用时</div>
          <div style="display: flex;justify-content: center;">
            <div class="time-wrap">{{ formatMilliseconds(timeCounter) }}</div>
          </div>
        </div>
      </div>
      <div class="game-body">
        <div class="grid-container">
          <div :style="gridContainerStyle" class="grid-wrap">
            <!-- 倒计时显示 -->
            <Transition name="countdown-fade" v-if="countdownType === 0 && countdown > 0">
              <div class="countdown" :key="countdown">
                {{ countdown }}
              </div>
            </Transition>
            
            <!-- 游戏网格 -->
            <div 
              v-show="countdownType !== 0 || countdown === 0" 
              v-for="(cell, index) in grid" 
              :key="index" 
              class="grid-item"
            >
              <button
                :class="[
                  'cell-card',
                  `cell-card-${gridSize}`,
                  background === 1 ? 'cell-card-bg0' : (background === 2 ? `cell-card-bg${bgClassList[index]}` : ''),
                  cell.clicked ? selectMap[selectedType] : '',
                  cell.isPressed ? 'cell-card-pressed' : ''
                ]"
                @touchstart="cellPress(index)"
                @touchend="cellRelease(index)"
                @mousedown="cellPress(index)"
                @mouseup="cellRelease(index)"
              >
                {{ cell.value }}
              </button>
            </div>
          </div>
          </div>
        </div>
      <div class="footer">
        <button class="restart-button" @click="resetGrid">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>

    <!-- 结果界面 -->
    <div class="stats-section" v-else-if="state === 3">
      <!-- 成绩统计容器 -->
      <GameResultStats 
        :duration="timeCounter" 
        :error-count="errorCount" 
        :score="gameScore || undefined" 
      />
      
      <!-- 段位展示 -->
      <div v-if="currentRank" class="rank-display">
        <div class="rank-container" :style="{ backgroundColor: currentRank.bgColor }">
          <div class="rank-icon">{{ currentRank.icon }}</div>
          <div class="rank-info">
            <div class="rank-title">当前段位</div>
            <div class="rank-name" :style="{ color: currentRank.color }">{{ currentRank.name }}</div>
          </div>
        </div>
      </div>
      
      <!-- 奖章入口 -->
      <GameMedalDisplay game-type="schulte" />
      
      <!-- 详细统计 -->
      <GamePersonalStats 
        v-if="gameStats"
        :personal-best="gameStats.personalBest || 0"
        :today-count="gameStats.todayCount"
        :today-best="gameStats.todayBest || 0"
      />
      <div class="footer">
        <button class="restart-button" @click="resetGrid">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>
    
    <!-- 数据统计弹窗 -->
    <SchulteStatsModal 
      v-model:visible="showStatsModal"
      :gameType="'schulte'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, reactive, watch } from 'vue'
import services from '@/services/index'
import { formatMilliseconds } from '@/utils/time'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Transition from '@/components/Transition.vue'
import SchulteStatsModal from '@/components/SchulteStatsModal.vue'
import { gameDataManager, type GameStatistics } from '@/utils/game-data-manager'
import { schulteScore } from '@/utils/schulte-score'
import { gameSettingsManager, type SchulteSettings } from '@/utils/game-settings-manager'
import { medalManager } from '@/utils/medal-manager'
import { useRouter } from 'vue-router'
import GameResultStats from '@/components/GameResultStats.vue'
import GameMedalDisplay from '@/components/GameMedalDisplay.vue'
import GamePersonalStats from '@/components/GamePersonalStats.vue'

// 类型定义
interface GridCell {
  value: number
  clicked: boolean
  isPressed: boolean
}

interface ClickItemEvent {
  currentIndex: number
}

// 段位数据配置
interface RankInfo {
  name: string
  icon: string
  color: string
  bgColor: string
}

const RANK_CONFIG: Record<string, RankInfo> = {
  'bronze': { name: '青铜', icon: '🥉', color: '#CD7F32', bgColor: 'rgba(205, 127, 50, 0.1)' },
  'silver': { name: '白银', icon: '🥈', color: '#C0C0C0', bgColor: 'rgba(192, 192, 192, 0.1)' },
  'gold': { name: '黄金', icon: '🥇', color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.1)' },
  'platinum': { name: '铂金', icon: '💎', color: '#E5E4E2', bgColor: 'rgba(229, 228, 226, 0.1)' },
  'diamond': { name: '钻石', icon: '💍', color: '#B9F2FF', bgColor: 'rgba(185, 242, 255, 0.1)' },
  'master': { name: '大师', icon: '👑', color: '#FF6B6B', bgColor: 'rgba(255, 107, 107, 0.1)' },
  'king': { name: '王者', icon: '🏆', color: '#FF4757', bgColor: 'rgba(255, 71, 87, 0.1)' }
}

// 根据分数获取段位
function getRankByScore(score: number): RankInfo {
  if (score >= 99) return RANK_CONFIG.king
  if (score >= 95) return RANK_CONFIG.master
  if (score >= 90) return RANK_CONFIG.diamond
  if (score >= 80) return RANK_CONFIG.platinum
  if (score >= 70) return RANK_CONFIG.gold
  if (score >= 60) return RANK_CONFIG.silver
  return RANK_CONFIG.bronze
}

const COUNTDONW_TIME = 3

// 路由实例
const router = useRouter()

// 开始界面逻辑
const sizeOption = ref(0)
const sizeItems = ['3×3', '4×4', '5×5', '6×6', '7×7', '8×8']

const background = ref(2)
const bgItems = ['默认', '白色', '七彩']

const selectedType = ref(0)
const selectItems = ['选中', '消失', '不选中']

const vibrate = ref(0)
const vibrateItems = ['开启', '关闭']

const audioType = ref(0)
const audioItems = ['关闭', '音效1', '音效2', '音效3', '音效4', '音效5', '音效6']

const countdownType = ref(0)
const countdownItems = ['开启', '关闭']

let startTime = 0
const timeCounter = ref(0)
const countdown = ref(COUNTDONW_TIME)

const state = ref(1)
let clickAudio: HTMLAudioElement | null = null
let errorAudio: HTMLAudioElement | null = null

let timer: ReturnType<typeof setInterval> | undefined
let countdownTimer: ReturnType<typeof setInterval> | undefined
let bgClassList: number[] = []

import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'

// 用户记录数据结构与状态
interface UserRecord { historyBest: { size: number; best_duration: number }[]; todayBest: { size: number; best_duration: number }[] }
const userRecords = reactive<UserRecord>({ historyBest: [], todayBest: [] })

// 游戏统计数据
const gameStats = ref<GameStatistics | null>(null)

// 数据统计弹窗
const showStatsModal = ref(false)

// 错误次数统计
const errorCount = ref(0)

// 游戏分数
const gameScore = ref<number | null>(null)

// 当前游戏的段位信息
const currentRank = computed(() => {
  if (gameScore.value === null) return null
  return getRankByScore(gameScore.value)
})


// 静默获取用户记录并写入本地缓存（不阻塞渲染）
async function fetchUserRecords() {
  try {
    const userId = await appManager.getUserId()
    if (!userId) return
    const json = await services.getRecord(userId)
    if (json?.success && json?.data) {
      userRecords.historyBest = json.data.historyBest || []
      userRecords.todayBest = json.data.todayBest || []
      localStorage.setItem('schulte_user_records', JSON.stringify(json.data))
    }
  } catch (e) {
    const cached = localStorage.getItem('schulte_user_records')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        userRecords.historyBest = parsed.historyBest || []
        userRecords.todayBest = parsed.todayBest || []
      } catch {}
    }
  }
}

// 震动和音频API（使用鸿蒙app桥接工具）
const vibrateShortHandler = () => {
  // 只在震动开启时执行
  if (vibrate.value === 0) {
    vibrateShort()
  }
}

const playAudioHandler = (type: string) => {
  // 只在音效开启时执行
  if (audioType.value !== 0) {
    // 根据类型映射到对应的声音
    let soundType: 'success' | 'warning' | 'button' | 'error' = 'button';
    
    switch (type) {
      case 'button':
        soundType = 'button';
        break;
      case 'error':
        soundType = 'error';
        break;
      default:
        soundType = 'button';
    }
    
    // 传递当前的audioType值
    playSound(soundType, audioType.value);
  }
}

// 统一的游戏反馈处理（只处理震动，音效在具体场景中处理）
const handleGameFeedback = (isSuccess: boolean) => {
  if (vibrate.value === 0) {
    if (isSuccess) {
      // 游戏成功震动
      vibrateSuccess();
    } else {
      // 游戏失败震动
      vibrateFailure();
    }
  }
}

const start = () => {
  initGrid()
  currentIndex.value = 1
  state.value = 2
  errorCount.value = 0  // 重置错误次数
  
  // 重置倒计时
  countdown.value = COUNTDONW_TIME
  
  const startCount = () => {
    startTime = Date.now()
    timer = setInterval(() => {
      timeCounter.value = Date.now() - startTime
    }, 20)
  }
  
  if (countdownType.value === 0) {
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value < 1) {
        clearInterval(countdownTimer)
        startCount()
      }
    }, 1000)
  } else {
    startCount()
  }
}

// 游戏界面逻辑
const grid = ref<GridCell[]>([])
const gridSize = computed(() => {
  return sizeOption.value + 3
})

const gridContainerStyle = computed(() => {
  return {
    '--grid-row-count': gridSize.value
  }
})

const currentIndex = ref(1)

function initGrid() {
  const totalCells = gridSize.value * gridSize.value
  const values = Array.from({ length: totalCells }, (_, index) => index + 1)
  shuffleArray(values)
  grid.value = []
  for (let i = 0; i < totalCells; i++) {
    grid.value.push({
      value: values[i],
      clicked: false,
      isPressed: false
    })
  }
}

function shuffleArray(array: number[]) {
  bgClassList = []
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
    bgClassList[i] = Math.ceil(Math.random() * 7)
  }
  bgClassList[0] = Math.ceil(Math.random() * 7)
}

function cellPress(index: number) {
  const currentCell = grid.value[index]
  if (!currentCell.clicked) {
    currentCell.isPressed = true
  }
}

function cellRelease(index: number) {
  vibrateShortHandler()
  const currentCell = grid.value[index]
  if (!currentCell.clicked) {
    if (currentCell.value === currentIndex.value) {
      currentCell.clicked = true
      currentIndex.value++
      if (currentIndex.value > gridSize.value * gridSize.value) {
        // 游戏成功，使用app管理器的成功反馈
        handleGameFeedback(true)
        
        // 保存游戏数据和获取统计信息
        saveGameData()
        
        state.value = 3
        // sendResult()
        closeGame()
        currentIndex.value--
      } else {
        // 点击正确，播放按钮音效
        playAudioHandler('button')
      }
    } else {
      // 游戏失败，使用app管理器的失败反馈
      handleGameFeedback(false)
      errorCount.value++  // 增加错误计数
    }
    currentCell.isPressed = false
  }
}

const sendResult = () => {
  services.sendResult({
    duration: timeCounter.value,
    size: gridSize.value,
    selectedType: selectedType.value,
  }).then((res: any) => {
    // 静默更新本地记录数据（非阻塞）
    if (res?.success && res?.data) {
      userRecords.historyBest = res.data.historyBest || []
      userRecords.todayBest = res.data.todayBest || []
      localStorage.setItem('schulte_user_records', JSON.stringify({
        historyBest: userRecords.historyBest,
        todayBest: userRecords.todayBest
      }))
    }
  }).catch(error => {
    console.log('发送结果失败:', error)
    // 即使失败也不影响用户体验
  })
}

function resetGrid() {
  closeGame()
  start()
}

function closeGame() {
  grid.value = []
  countdown.value = COUNTDONW_TIME
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
  
  // 清理定时器引用
  timer = undefined
  countdownTimer = undefined
}

const selectMap = ['cell-card-clicked', 'cell-card-disappear', '']

// 保存游戏数据并获取统计信息
function saveGameData() {
  try {
    const currentSize = gridSize.value
    const duration = timeCounter.value
    const errors = errorCount.value
    const createdTime = Date.now()
    
    // 计算游戏分数
    try {
      gameScore.value = schulteScore(currentSize, duration)
    } catch (error) {
      console.warn('计算Schulte分数失败:', error)
      gameScore.value = null
    }
    
    // 保存游戏记录
    const success = gameDataManager.addGameRecord('schulte', {
      duration,
      size: currentSize,
      createdTime,
      errorCount: errors,
      score: gameScore.value || 0  // 保存分数，如果分数为null则保存0
    })
    
    if (success) {
      // 获取统计数据
      gameStats.value = gameDataManager.getGameStatistics('schulte', duration, currentSize, errors)
    }
  } catch (error) {
    console.warn('保存Schulte游戏数据失败:', error)
    // 即使保存失败也不影响用户体验
  }
}

function goHome() {
  timeCounter.value = 0
  closeGame()
  state.value = 1
  gameStats.value = null  // 清空统计数据
  gameScore.value = null  // 清空游戏分数
}

// 加载游戏设置
const loadGameSettings = () => {
  try {
    const settings = gameSettingsManager.getGameSettings('schulte') as SchulteSettings
    
    sizeOption.value = settings.sizeOption
    selectedType.value = settings.selectedType
    background.value = settings.background
    vibrate.value = settings.vibrate
    countdownType.value = settings.countdownType
    audioType.value = settings.audioType
  } catch (error) {
    console.warn('加载Schulte游戏设置失败:', error)
  }
}

// 保存游戏设置
const saveGameSettings = () => {
  try {
    const settings: SchulteSettings = {
      sizeOption: sizeOption.value,
      selectedType: selectedType.value,
      background: background.value,
      vibrate: vibrate.value,
      countdownType: countdownType.value,
      audioType: audioType.value
    }
    
    gameSettingsManager.saveGameSettings('schulte', settings)
  } catch (error) {
    console.warn('保存Schulte游戏设置失败:', error)
  }
}

onMounted(async () => {
  // 加载用户设置
  loadGameSettings()
  
  // 初始化移动端优化
  initMobileOptimization();
  
  
  // 初始化音频管理器（预加载所有音频文件）
  try {
    await audioManager.init();
    console.log('音频管理器初始化完成');
  } catch (error) {
    console.error('音频管理器初始化失败:', error);
  }
  
  // 在后台静默初始化appManager，不阻塞页面渲染
  appManager.init().catch(error => {
    console.error('AppManager初始化失败:', error);
  });
  
  // 静默拉取用户记录，不阻塞渲染
  // fetchUserRecords().catch(() => {})
})


// 监听设置变化并自动保存
watch([sizeOption, selectedType, background, vibrate, countdownType, audioType], () => {
  saveGameSettings()
}, { deep: true })

onUnmounted(() => {
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
})
</script>

<style scoped>
.container {
  height: 100%;
  text-align: center;
  box-sizing: border-box;
  font-family: "Microsoft YaHei", 微软雅黑;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

/* 顶部状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  height: 44px;
  flex-shrink: 0;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.arrow {
  font-size: 12px;
  color: #666;
}

.status-center {
  flex: 1;
  text-align: center;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  color: #f09491;
  margin: 0;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}

.nav-dots {
  display: flex;
  gap: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ddd;
}

.dot.active {
  background-color: #f09491;
}

.start-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  position: relative;
}

.score-bar {
  height: 50px;
  display: flex;
  justify-content: space-between;
  color: #999;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  margin-bottom: 15px;
  gap: 10px;
}

.score-item {
  flex: 1;
  height: 100%;
  background-color: #f6f6f6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.score-item > div {
  height: 25px;
  line-height: 25px;
  font-size: 16px;
  text-align: center;
}

.score-item .score-icon {
  height: 56px;
  line-height: 56px;
  font-size: 42px;
  width: 56px;
}

.time-wrap {
  width: 74px;
  text-align: justify;
}

.option-label {
  margin-top: 8px;
  margin-bottom: 4px;
  color: #505050;
  font-size: 14px;
  font-weight: 500;
}

.start-button {
  background-color: #f09491;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 30px;
  box-shadow: 0 4px 12px rgba(240, 148, 145, 0.3);
  transition: all 0.3s ease;
  width: 100%;
  max-width: 300px;
  align-self: center;
}

.start-button:hover {
  background-color: #e88582;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(240, 148, 145, 0.4);
}

.start-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(240, 148, 145, 0.3);
}

.stats-icon {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  border: none;
  background: rgba(240, 148, 145, 0.1);
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(240, 148, 145, 0.2);
}

.stats-icon:hover {
  background: rgba(240, 148, 145, 0.2);
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(240, 148, 145, 0.3);
}

.stats-icon:active {
  transform: scale(0.95);
}

.restart-button {
  background-color: #f09491;
  color: #fff;
  width: 100%;
  border: 0;
}

.restart-button:hover {
  background-color: #e88582;
}

.back-button {
  background-color: #fff;
  color: #6c757d;
  width: 100%;
  border: 1px solid #6c757d;
}

.game-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 15px;
  padding-bottom: 130px;
  overflow: hidden;
}

.game-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.grid-container {
  position: relative;
  width: 345px;
  height: 345px;
  background-color: #f6f6f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
}

.grid-container.bg-red {
  background-color: #b93f3d;
}

.grid-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  position: relative;
}

.countdown {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  color: #ccc;
  font-weight: bold;
}

.grid-item {
  width: calc(100% / var(--grid-row-count));
  height: calc(100% / var(--grid-row-count));
  box-sizing: border-box;
  padding: 3px;
}

.cell-card {
  border: none;
  outline: none;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: #e8dfd7;
  font-weight: bold;
  font-family: "Microsoft YaHei", 微软雅黑;
  color: #505050;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.cell-card-pressed {
  background-color: #e48d5f !important;
  color: #fff !important;
}

.cell-card-bg0 {
  background-color: #fff;
}

.cell-card-bg1 {
  background-color: #daf8ae;
}

.cell-card-bg2 {
  background-color: #f2d6ba;
}

.cell-card-bg3 {
  background-color: #f3b7b8;
}

.cell-card-bg4 {
  background-color: #bceae1;
}

.cell-card-bg5 {
  background-color: #f5dfb2;
}

.cell-card-bg6 {
  background-color: #f3b6c9;
}

.cell-card-bg7 {
  background-color: #bebdee;
}

.cell-card-clicked {
  background-color: #e48d5f;
  color: #fff;
}

.cell-card-disappear {
  display: none;
}

.cell-card-3 {
  font-size: 34px;
}

.cell-card-4 {
  font-size: 28px;
}

.cell-card-5 {
  font-size: 24px;
}

.cell-card-6 {
  font-size: 22px;
}

.cell-card-7 {
  font-size: 20px;
}

.cell-card-8 {
  font-size: 18px;
}

.stats-section {
  padding: 40px 30px 20px 30px;
}
/* 成绩统计容器 */
.stats-container {
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

/* 段位展示 */
.rank-display {
  width: 100%;
  margin: 20px 0;
  animation: rankSlideIn 0.8s ease-out 0.3s both;
}

.rank-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 32px;
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.rank-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.rank-container:hover::before {
  left: 100%;
}

.rank-icon {
  font-size: 40px;
  margin-right: 16px;
  animation: rankIconBounce 1.2s ease-in-out infinite;
}

.rank-info {
  text-align: left;
}

.rank-title {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.rank-name {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@keyframes rankSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes rankIconBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  60% {
    transform: translateY(-4px);
  }
}

/* 奖章入口 */
.medal-entrance {
  width: 100%;
  margin: 20px 0;
  cursor: pointer;
  animation: slideInUp 0.8s ease-out 0.5s both;
}

.medal-entrance-container {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f09491 0%, #f7a8a6 100%);
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow:
    0 8px 32px rgba(240, 148, 145, 0.3),
    0 4px 16px rgba(240, 148, 145, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.medal-entrance-container:hover {
  transform: translateY(-2px);
  box-shadow:
    0 12px 40px rgba(240, 148, 145, 0.4),
    0 6px 20px rgba(240, 148, 145, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.medal-entrance-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}

.medal-entrance-container:hover::before {
  left: 100%;
}

.medal-entrance-left {
  flex-shrink: 0;
  margin-right: 16px;
}

.recent-medals {
  display: flex;
  gap: 4px;
}

.recent-medal-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  animation: medalIconFloat 2s ease-in-out infinite;
}

.recent-medal-icon:nth-child(2) {
  animation-delay: 0.3s;
}

.recent-medal-icon:nth-child(3) {
  animation-delay: 0.6s;
}

.no-medals {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  opacity: 0.7;
}

.medal-entrance-center {
  flex: 1;
  text-align: left;
  color: white;
}

.medal-entrance-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.medal-entrance-subtitle {
  font-size: 12px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.medal-entrance-right {
  flex-shrink: 0;
  text-align: right;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.medal-progress {
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.medal-arrow {
  font-size: 20px;
  font-weight: bold;
  opacity: 0.8;
  transition: transform 0.3s ease;
}

.medal-entrance-container:hover .medal-arrow {
  transform: translateX(4px);
}

@keyframes medalIconFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-2px) scale(1.05);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 详细统计 */
.result-details {
  width: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.85) 100%);
  backdrop-filter: blur(20px);
  border-radius: 18px;
  padding: 24px;
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
  padding: 16px 0;
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

/* 动画效果 */
@keyframes celebrateIcon {
  0% {
    transform: scale(0.3) rotate(-15deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) rotate(5deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translateY(0);
  }
  40%, 43% {
    transform: translateY(-20px);
  }
  70% {
    transform: translateY(-10px);
  }
  90% {
    transform: translateY(-4px);
  }
}

/* 移动端适配 */

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 15px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer button {
  height: 48px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .container {
    padding: 0;
  }
  
  .start-screen {
    padding: 15px;
  }
  
  .game-section {
    padding: 12px;
    padding-bottom: 120px;
  }
  
  
  .countdown {
    font-size: 100px;
  }
  
  .status-bar {
    padding: 6px 12px;
    height: 40px;
  }
  
  .app-title {
    font-size: 16px;
  }
  
  .time {
    font-size: 12px;
  }
  
  .score-bar {
    margin-bottom: 10px;
  }
  
  .game-body {
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  
  .countdown {
  font-size: 80px;
  font-weight: bold;
  animation: countdown-pulse 0.5s ease-in-out;
}

/* 倒计时动画 */
.countdown-fade-enter-active,
.countdown-fade-leave-active {
  transition: all 0.5s ease;
}

.countdown-fade-enter-from {
  opacity: 0;
  transform: scale(0.5);
}

.countdown-fade-enter-to {
  opacity: 1;
  transform: scale(1);
}

.countdown-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.countdown-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

@keyframes countdown-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
  
  .cell-card-3 {
    font-size: 28px;
  }
  
  .cell-card-4 {
    font-size: 24px;
  }
  
  .cell-card-5 {
    font-size: 20px;
  }
  
  .cell-card-6 {
    font-size: 18px;
  }
  
  .cell-card-7 {
    font-size: 16px;
  }
  
  .cell-card-8 {
    font-size: 14px;
  }
  
  .start-screen {
    padding: 12px;
  }
  
  .game-section {
    padding: 10px;
    padding-bottom: 110px;
  }
  
  .status-bar {
    padding: 4px 8px;
    height: 36px;
  }
  
  .app-title {
    font-size: 14px;
  }
  
  .status-icons {
    font-size: 10px;
  }
  
  .nav-dots .dot {
    width: 4px;
    height: 4px;
  }
  
  .score-bar {
    margin-bottom: 8px;
  }
  
  .game-body {
    margin-bottom: 8px;
  }
  
  .footer {
    gap: 8px;
    padding: 12px;
  }
}
</style>
