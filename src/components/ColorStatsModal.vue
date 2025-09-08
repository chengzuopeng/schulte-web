<template>
  <Transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" @click="closeModal">
      <Transition name="modal-slide">
        <div v-if="visible" class="modal-container" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <h2 class="modal-title">Color练习数据</h2>
            <button class="close-button" @click="closeModal">×</button>
          </div>
          
          <!-- Size 筛选器 -->
          <div class="size-filter">
            <SegmentedControl 
              :values="sizeOptions.map(opt => opt.label)"
              :current="sizeOptions.findIndex(opt => opt.value === selectedSize)"
              active-color="#f09491"
              @click-item="({ currentIndex }) => selectedSize = sizeOptions[currentIndex].value"
            />
          </div>
          
          <!-- 统计概览 -->
          <div class="stats-overview">
            <div class="stats-item">
              <div class="stats-label">练习次数</div>
              <div class="stats-value">{{ filteredStats.totalCount }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">最佳成绩</div>
              <div class="stats-value">{{ filteredStats.bestTime ? formatMilliseconds(filteredStats.bestTime) : '--' }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均用时</div>
              <div class="stats-value">{{ filteredStats.averageTime ? formatMilliseconds(filteredStats.averageTime) : '--' }}</div>
            </div>
            <div class="stats-item">
              <div class="stats-label">平均错误</div>
              <div class="stats-value">{{ filteredStats.averageErrors !== null ? filteredStats.averageErrors.toFixed(1) : '--' }}</div>
            </div>
          </div>
          
          <!-- Tab 切换 -->
          <div class="tab-container">
            <div 
              class="tab-item"
              :class="{ active: activeTab === 'chart' }"
              @click="activeTab = 'chart'"
            >
              图表分析
            </div>
            <div 
              class="tab-item"
              :class="{ active: activeTab === 'records' }"
              @click="activeTab = 'records'"
            >
              详细记录
            </div>
          </div>
          
          <!-- 内容区域 -->
          <div class="content-container">
            <!-- 图表分析 -->
            <div v-if="activeTab === 'chart'" class="chart-container">
              <!-- 图表选项 -->
              <div class="chart-options">
                <SegmentedControl 
                  :values="chartTypeOptions.map(opt => opt.label)"
                  :current="chartTypeOptions.findIndex(opt => opt.value === chartType)"
                  active-color="#f09491"
                  @click-item="({ currentIndex }) => chartType = chartTypeOptions[currentIndex].value"
                />
              </div>
              
              <!-- 图表内容 -->
              <div v-if="hasChartData" class="chart-content">
                <div ref="chartRef" class="chart"></div>
              </div>
              
              <!-- 无数据提示 -->
              <div v-else class="empty-chart">
                <div class="empty-icon">📊</div>
                <div class="empty-text">暂无数据</div>
              </div>
            </div>
            
            <!-- 详细记录 -->
            <div v-if="activeTab === 'records'" class="records-container">
              <div v-if="filteredRecords.length === 0" class="empty-state">
                <div class="empty-icon">📊</div>
                <div class="empty-text">暂无练习记录</div>
              </div>
              
              <div v-else class="records-list">
                <div 
                  v-for="(record, index) in filteredRecords" 
                  :key="index"
                  class="record-item"
                  :class="{ 'best-record': record.duration === filteredStats.bestTime }"
                >
                  <div class="record-main">
                    <div class="record-left">
                      <div class="record-size">{{ record.size }}题</div>
                      <div class="record-time">{{ formatCreatedTime(record.createdTime) }}</div>
                    </div>
                    <div class="record-right">
                      <div class="record-duration">{{ formatMilliseconds(record.duration) }}</div>
                      <div class="record-errors">{{ record.errorCount || 0 }} 错误</div>
                    </div>
                  </div>
                  <div v-if="record.duration === filteredStats.bestTime" class="best-badge">最佳</div>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { formatMilliseconds } from '@/utils/time'
import { gameDataManager } from '@/utils/game-data-manager'
import type { BaseGameRecord } from '@/utils/game-data-manager'
import SegmentedControl from '@/components/SegmentedControl.vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 组件状态
const selectedSize = ref<number | 'all'>('all')
const activeTab = ref<'chart' | 'records'>('chart')
const chartType = ref<'time' | 'errors' | 'count'>('time')
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// Size 选项 (Color游戏的size是题目数量)
const sizeOptions = [
  { value: 'all' as const, label: '全部' },
  { value: 10, label: '10题' },
  { value: 20, label: '20题' },
  { value: 30, label: '30题' }
]

// 图表类型选项
const chartTypeOptions = [
  { value: 'time' as const, label: '时间' },
  { value: 'errors' as const, label: '错误次数' },
  { value: 'count' as const, label: '练习次数' }
]

// 获取所有记录
const allRecords = computed(() => {
  try {
    return gameDataManager.getAllGameRecords('color')
  } catch (error) {
    console.warn('获取Color游戏记录失败:', error)
    return []
  }
})

// 根据选择的 size 过滤记录
const filteredRecords = computed(() => {
  if (selectedSize.value === 'all') {
    return allRecords.value
  }
  return allRecords.value.filter((record: BaseGameRecord) => record.size === selectedSize.value)
})

// 计算过滤后的统计信息
const filteredStats = computed(() => {
  const records = filteredRecords.value
  
  if (records.length === 0) {
    return {
      totalCount: 0,
      bestTime: null,
      averageTime: null,
      averageErrors: null
    }
  }
  
  const totalCount = records.length
  const bestTime = Math.min(...records.map((r: BaseGameRecord) => r.duration))
  const averageTime = records.reduce((sum: number, r: BaseGameRecord) => sum + r.duration, 0) / records.length
  const averageErrors = records.reduce((sum: number, r: BaseGameRecord) => sum + (r.errorCount || 0), 0) / records.length
  
  return {
    totalCount,
    bestTime,
    averageTime,
    averageErrors
  }
})

// 计算图表数据
const chartData = computed(() => {
  const records = filteredRecords.value
  if (records.length === 0) return []
  
  // 按日期分组记录
  const recordsByDate = new Map<string, BaseGameRecord[]>()
  records.forEach((record: BaseGameRecord) => {
    const date = dayjs(record.createdTime).format('YYYY-MM-DD')
    if (!recordsByDate.has(date)) {
      recordsByDate.set(date, [])
    }
    recordsByDate.get(date)!.push(record)
  })
  
  // 获取有数据的日期，按时间排序，最多取最近10天
  const datesWithData = Array.from(recordsByDate.keys())
    .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf()) // 降序排列
    .slice(0, 10) // 最多10天
    .reverse() // 翻转为升序（最早到最晚）
  
  // 计算每天的数据
  return datesWithData.map(date => {
    const dayRecords = recordsByDate.get(date) || []
    
    if (chartType.value === 'time') {
      const bestTime = Math.min(...dayRecords.map((r: BaseGameRecord) => r.duration))
      const averageTime = dayRecords.reduce((sum: number, r: BaseGameRecord) => sum + r.duration, 0) / dayRecords.length
      return {
        date,
        bestValue: bestTime / 1000, // 转换为秒
        averageValue: averageTime / 1000
      }
    } else if (chartType.value === 'errors') {
      // 错误次数：计算当天所有练习的错误次数总和
      const totalErrors = dayRecords.reduce((sum: number, r: BaseGameRecord) => sum + (r.errorCount || 0), 0)
      return {
        date,
        bestValue: totalErrors,
        averageValue: totalErrors
      }
    } else { // count
      // 练习次数：计算当天的练习总数
      const count = dayRecords.length
      return {
        date,
        bestValue: count,
        averageValue: count
      }
    }
  })
})

// 检查是否有图表数据
const hasChartData = computed(() => chartData.value.length > 0)

// 格式化函数
const formatCreatedTime = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

// 关闭模态框
const closeModal = () => {
  emit('update:visible', false)
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return
  
  const data = chartData.value
  const dates = data.map(d => dayjs(d.date).format('MM-DD'))
  const bestValues = data.map(d => d.bestValue)
  const averageValues = data.map(d => d.averageValue)
  
  // 清空图表以确保完全重新渲染
  chartInstance.clear()
  
  // 根据图表类型设置不同的配置
  let yAxisName = ''
  let yAxisFormatter = '{value}'
  let tooltipFormatter = (params: any) => {
    let result = `${params[0].axisValue}<br/>`
    params.forEach((param: any) => {
      if (param.value !== null && param.value !== undefined) {
        if (chartType.value === 'time') {
          result += `${param.seriesName}: ${param.value.toFixed(1)}秒<br/>`
        } else if (chartType.value === 'errors') {
          result += `${param.seriesName}: ${param.value}次<br/>`
        } else {
          result += `${param.seriesName}: ${param.value}次<br/>`
        }
      }
    })
    return result
  }
  
  if (chartType.value === 'time') {
    yAxisName = '时间(秒)'
    yAxisFormatter = '{value}s'
  } else if (chartType.value === 'errors') {
    yAxisName = '错误次数'
    yAxisFormatter = '{value}'
  } else {
    yAxisName = '练习次数'
    yAxisFormatter = '{value}'
  }
  
  // 定义色彩库
  const colorPalette = ['#f09491', '#daf8ae', '#f2d6ba', '#f3b7b8', '#bceae1', '#f5dfb2', '#f3b6c9', '#bebdee']
  
  // 根据图表类型决定系列数据
  let series
  if (chartType.value === 'count') {
    // 练习次数图表只显示一条线（每日练习总数）
    series = [
      {
        name: '每日练习总数',
        type: 'line',
        data: bestValues,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: colorPalette[0],
          width: 3
        },
        itemStyle: {
          color: colorPalette[0],
          borderWidth: 2,
          borderColor: '#fff'
        },
        connectNulls: false
      }
    ]
  } else if (chartType.value === 'errors') {
    // 错误次数图表只显示一条线（每日错误总数）
    series = [
      {
        name: '每日错误总数',
        type: 'line',
        data: bestValues,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: colorPalette[3],
          width: 3
        },
        itemStyle: {
          color: colorPalette[3],
          borderWidth: 2,
          borderColor: '#fff'
        },
        connectNulls: false
      }
    ]
  } else {
    // 时间图表显示两条线
    series = [
      {
        name: '每日最佳',
        type: 'line',
        data: bestValues,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: colorPalette[0],
          width: 2
        },
        itemStyle: {
          color: colorPalette[0]
        },
        connectNulls: false
      },
      {
        name: '每日平均',
        type: 'line',
        data: averageValues,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: colorPalette[3],
          width: 2
        },
        itemStyle: {
          color: colorPalette[3]
        },
        connectNulls: false
      }
    ]
  }
  
  const option = {
    title: {
      text: '训练数据',
      left: 'center',
      top: 15,
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: '#1e293b'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: tooltipFormatter
    },
    legend: {
      data: series.map(s => s.name),
      top: 45,
      textStyle: {
        fontSize: 12
      },
      // 强制重新渲染图例
      show: true
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: '25%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        fontSize: 10,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: {
        fontSize: 10
      },
      axisLabel: {
        fontSize: 10,
        formatter: yAxisFormatter
      }
    },
    series
  }
  
  chartInstance.setOption(option)
}

// 响应式处理
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听数据变化，更新图表
watch([chartData, activeTab, chartType], () => {
  if (props.visible && activeTab.value === 'chart') {
    nextTick(() => {
      if (hasChartData.value) {
        if (!chartInstance && chartRef.value) {
          initChart()
        } else if (chartInstance) {
          updateChart()
        }
      } else {
        // 无数据时销毁图表实例
        if (chartInstance) {
          chartInstance.dispose()
          chartInstance = null
        }
      }
    })
  }
}, { immediate: true })

// 监听可见性变化
watch(() => props.visible, (visible) => {
  if (visible) {
    // 模态框打开时，延迟初始化图表以确保DOM完全渲染
    setTimeout(() => {
      if (props.visible && activeTab.value === 'chart' && hasChartData.value && chartRef.value) {
        // 确保图表正确初始化
        if (!chartInstance) {
          initChart()
        } else {
          updateChart()
          chartInstance.resize()
        }
      }
    }, 150)
  } else {
    // 模态框关闭时，销毁图表实例以释放资源
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
  }
})

// 监听 Tab 切换
watch(activeTab, (newTab, oldTab) => {
  if (props.visible && newTab === 'chart' && oldTab === 'records') {
    // 从详细记录切换到图表分析时，重新初始化图表
    nextTick(() => {
      if (hasChartData.value && chartRef.value) {
        // 先销毁现有图表实例
        if (chartInstance) {
          chartInstance.dispose()
          chartInstance = null
        }
        // 重新初始化
        setTimeout(() => {
          if (chartRef.value && props.visible) {
            initChart()
          }
        }, 100)
      }
    })
  }
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
/* 复用相同的样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.modal-container {
  width: 100%;
  height: 85vh;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1e293b;
}

.size-filter {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);
  background: rgba(255, 255, 255, 0.7);
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
  font-weight: 800;
  color: #64748b;
}

.stats-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}

.tab-container {
  display: flex;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(226, 232, 240, 0.4);
}

.tab-item {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  border-bottom: 3px solid transparent;
}

.tab-item.active {
  color: #f09491;
  border-bottom-color: #f09491;
  background: rgba(240, 148, 145, 0.05);
}

.tab-item:hover:not(.active) {
  color: #f09491;
  background: rgba(240, 148, 145, 0.02);
}

.content-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}

.chart-options {
  margin-bottom: 20px;
}

.chart-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart {
  flex: 1;
  min-height: 300px;
  width: 100%;
}

.empty-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.empty-chart .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-chart .empty-text {
  font-size: 16px;
  font-weight: 500;
}

.records-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  position: relative;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.record-item:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.record-item.best-record {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 0.9) 100%);
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
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.record-time {
  font-size: 12px;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.record-right {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.record-duration {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
  font-variant-numeric: tabular-nums;
}

.record-errors {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.best-badge {
  position: absolute;
  top: -6px;
  right: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

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
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  transform: translateY(100%);
}
</style>
