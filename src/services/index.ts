import { appManager } from '@/utils/app-bridge'

// 环境判断
const isDev = import.meta.env.DEV;

const base = isDev 
  ? '/api'
  : 'https://schulte.kiteblog.cn/api'

const services = {
  sendResult: async (data: any) => {
    // 获取用户ID
    const userId = appManager.getUserId();
    
    const requestData = {
      ...data,
      userId: userId || '',
      deviceId: '',
    };

    const res = await fetch(`${base}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    return await res.json();
  },

  // 获取用户记录：历史最佳 + 当天最佳
  getRecord: async (userIdParam?: string) => {
    try {
      const uid = userIdParam || appManager.getUserId() || ''
      if (!uid) {
        return { success: false, data: { historyBest: [], todayBest: [] } }
      }
      const res = await fetch(`${base}/record?userId=${encodeURIComponent(uid)}`)
      const json = await res.json()
      return json
    } catch (e) {
      return { success: false, data: { historyBest: [], todayBest: [] } }
    }
  }
}

export default services
