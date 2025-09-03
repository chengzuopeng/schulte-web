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
    </div>

    <!-- 游戏界面 -->
    <div class="game-section" v-else>
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
        <div :class="['grid-container', state === 3 ? 'bg-red' : '']">
          <div :style="gridContainerStyle" v-if="state === 2" class="grid-wrap">
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
          <div class="score-section" v-else-if="state === 3">
            <div>本次用时</div>
            <div>{{ formatMilliseconds(timeCounter) }}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <button class="restart-button" @click="resetGrid">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, reactive } from 'vue'
import services from '@/services'
import { formatMilliseconds } from '../utils/time.ts'
import SegmentedControl from './SegmentedControl.vue'
import Transition from './Transition.vue'

// 类型定义
interface GridCell {
  value: number
  clicked: boolean
  isPressed: boolean
}

interface ClickItemEvent {
  currentIndex: number
}

const COUNTDONW_TIME = 3

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

let timer: number | undefined
let countdownTimer: number | undefined
let bgClassList: number[] = []

import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'
import { swManager } from '@/utils/sw-manager'

// 用户记录数据结构与状态
interface UserRecord { historyBest: { size: number; best_duration: number }[]; todayBest: { size: number; best_duration: number }[] }
const userRecords = reactive<UserRecord>({ historyBest: [], todayBest: [] })

// 静默获取用户记录并写入本地缓存（不阻塞渲染）
async function fetchUserRecords() {
  try {
    const userId = await appManager.getUserId()
    if (!userId) return
    const res = await fetch(`/api/record?userId=${userId}`)
    const json = await res.json()
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
        state.value = 3
        sendResult()
        closeGame()
        currentIndex.value--
      } else {
        // 点击正确，播放按钮音效
        playAudioHandler('button')
      }
    } else {
      // 游戏失败，使用app管理器的失败反馈
      handleGameFeedback(false)
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

function goHome() {
  timeCounter.value = 0
  closeGame()
  state.value = 1
}

onMounted(async () => {
  // 初始化移动端优化
  initMobileOptimization();
  
  // 注册Service Worker（实现离线缓存）
  try {
    await swManager.register();
    console.log('Service Worker注册完成');
  } catch (error) {
    console.error('Service Worker注册失败:', error);
  }
  
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
  fetchUserRecords().catch(() => {})
})

onUnmounted(() => {
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
})
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
  
  /* .grid-container {
    width: 300px;
    height: 300px;
  } */
  
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
  /* .grid-container {
    width: 280px;
    height: 280px;
  } */
  
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
