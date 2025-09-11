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
          <div>关卡</div>
          <div>{{ currentLevel }}/{{ maxLevel }}</div>
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
            
            <!-- 游戏阶段提示 -->
            <div v-if="gamePhase === 'waiting'" class="phase-hint">
              记住这些数字的位置，点击 1 开始
            </div>
            <div v-else-if="gamePhase === 'clicking'" class="phase-hint">
              按顺序点击：{{ nextExpectedNumber }}
            </div>
            
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
                  !cell.hasNumber ? 'cell-card-bg0' : (background === 0 ? '' : (background === 1 ? `cell-card-bg${bgClassList[index]}` : '')),
                  cell.clicked ? 'cell-card-clicked' : '',
                  cell.isPressed ? 'cell-card-pressed' : '',
                  cell.isErrorShaking ? 'cell-card-error' : ''
                ]"
                @touchstart="cellPress(index)"
                @touchend="cellRelease(index)"
                @mousedown="cellPress(index)"
                @mouseup="cellRelease(index)"
                :disabled="false"
              >
                {{ showNumber(cell) }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <button class="restart-button" @click="resetGame">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>

    <!-- 结果界面 -->
    <div class="stats-section" v-else-if="state === 3">
      <!-- 成绩统计容器 -->
      <GameResultStats 
        :duration="timeCounter" 
        :error-count="errorCount" 
      />
      
      <!-- 奖章入口 -->
      <GameMedalDisplay game-type="memory" />
      
      <!-- 详细统计 -->
      <GamePersonalStats 
        v-if="gameStats"
        :personal-best="gameStats.personalBest || 0"
        :today-count="gameStats.todayCount"
        :today-best="gameStats.todayBest || 0"
      />
      <div class="footer">
        <button class="restart-button" @click="resetGame">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>
    
    <!-- 数据统计弹窗 -->
    <SchulteStatsModal 
      v-model:visible="showStatsModal"
      :gameType="'memory'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { formatMilliseconds } from '@/utils/time'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Transition from '@/components/Transition.vue'
import SchulteStatsModal from '@/components/SchulteStatsModal.vue'
import { gameDataManager, type GameStatistics } from '@/utils/game-data-manager'
import { gameSettingsManager, type MemorySettings } from '@/utils/game-settings-manager'
import { medalManager } from '@/utils/medal-manager'
import { useRouter } from 'vue-router'
import GameResultStats from '@/components/GameResultStats.vue'
import GameMedalDisplay from '@/components/GameMedalDisplay.vue'
import GamePersonalStats from '@/components/GamePersonalStats.vue'
import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'

// 类型定义
interface GridCell {
  value: number
  hasNumber: boolean
  clicked: boolean
  isPressed: boolean
  isErrorShaking: boolean
}

interface ClickItemEvent {
  currentIndex: number
}

const COUNTDOWN_TIME = 3

// 路由实例
const router = useRouter()

// 开始界面逻辑
const sizeOption = ref(0)
const sizeItems = ['3×3', '4×4', '5×5', '6×6', '7×7', '8×8']

const background = ref(1)
const bgItems = ['默认', '七彩']

const vibrate = ref(0)
const vibrateItems = ['开启', '关闭']

const audioType = ref(0)
const audioItems = ['关闭', '音效1', '音效2', '音效3', '音效4', '音效5', '音效6']

const countdownType = ref(0)
const countdownItems = ['开启', '关闭']

let startTime = 0
const timeCounter = ref(0)
const countdown = ref(COUNTDOWN_TIME)

const state = ref(1) // 1: 开始界面, 2: 游戏界面, 3: 结果界面
const gamePhase = ref<'waiting' | 'clicking'>('waiting') // 游戏阶段
const currentLevel = ref(1) // 当前关卡
const maxLevel = ref(2) // 最大关卡数
const nextExpectedNumber = ref(1) // 下一个期望的数字
const numbersHidden = ref(false) // 数字是否已隐藏

let timer: ReturnType<typeof setInterval> | undefined
let countdownTimer: ReturnType<typeof setInterval> | undefined
let phaseTimer: ReturnType<typeof setTimeout> | undefined
let bgClassList: number[] = []

// 游戏统计数据
const gameStats = ref<GameStatistics | null>(null)


// 数据统计弹窗
const showStatsModal = ref(false)

// 错误次数统计
const errorCount = ref(0)

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

// 计算最大关卡数（根据方格尺寸）
const updateMaxLevel = () => {
  const totalCells = gridSize.value * gridSize.value
  maxLevel.value = totalCells - 1 // 从2个数字开始，到全部方格
}

// 震动和音频处理
const vibrateShortHandler = () => {
  if (vibrate.value === 0) {
    vibrateShort()
  }
}

const playAudioHandler = (type: string) => {
  if (audioType.value !== 0) {
    let soundType: 'success' | 'warning' | 'button' | 'error' = 'button'
    
    switch (type) {
      case 'button':
        soundType = 'button'
        break
      case 'error':
        soundType = 'error'
        break
      case 'success':
        soundType = 'success'
        break
      default:
        soundType = 'button'
    }
    
    playSound(soundType, audioType.value)
  }
}

const handleGameFeedback = (isSuccess: boolean) => {
  if (vibrate.value === 0) {
    if (isSuccess) {
      vibrateSuccess()
    } else {
      vibrateFailure()
    }
  }
}

const start = () => {
  updateMaxLevel()
  currentLevel.value = 1
  nextExpectedNumber.value = 1
  state.value = 2
  errorCount.value = 0  // 重置错误次数
  
  // 重置倒计时
  countdown.value = COUNTDOWN_TIME
  
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
        initLevel()
      }
    }, 1000)
  } else {
    startCount()
    initLevel()
  }
}

// 初始化关卡
const initLevel = () => {
  const totalCells = gridSize.value * gridSize.value
  
  // 创建网格
  grid.value = []
  for (let i = 0; i < totalCells; i++) {
    grid.value.push({
      value: 0,
      hasNumber: false,
      clicked: false,
      isPressed: false,
      isErrorShaking: false
    })
  }
  
  // 随机生成背景色
  bgClassList = []
  for (let i = 0; i < totalCells; i++) {
    bgClassList[i] = Math.ceil(Math.random() * 7)
  }
  
  // 随机选择位置放置数字
  const numbersToPlace = currentLevel.value + 1 // 从2个开始
  const positions = getRandomPositions(totalCells, numbersToPlace)
  
  positions.forEach((pos, index) => {
    grid.value[pos].value = index + 1
    grid.value[pos].hasNumber = true
  })
  
  // 直接进入等待阶段（等待用户点击数字1）
  gamePhase.value = 'waiting'
  numbersHidden.value = false
  nextExpectedNumber.value = 1
}

// 获取随机位置
const getRandomPositions = (total: number, count: number): number[] => {
  const positions: number[] = []
  const available = Array.from({ length: total }, (_, i) => i)
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length)
    positions.push(available[randomIndex])
    available.splice(randomIndex, 1)
  }
  
  return positions
}

// 重置所有色块颜色为白色
const resetCellColors = () => {
  grid.value.forEach(cell => {
    cell.hasNumber = false
    cell.clicked = false
    cell.value = 0
  })
}

// 保存游戏数据并获取统计信息
function saveGameData() {
  try {
    const currentSize = gridSize.value
    const duration = timeCounter.value
    const errors = errorCount.value
    const createdTime = Date.now()
    
    // 保存游戏记录
    const success = gameDataManager.addGameRecord('memory', {
      duration,
      size: currentSize,
      createdTime,
      errorCount: errors
    })
    
    if (success) {
      // 获取统计数据
      gameStats.value = gameDataManager.getGameStatistics('memory', duration, currentSize, errors)
    }
  } catch (error) {
    console.warn('保存Memory游戏数据失败:', error)
    // 即使保存失败也不影响用户体验
  }
}

// 决定是否显示数字
const showNumber = (cell: GridCell): string => {
  if (!cell.hasNumber) return ''
  
  // 在waiting阶段显示所有数字
  if (gamePhase.value === 'waiting') {
    return cell.value.toString()
  }
  
  // 在clicking阶段只显示已点击的数字
  if (gamePhase.value === 'clicking' && cell.clicked) {
    return cell.value.toString()
  }
  
  return ''
}

function cellPress(index: number) {
  const currentCell = grid.value[index]
  if ((gamePhase.value === 'waiting' || gamePhase.value === 'clicking') && currentCell.hasNumber && !currentCell.clicked) {
    currentCell.isPressed = true
  }
}

function cellRelease(index: number) {
  const currentCell = grid.value[index]
  
  if (gamePhase.value !== 'waiting' && gamePhase.value !== 'clicking') {
    currentCell.isPressed = false
    return
  }
  
  vibrateShortHandler()
  
  if (!currentCell.hasNumber) {
    currentCell.isPressed = false
    return
  }
  
  if (currentCell.clicked) {
    currentCell.isPressed = false
    return
  }
  
  // 如果在waiting阶段，检查是否点击了数字1
  if (gamePhase.value === 'waiting') {
    if (currentCell.value === 1) {
      // 点击了数字1，进入clicking阶段
      gamePhase.value = 'clicking'
      numbersHidden.value = true
      currentCell.clicked = true
      nextExpectedNumber.value = 2
      playAudioHandler('button')
    } else {
      // 点击错误
      playAudioHandler('error')
      handleGameFeedback(false)
      errorCount.value++  // 增加错误计数
      
      // 显示错误动画
      currentCell.isErrorShaking = true
      setTimeout(() => {
        currentCell.isErrorShaking = false
      }, 500)
    }
    currentCell.isPressed = false
    return
  }
  
  // 检查是否点击了正确的数字
  if (currentCell.value === nextExpectedNumber.value) {
    // 点击正确
    currentCell.clicked = true
    currentCell.isPressed = false // 立即重置按压状态
    nextExpectedNumber.value++
    playAudioHandler('button')
    
    // 检查当前关卡是否完成
    const currentLevelNumbers = currentLevel.value + 1
    if (nextExpectedNumber.value > currentLevelNumbers) {
      // 当前关卡完成
      if (currentLevel.value >= maxLevel.value) {
        // 游戏完成
        handleGameFeedback(true)
        
        // 保存游戏数据和获取统计信息
        saveGameData()
        
        state.value = 3
        closeGame()
      } else {
        // 进入下一关卡
        currentLevel.value++
        playAudioHandler('success')
        // 关卡完成后，延迟100ms再开始下一关
        setTimeout(() => {
          resetCellColors()
          initLevel()
        }, 100)
      }
      return // 关卡完成后直接返回，避免执行后续逻辑
    }
  } else {
    // 点击错误
    playAudioHandler('error')
    handleGameFeedback(false)
    errorCount.value++  // 增加错误计数
    
    // 显示错误动画
    currentCell.isErrorShaking = true
    setTimeout(() => {
      currentCell.isErrorShaking = false
    }, 500)
  }
  
  currentCell.isPressed = false
}

function resetGame() {
  closeGame()
  start()
}

function closeGame() {
  grid.value = []
  countdown.value = COUNTDOWN_TIME
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
  phaseTimer && clearTimeout(phaseTimer)
  
  // 清理定时器引用
  timer = undefined
  countdownTimer = undefined
  phaseTimer = undefined
}

function goHome() {
  timeCounter.value = 0
  closeGame()
  state.value = 1
  gameStats.value = null  // 清空统计数据
}

// 加载游戏设置
const loadGameSettings = () => {
  try {
    const settings = gameSettingsManager.getGameSettings('memory') as MemorySettings
    
    sizeOption.value = settings.sizeOption
    // Memory游戏没有selectedType，跳过
    background.value = settings.background
    vibrate.value = settings.vibrate
    countdownType.value = settings.countdownType
    audioType.value = settings.audioType
  } catch (error) {
    console.warn('加载Memory游戏设置失败:', error)
  }
}

// 保存游戏设置
const saveGameSettings = () => {
  try {
    const settings: MemorySettings = {
      sizeOption: sizeOption.value,
      selectedType: 0, // Memory游戏没有selectedType，使用默认值
      background: background.value,
      vibrate: vibrate.value,
      countdownType: countdownType.value,
      audioType: audioType.value
    }
    
    gameSettingsManager.saveGameSettings('memory', settings)
  } catch (error) {
    console.warn('保存Memory游戏设置失败:', error)
  }
}

onMounted(async () => {
  // 加载用户设置
  loadGameSettings()
  
  // 初始化移动端优化
  initMobileOptimization()
  
  
  // 初始化音频管理器（预加载所有音频文件）
  try {
    await audioManager.init()
    console.log('音频管理器初始化完成')
  } catch (error) {
    console.error('音频管理器初始化失败:', error)
  }
  
  // 在后台静默初始化appManager，不阻塞页面渲染
  appManager.init().catch(error => {
    console.error('AppManager初始化失败:', error)
  })
})


// 监听设置变化并自动保存
watch([sizeOption, background, vibrate, countdownType, audioType], () => {
  saveGameSettings()
}, { deep: true })

onUnmounted(() => {
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
  phaseTimer && clearTimeout(phaseTimer)
})

// 更新待办事项
const updateTodos = () => {
  // 标记分析完成，开始实现
}
updateTodos()
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

.phase-hint {
  position: absolute;
  top: -40px;
  left: 0;
  width: 100%;
  color: #666;
  font-size: 14px;
  font-weight: 500;
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

.cell-card:disabled {
  cursor: default;
}

.cell-card-pressed {
  background-color: #e48d5f !important;
  color: #fff !important;
}

.cell-card-clicked {
  background-color: #4CAF50;
  color: #fff;
}

.cell-card-error {
  animation: errorShake 0.5s ease-in-out;
  background-color: #f44336 !important;
  color: #fff !important;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
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

.score-section {
  color: #1a202c;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  min-height: 500px;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  border-radius: 24px;
  margin: 16px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.08),
    0 8px 25px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  position: relative;
  overflow: hidden;
}

.score-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 30%, transparent 70%);
  pointer-events: none;
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
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #1e293b 0%, #4f46e5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
</style>
