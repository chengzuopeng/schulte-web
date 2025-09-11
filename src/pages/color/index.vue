<template>
  <div class="container">
    <!-- 开始界面 -->
    <div v-if="state === 1" class="start-screen">
      <div class="option-label">选项数量</div>
      <SegmentedControl 
        activeColor="#f09491" 
        :current="optionCountIndex" 
        :values="optionCountItems" 
        @clickItem="(e: ClickItemEvent) => optionCountIndex = e.currentIndex" 
      />
      
      <div class="option-label">题目数量</div>
      <SegmentedControl 
        activeColor="#73c2c4" 
        :current="questionCountIndex" 
        :values="questionCountItems" 
        @clickItem="(e: ClickItemEvent) => questionCountIndex = e.currentIndex" 
      />
      
      <div class="option-label">文字干扰</div>
      <SegmentedControl 
        activeColor="#f79066" 
        :current="textInterference" 
        :values="textInterferenceItems" 
        @clickItem="(e: ClickItemEvent) => textInterference = e.currentIndex" 
      />
      
      <div class="option-label">倒计时</div>
      <SegmentedControl 
        activeColor="#6BB2CC" 
        :current="countdownType" 
        :values="countdownItems" 
        @clickItem="(e: ClickItemEvent) => countdownType = e.currentIndex" 
      />
      
      <div class="option-label">震动效果</div>
      <SegmentedControl 
        activeColor="#e9635d" 
        :current="vibrate" 
        :values="vibrateItems" 
        @clickItem="(e: ClickItemEvent) => vibrate = e.currentIndex" 
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
          <div>题目</div>
          <div>{{ currentQuestion }}/{{ totalQuestions }}</div>
        </div>
        <div class="score-item">
          <div>用时</div>
          <div style="display: flex;justify-content: center;">
            <div class="time-wrap">{{ formatMilliseconds(timeCounter) }}</div>
          </div>
        </div>
      </div>
      
      <div class="game-body">
        <div class="game-container" :style="gameContainerStyle">
          <!-- 倒计时显示 -->
          <Transition name="countdown-fade" v-if="countdownType === 0 && countdown > 0">
            <div class="countdown" :key="countdown">
              {{ countdown }}
            </div>
          </Transition>
          
          <!-- 游戏内容 -->
          <div v-show="countdownType !== 0 || countdown === 0" class="game-content">
            <!-- 提示语 -->
            <div class="instruction">
              请点击 <span class="target-color" :style="{ color: targetColorDisplay }">{{ targetColorName }}</span> 色块：
            </div>
            
            <!-- 颜色选项 -->
            <div class="color-options">
              <button
                v-for="(option, index) in colorOptions"
                :key="index"
                class="color-option"
                :class="[
                  option.isPressed ? 'color-option-pressed' : ''
                ]"
                :style="{ backgroundColor: option.color }"
                @touchstart="optionPress(index)"
                @touchend="optionRelease(index)"
              >
                {{ textInterference === 1 ? option.interferenceText : '' }}
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
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatMilliseconds(timeCounter) }}</div>
            <div class="stat-label">用时</div>
          </div>
        </div>
        
        <div class="stat-item">
          <div class="stat-icon">{{errorCount ? '❌' : '✅'}}</div>
          <div class="stat-content">
            <div class="stat-value">{{ errorCount }}</div>
            <div class="stat-label">错误次数</div>
          </div>
        </div>
      </div>
      
      <!-- 详细统计 -->
      <div v-if="gameStats" class="result-details">
        <div class="detail-row" v-if="gameStats.personalBest !== null">
          <div class="detail-icon">🏆</div>
          <div class="detail-content">
            <div class="detail-label">个人最佳</div>
            <div class="detail-value">{{ formatMilliseconds(gameStats.personalBest) }}</div>
          </div>
        </div>
        
        <div class="detail-row">
          <div class="detail-icon">📅</div>
          <div class="detail-content">
            <div class="detail-label">今日练习</div>
            <div class="detail-value">第{{ gameStats.todayCount }}次</div>
          </div>
        </div>
        
        <div class="detail-row" v-if="gameStats.todayBest !== null">
          <div class="detail-icon">⭐</div>
          <div class="detail-content">
            <div class="detail-label">今日最佳</div>
            <div class="detail-value">{{ formatMilliseconds(gameStats.todayBest) }}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <button class="restart-button" @click="resetGame">重新开始</button>
        <button class="back-button" @click="goHome">返回</button>
      </div>
    </div>
    
    <!-- 数据统计弹窗 -->
    <SchulteStatsModal 
      v-model:visible="showStatsModal"
      :gameType="'color'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { formatMilliseconds } from '@/utils/time'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Transition from '@/components/Transition.vue'
import SchulteStatsModal from '@/components/SchulteStatsModal.vue'
import { gameDataManager, type GameStatistics } from '@/utils/game-data-manager'
import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'

// 类型定义
interface ColorOption {
  name: string
  color: string
  interferenceText: string
  isPressed: boolean
}

interface ClickItemEvent {
  currentIndex: number
}

const COUNTDOWN_TIME = 3

// 更新后的颜色库 - 移除粉色和橙色，添加蓝色
const colorLibrary = [
  { name: '白色', color: '#ffffff' },
  { name: '绿色', color: '#daf8ae' },
  { name: '红色', color: '#f3b7b8' },
  { name: '青色', color: '#bceae1' },
  { name: '黄色', color: '#f5dfb2' },
  { name: '紫色', color: '#bebdee' },
  { name: '蓝色', color: '#a8d8ff' }, // 新增蓝色，与现有配色搭配
]

// 开始界面逻辑
const optionCountIndex = ref(0)
const optionCountItems = ['3个', '4个', '5个', '6个']

const questionCountIndex = ref(0)
const questionCountItems = ['10题', '20题', '30题']

const textInterference = ref(0) // 新增文字干扰选项
const textInterferenceItems = ['关', '开']

const vibrate = ref(0)
const vibrateItems = ['开启', '关闭']

const audioType = ref(0)
const audioItems = ['关闭', '音效1', '音效2', '音效3', '音效4', '音效5', '音效6']

const countdownType = ref(1)
const countdownItems = ['开启', '关闭']

// 游戏状态
let startTime = 0
const timeCounter = ref(0)
const countdown = ref(COUNTDOWN_TIME)
const state = ref(1) // 1: 开始界面, 2: 游戏界面, 3: 结果界面

const currentQuestion = ref(1)
const totalQuestions = ref(10)
const targetColorName = ref('')
const targetColorDisplay = ref('')
const colorOptions = ref<ColorOption[]>([])

let timer: ReturnType<typeof setInterval> | undefined
let countdownTimer: ReturnType<typeof setInterval> | undefined

// 游戏统计数据
const gameStats = ref<GameStatistics | null>(null)

// 数据统计弹窗
const showStatsModal = ref(false)

// 错误次数统计
const errorCount = ref(0)

// 计算游戏容器样式 - 根据选项数量动态调整高度
const gameContainerStyle = computed(() => {
  const optionCount = optionCountIndex.value + 3
  // 基础高度 + 选项高度 + 间距
  const baseHeight = 100 // 提示语等基础内容高度
  const optionHeight = 40 // 每个选项高度
  const gap = 14 // 选项间距
  const totalHeight = baseHeight + (optionCount * optionHeight) + ((optionCount - 1) * gap) + 40 // 额外边距
  
  return {
    height: `${totalHeight}px`
  }
})

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
  // 设置题目数量
  const questionCounts = [10, 20, 30]
  totalQuestions.value = questionCounts[questionCountIndex.value]
  
  currentQuestion.value = 1
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
        generateQuestion()
      }
    }, 1000)
  } else {
    startCount()
    generateQuestion()
  }
}

// 生成题目
const generateQuestion = () => {
  // 获取选项数量
  const optionCount = optionCountIndex.value + 3
  
  // 随机选择目标颜色
  const targetColor = colorLibrary[Math.floor(Math.random() * colorLibrary.length)]
  targetColorName.value = targetColor.name
  
  // 目标颜色文字可能显示为不同颜色（增加干扰）
  const displayColors = colorLibrary.map(c => c.color)
  targetColorDisplay.value = displayColors[Math.floor(Math.random() * displayColors.length)]
  
  // 生成选项，确保包含正确答案
  const options: ColorOption[] = []
  
  // 添加正确答案
  const correctInterferenceColors = colorLibrary.filter(c => c.name !== targetColor.name)
  const correctInterferenceText = correctInterferenceColors[Math.floor(Math.random() * correctInterferenceColors.length)].name
  
  options.push({
    name: targetColor.name,
    color: targetColor.color,
    interferenceText: correctInterferenceText,
    isPressed: false
  })
  
  // 添加错误选项
  const remainingColors = colorLibrary.filter(c => c.name !== targetColor.name)
  for (let i = 1; i < optionCount; i++) {
    const randomColor = remainingColors[Math.floor(Math.random() * remainingColors.length)]
    
    // 为错误选项生成干扰文字（不匹配当前颜色）
    const interferenceColors = colorLibrary.filter(c => c.name !== randomColor.name)
    const interferenceText = interferenceColors[Math.floor(Math.random() * interferenceColors.length)].name
    
    options.push({
      name: randomColor.name,
      color: randomColor.color,
      interferenceText: interferenceText,
      isPressed: false
    })
    
    // 移除已选择的颜色，避免重复
    remainingColors.splice(remainingColors.indexOf(randomColor), 1)
  }
  
  // 打乱选项顺序
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  
  colorOptions.value = options
}

// 保存游戏数据并获取统计信息
function saveGameData() {
  try {
    const currentSize = totalQuestions.value  // 对于color游戏，size是题目数量
    const duration = timeCounter.value
    const errors = errorCount.value
    const createdTime = Date.now()
    const optionCount = optionCountIndex.value + 3  // 选项数量
    const interference = textInterference.value  // 文字干扰 (0/1)
    
    // 保存游戏记录
    const success = gameDataManager.addGameRecord('color', {
      duration,
      size: currentSize,
      createdTime,
      errorCount: errors,
      option: optionCount,
      interfere: interference
    })
    
    if (success) {
      // 获取统计数据
      gameStats.value = gameDataManager.getGameStatistics('color', duration, currentSize, errors)
    }
  } catch (error) {
    console.warn('保存Color游戏数据失败:', error)
    // 即使保存失败也不影响用户体验
  }
}

function optionPress(index: number) {
  colorOptions.value[index].isPressed = true
}

function optionRelease(index: number) {
  vibrateShortHandler()
  const option = colorOptions.value[index]
  option.isPressed = false
  
  // 检查答案
  if (option.name === targetColorName.value) {
    // 答案正确
    playAudioHandler('button')
    
    // 进入下一题
    if (currentQuestion.value >= totalQuestions.value) {
      // 游戏完成
      handleGameFeedback(true)
      
      // 保存游戏数据和获取统计信息
      saveGameData()
      
      state.value = 3
      closeGame()
    } else {
      // 下一题
      currentQuestion.value++
      setTimeout(() => {
        generateQuestion()
      }, 100)
    }
  } else {
    // 答案错误
    playAudioHandler('error')
    handleGameFeedback(false)
    errorCount.value++  // 增加错误计数
    // 留在当前题目，用户可以重新选择
  }
}

function resetGame() {
  closeGame()
  start()
}

function closeGame() {
  countdown.value = COUNTDOWN_TIME
  timer && clearInterval(timer)
  countdownTimer && clearInterval(countdownTimer)
  
  // 清理定时器引用
  timer = undefined
  countdownTimer = undefined
}

function goHome() {
  timeCounter.value = 0
  closeGame()
  state.value = 1
  gameStats.value = null  // 清空统计数据
}

onMounted(async () => {
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

.game-container {
  position: relative;
  width: 345px;
  /* height 现在由 computed 属性动态设置 */
  background-color: #f6f6f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transition: height 0.3s ease;
}

.game-container.bg-green {
  background-color: #4CAF50;
  height: 345px !important; /* 结果界面固定高度 */
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

.game-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 20px;
}

.instruction {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  line-height: 1.5;
  flex-shrink: 0;
}

.target-color {
  font-weight: bold;
  font-size: 24px;
}

.color-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  flex: 1;
}

.color-option {
  border: none;
  outline: none;
  width: 100%;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: bold;
  font-family: "Microsoft YaHei", 微软雅黑;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-option-pressed {
  transform: scale(0.95);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.color-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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
  
  .instruction {
    font-size: 22px;
  }
  
  .target-color {
    font-size: 26px;
  }
  
  .color-option {
    height: 45px;
    font-size: 14px;
  }
  
  .game-container {
    width: 100%;
    max-width: 320px;
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
