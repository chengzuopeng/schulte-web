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

    console.log('发送游戏结果:', requestData);

    const res = await fetch(`${base}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    return await res.json();
  }
}

export default services
