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
    </div>

    <!-- 游戏界面 -->
    <div class="game-section" v-else>
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
        <div :class="['grid-container', state === 3 ? 'bg-red' : '']">
          <div :style="gridContainerStyle" v-if="state === 2" class="grid-wrap">
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
          <div class="score-section" v-else-if="state === 3">
            <div>练习完成！</div>
            <div>总用时：{{ formatMilliseconds(timeCounter) }}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <button class="restart-button" @click="resetGame">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { formatMilliseconds } from '@/utils/time'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Transition from '@/components/Transition.vue'
import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'
import { swManager } from '@/utils/sw-manager'

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
    nextExpectedNumber.value++
    playAudioHandler('button')
    
    // 检查当前关卡是否完成
    const currentLevelNumbers = currentLevel.value + 1
    if (nextExpectedNumber.value > currentLevelNumbers) {
      // 当前关卡完成
      if (currentLevel.value >= maxLevel.value) {
        // 游戏完成
        handleGameFeedback(true)
        state.value = 3
        closeGame()
      } else {
        // 进入下一关卡
        currentLevel.value++
        playAudioHandler('success')
        // 关卡完成后，立即重置并开始下一关
        resetCellColors()
        initLevel()
      }
    }
  } else {
    // 点击错误
    playAudioHandler('error')
    handleGameFeedback(false)
    
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
}

onMounted(async () => {
  // 初始化移动端优化
  initMobileOptimization()
  
  // 注册Service Worker（实现离线缓存）
  try {
    await swManager.register()
    console.log('Service Worker注册完成')
  } catch (error) {
    console.error('Service Worker注册失败:', error)
  }
  
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
  height: 100vh;
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
  color: #fff;
}

.score-section > div {
  line-height: 40px;
  font-size: 26px;
}

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
