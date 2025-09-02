// 移动端优化工具
// 让网页体验尽可能像原生app

// 防止页面缩放
export function preventZoom(): void {
  // 添加触摸事件监听器防止双指缩放
  let initialDistance = 0;
  let initialScale = 1;

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialScale = 1;
    }
  });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
    }
  });

  document.addEventListener('touchend', () => {
    initialDistance = 0;
    initialScale = 1;
  });
}

// 防止文字选中
export function preventTextSelection(): void {
  // 添加CSS样式
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
    }
    
    /* 允许输入框选中 */
    input, textarea {
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    
    /* 防止长按菜单 */
    * {
      -webkit-touch-callout: none;
    }
    
    /* 优化触摸反馈 */
    button, .cell-card, .grid-item {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    
    /* 防止滚动回弹 */
    html, body {
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }
    
    /* 优化字体渲染 */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
  `;
  document.head.appendChild(style);
}

// 设置移动端视口
export function setMobileViewport(): void {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }
}

// 添加移动端触摸优化
export function addTouchOptimization(): void {
  // 防止双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // 防止滚动时的选择
  document.addEventListener('scroll', () => {
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  });
}

// 设置状态栏样式（针对鸿蒙app）
export function setStatusBarStyle(): void {
  // 检测是否在鸿蒙app中
  if (window.SchulteApp && window.SchulteApp.setStatusBarStyle) {
    try {
      // 设置状态栏为深色模式
      window.SchulteApp.setStatusBarStyle('dark');
    } catch (error) {
      console.log('设置状态栏样式失败:', error);
    }
  }
}

// 初始化所有移动端优化
export function initMobileOptimization(): void {
  preventZoom();
  preventTextSelection();
  setMobileViewport();
  addTouchOptimization();
  setStatusBarStyle();
  
  console.log('✅ 移动端优化已启用');
}

// 添加全屏支持
export function requestFullscreen(): void {
  try {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
      (document.documentElement as any).msRequestFullscreen();
    }
  } catch (error) {
    console.log('请求全屏失败:', error);
  }
}

// 隐藏地址栏（移动端）
export function hideAddressBar(): void {
  // 在移动端隐藏地址栏
  if (window.innerHeight < window.outerHeight) {
    window.scrollTo(0, 1);
  }
}
