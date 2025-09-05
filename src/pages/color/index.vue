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
                @mousedown="optionPress(index)"
                @mouseup="optionRelease(index)"
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
    <div class="game-section" v-else-if="state === 3">
      <div class="game-body">
        <div class="game-container bg-green">
          <div class="score-section">
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { formatMilliseconds } from '@/utils/time'
import SegmentedControl from '@/components/SegmentedControl.vue'
import Transition from '@/components/Transition.vue'
import { appManager, playSound, vibrateShort, vibrateSuccess, vibrateFailure } from '@/utils/app-bridge'
import { initMobileOptimization } from '@/utils/mobile-optimization'
import { audioManager } from '@/utils/audio-cache'
import { swManager } from '@/utils/sw-manager'

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
      state.value = 3
      closeGame()
    } else {
      // 下一题
      currentQuestion.value++
      generateQuestion()
    }
  } else {
    // 答案错误
    playAudioHandler('error')
    handleGameFeedback(false)
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
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
