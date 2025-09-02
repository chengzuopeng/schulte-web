// 音频缓存管理器
// 预加载所有音频文件，避免重复请求
// 支持Service Worker缓存，提升app中第二次打开速度

interface AudioCache {
  [key: string]: HTMLAudioElement;
}

class AudioManager {
  private audioCache: AudioCache = {};
  private isInitialized = false;
  private audioTypes = [1, 2, 3, 4, 5, 6];
  private audioTypesMap = {
    button: 'button',
    error: 'error',
    success: 'button', // 成功音效使用button音效
    warning: 'error'   // 警告音效使用error音效
  };

  // 初始化音频缓存
  async init(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎵 开始预加载音频文件...');
    
    const loadPromises: Promise<void>[] = [];
    
    // 预加载所有音频文件
    for (const audioType of this.audioTypes) {
      // 加载按钮音效
      loadPromises.push(this.loadAudio(`button${audioType}`, `/audio/button${audioType}.mp3`));
      // 加载错误音效
      loadPromises.push(this.loadAudio(`error${audioType}`, `/audio/error${audioType}.mp3`));
    }

    try {
      await Promise.all(loadPromises);
      this.isInitialized = true;
      console.log('✅ 音频文件预加载完成');
    } catch (error) {
      console.error('❌ 音频文件预加载失败:', error);
    }
  }

  // 加载单个音频文件
  private async loadAudio(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      // 设置音频属性
      audio.preload = 'auto';
      audio.playbackRate = 2;
      audio.volume = 0.8;
      
      // 监听加载完成事件
      audio.addEventListener('canplaythrough', () => {
        // 缓存音频对象
        this.audioCache[key] = audio;
        resolve();
      });

      // 监听加载错误事件
      audio.addEventListener('error', (e) => {
        console.error(`音频加载失败: ${path}`, e);
        reject(new Error(`音频加载失败: ${path}`));
      });

      // 开始加载
      audio.src = path;
      audio.load();
    });
  }

  // 播放音频
  play(type: 'success' | 'warning' | 'button' | 'error', audioType: number): void {
    if (!this.isInitialized) {
      console.warn('音频管理器未初始化，使用备用方案');
      this.playFallback(type, audioType);
      return;
    }

    const audioKey = `${this.audioTypesMap[type]}${audioType}`;
    const audio = this.audioCache[audioKey];

    if (audio) {
      try {
        // 重置音频到开始位置
        audio.currentTime = 0;
        // 播放音频
        audio.play().catch(error => {
          console.error('音频播放失败:', audioKey, error);
          this.playFallback(type, audioType);
        });
      } catch (error) {
        console.error('音频播放异常:', audioKey, error);
        this.playFallback(type, audioType);
      }
    } else {
      console.warn(`音频文件未找到: ${audioKey}`);
      this.playFallback(type, audioType);
    }
  }

  // 备用播放方案（直接创建Audio对象）
  private playFallback(type: 'success' | 'warning' | 'button' | 'error', audioType: number): void {
    let fileName = '';
    
    switch (type) {
      case 'button':
      case 'success':
        fileName = `button${audioType}.mp3`;
        break;
      case 'error':
      case 'warning':
        fileName = `error${audioType}.mp3`;
        break;
      default:
        fileName = `button${audioType}.mp3`;
    }
    
    const audioPath = `/audio/${fileName}`;
    const audio = new Audio(audioPath);
    audio.playbackRate = 2;
    audio.volume = 0.8;
    
    audio.play().catch(error => {
      console.error('备用音频播放失败:', audioPath, error);
    });
  }

  // 检查是否已初始化
  isReady(): boolean {
    return this.isInitialized;
  }

  // 获取缓存状态
  getCacheStatus(): { total: number; loaded: number; ready: boolean } {
    const total = this.audioTypes.length * 2; // button + error
    const loaded = Object.keys(this.audioCache).length;
    
    return {
      total,
      loaded,
      ready: this.isInitialized
    };
  }

  // 清理缓存
  clearCache(): void {
    Object.values(this.audioCache).forEach(audio => {
      audio.src = '';
      audio.load();
    });
    this.audioCache = {};
    this.isInitialized = false;
  }

  // 预加载特定音频文件（用于动态加载）
  async preloadSpecificAudio(type: string, audioType: number): Promise<void> {
    const key = `${type}${audioType}`;
    const path = `/audio/${type}${audioType}.mp3`;
    
    if (!this.audioCache[key]) {
      try {
        await this.loadAudio(key, path);
        console.log(`✅ 预加载音频完成: ${key}`);
      } catch (error) {
        console.error(`❌ 预加载音频失败: ${key}`, error);
      }
    }
  }

  // 获取音频文件大小信息（用于监控缓存效果）
  async getAudioFileInfo(): Promise<{ [key: string]: number }> {
    const fileInfo: { [key: string]: number } = {};
    
    for (const audioType of this.audioTypes) {
      try {
        const buttonResponse = await fetch(`/audio/button${audioType}.mp3`);
        const errorResponse = await fetch(`/audio/error${audioType}.mp3`);
        
        fileInfo[`button${audioType}`] = parseInt(buttonResponse.headers.get('content-length') || '0');
        fileInfo[`error${audioType}`] = parseInt(errorResponse.headers.get('content-length') || '0');
      } catch (error) {
        console.error(`获取音频文件信息失败: ${audioType}`, error);
      }
    }
    
    return fileInfo;
  }
}

// 创建全局音频管理器实例
export const audioManager = new AudioManager();
