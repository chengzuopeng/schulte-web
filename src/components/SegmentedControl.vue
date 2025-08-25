<template>
  <div class="segmented-control">
    <div 
      v-for="(item, index) in values" 
      :key="index"
      :class="['segment-item', { active: index === current }]"
      @click="$emit('clickItem', { currentIndex: index })"
    >
      {{ item }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  values: string[]
  current: number
  activeColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  current: 0,
  activeColor: '#007aff'
})

defineEmits<{
  clickItem: [{ currentIndex: number }]
}>()
</script>

<style scoped>
.segmented-control {
  display: flex;
  background-color: #fff;
  border-radius: 12px;
  padding: 3px;
  margin: 4px 0;
  border: 1px solid #e9ecef;
}

.segment-item {
  flex: 1;
  text-align: center;
  padding: 10px 8px;
  border-radius: 8px;
  font-size: 13px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.segment-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.segment-item.active {
  background-color: v-bind(activeColor);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .segment-item {
    font-size: 12px;
    padding: 8px 6px;
    min-height: 32px;
  }
}
</style>
