// Service Worker for Schulte Web App
// 实现离线缓存，提升app中第二次打开速度

const CACHE_NAME = 'schulte-web-v1.0.0';
const STATIC_CACHE = 'schulte-static-v1.0.0';
const AUDIO_CACHE = 'schulte-audio-v1.0.0';

// 需要缓存的静态资源（只缓存实际存在的资源）
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// 需要缓存的音频文件
const AUDIO_ASSETS = [
  '/audio/button1.mp3',
  '/audio/button2.mp3',
  '/audio/button3.mp3',
  '/audio/button4.mp3',
  '/audio/button5.mp3',
  '/audio/button6.mp3',
  '/audio/error1.mp3',
  '/audio/error2.mp3',
  '/audio/error3.mp3',
  '/audio/error4.mp3',
  '/audio/error5.mp3',
  '/audio/error6.mp3'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  console.log('🎯 Service Worker 安装中...');
  
  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 缓存静态资源...');
        // 使用addAllSettled避免单个资源失败影响整体
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url))
        ).then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;
          console.log(`✅ 静态资源缓存完成: ${successCount}成功, ${failCount}失败`);
        });
      }),
      // 缓存音频文件
      caches.open(AUDIO_CACHE).then((cache) => {
        console.log('🎵 缓存音频文件...');
        // 使用addAllSettled避免单个音频文件失败影响整体
        return Promise.allSettled(
          AUDIO_ASSETS.map(url => cache.add(url))
        ).then(results => {
          const successCount = results.filter(r => r.status === 'fulfilled').length;
          const failCount = results.filter(r => r.status === 'rejected').length;
          console.log(`✅ 音频文件缓存完成: ${successCount}成功, ${failCount}失败`);
        });
      })
    ]).then(() => {
      console.log('✅ Service Worker 安装完成');
      // 立即激活
      return self.skipWaiting();
    }).catch(error => {
      console.error('❌ Service Worker 安装失败:', error);
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker 激活中...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本的缓存
          if (cacheName !== STATIC_CACHE && 
              cacheName !== AUDIO_CACHE && 
              cacheName.startsWith('schulte-')) {
            console.log('🗑️ 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker 激活完成');
      // 立即控制所有页面
      return self.clients.claim();
    })
  );
});

// 拦截请求 - 实现缓存优先策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }
  
  // 处理音频文件请求
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            // 返回缓存，同时后台更新缓存
            fetch(request).then((freshResponse) => {
              if (freshResponse.ok) {
                cache.put(request, freshResponse);
              }
            }).catch(() => {
              // 网络请求失败时忽略，继续使用缓存
            });
            return response;
          }
          // 缓存未命中，从网络获取
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }
  
  // 处理静态资源请求
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            // 返回缓存
            return response;
          }
          // 缓存未命中，从网络获取
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }
  
  // 其他请求使用网络优先策略
  event.respondWith(
    fetch(request).catch(() => {
      // 网络失败时尝试从缓存获取
      return caches.match(request);
    })
  );
});

// 消息处理 - 与主线程通信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    // 返回缓存状态
    caches.keys().then((cacheNames) => {
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        caches: cacheNames,
        staticAssets: STATIC_ASSETS.length,
        audioAssets: AUDIO_ASSETS.length
      });
    });
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker 错误:', event.error);
});

// 未处理的Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker Promise 拒绝:', event.reason);
});
