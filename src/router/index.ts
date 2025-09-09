import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import Schulte from '@/pages/schulte/index.vue'
import Color from '@/pages/color/index.vue'
import Memory from '@/pages/memory/index.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    // { path: '/', redirect: '/schulte' },
    { path: '/', name: 'schulte', component: Schulte },
    { path: '/color', name: 'color', component: Color },
    { path: '/memory', name: 'memory', component: Memory },
  ],
})

export default router
