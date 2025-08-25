<template>
  <transition :name="transitionName" appear>
    <div v-if="show" class="transition-content">
      <slot></slot>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show?: boolean
  modeClass?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  modeClass: () => ['fade']
})

const transitionName = computed(() => {
  return props.modeClass[0] || 'fade'
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.transition-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
