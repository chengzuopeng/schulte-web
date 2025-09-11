<template>
  <div class="medal-entrance" @click="goToMedalPage">
    <div class="medal-entrance-container">
      <div class="medal-entrance-left">
        <div class="recent-medals">
          <div 
            v-for="medal in recentMedals" 
            :key="medal.id" 
            class="recent-medal-icon"
            :title="medal.name"
          >
            {{ medal.icon }}
          </div>
          <div v-if="recentMedals.length === 0" class="no-medals">
            🏆
          </div>
        </div>
      </div>
      <div class="medal-entrance-center">
        <div class="medal-entrance-title">查看我的奖章收藏</div>
        <div class="medal-entrance-subtitle">发现更多成就</div>
      </div>
      <div class="medal-entrance-right">
        <div class="medal-progress">{{ medalStats.unlocked }}/{{ medalStats.total }}</div>
        <div class="medal-arrow">›</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { medalManager } from '@/utils/medal-manager'

interface Props {
  // 可以传入游戏类型来自定义行为，目前所有游戏都跳转到同一个奖章页面
  gameType?: string
}

const props = withDefaults(defineProps<Props>(), {
  gameType: 'schulte'
})

const router = useRouter()
const isClickCooldown = ref(false)

// 组件挂载时启动500ms点击冷却
onMounted(() => {
  isClickCooldown.value = true
  setTimeout(() => {
    isClickCooldown.value = false
  }, 500)
})

// 奖章统计数据
const medalStats = computed(() => {
  try {
    return medalManager.getMedalStats()
  } catch (error) {
    console.warn('获取奖章统计失败:', error)
    return { total: 0, unlocked: 0, byRarity: {}, byCategory: {} }
  }
})

// 最近解锁的奖章（最多显示3个）
const recentMedals = computed(() => {
  try {
    const allMedals = medalManager.getAllUserMedals()
    return allMedals
      .filter(medal => medal.unlocked && medal.unlockedAt)
      .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))
      .slice(0, 3)
      .map(medal => ({ 
        id: medal.id, 
        name: medal.name, 
        icon: medal.icon 
      }))
  } catch (error) {
    console.warn('获取最近奖章失败:', error)
    return []
  }
})

// 跳转到奖章页面
const goToMedalPage = () => {
  // 检查是否在点击冷却期间
  if (isClickCooldown.value) {
    console.log('奖章组件点击冷却中，忽略点击')
    return
  }
  
  // 检查是否在App WebView中，如果是则使用JSBridge跳转
  if (window.SchulteApp && typeof window.SchulteApp.navigateToPage === 'function') {
    try {
      const success = window.SchulteApp.navigateToPage('medal')
      if (success) {
        console.log('使用JSBridge跳转到奖章页面成功')
        return
      } else {
        console.warn('JSBridge跳转失败，使用Web路由')
      }
    } catch (error) {
      console.error('JSBridge调用异常:', error)
    }
  }
  
  // 降级到Web路由跳转
  router.push('/medal')
}
</script>

<style scoped>
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
</style>
