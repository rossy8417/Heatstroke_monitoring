import { logger } from '../utils/logger.js';

/**
 * 気象庁アメダスデータ取得サービス（修正版）
 * 正しいエンドポイントを使用
 */
class WeatherServiceFixed {
  constructor() {
    // キャッシュ（5分間有効）
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分
    this.cacheExpiryMs = 5 * 60 * 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 最新の気象データを取得（東京）
   */
  async getTokyoWeather() {
    const startTime = Date.now();
    const cacheKey = 'tokyo_weather';
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.cacheHits++;
        logger.info('Using cached weather data', {
          duration_ms: Date.now() - startTime,
          provider: 'weather_jma',
          status: 'cache_hit'
        });
        return cached.data;
      }
    }
    
    this.cacheMisses++;
    
    try {
      // 最新時刻を取得
      const timeResponse = await fetch('https://www.jma.go.jp/bosai/amedas/data/latest_time.txt');
      const latestTimeStr = await timeResponse.text();
      const latestTime = new Date(latestTimeStr.trim());
      
      // YYYYMMDDHHMMSS形式に変換
      const dateStr = latestTime.getFullYear() +
        String(latestTime.getMonth() + 1).padStart(2, '0') +
        String(latestTime.getDate()).padStart(2, '0') +
        String(latestTime.getHours()).padStart(2, '0') +
        String(latestTime.getMinutes()).padStart(2, '0') +
        '00';
      
      // マップデータから観測データを取得
      const url = `https://www.jma.go.jp/bosai/amedas/data/map/${dateStr}.json`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const tokyoData = data['44132']; // 東京の観測所ID
      
      if (!tokyoData) {
        throw new Error('No data for Tokyo station');
      }
      
      const temp = tokyoData.temp?.[0];
      const humidity = tokyoData.humidity?.[0];
      
      // WBGT計算
      const wbgt = this.calculateWBGT(temp, humidity);
      const level = this.getAlertLevel(wbgt);
      
      const result = {
        temp,
        humidity,
        wbgt,
        level,
        stationName: '東京',
        observedAt: latestTimeStr.trim()
      };
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: result
      });
      
      const duration_ms = Date.now() - startTime;
      logger.info('Fetched real weather data from JMA', {
        ...result,
        duration_ms,
        provider: 'weather_jma',
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      logger.error('Failed to fetch weather data', {
        error: error.message,
        duration_ms,
        provider: 'weather_jma',
        status: 'failed'
      });
      throw error;
    }
  }

  /**
   * メッシュコードから気象データを取得
   */
  async getWeatherByMesh(meshCode) {
    try {
      // 現在は東京のデータを返す
      return await this.getTokyoWeather();
    } catch (error) {
      logger.error('Failed to get weather by mesh', { meshCode, error: error.message });
      
      // フォールバック値を返す
      const hour = new Date().getHours();
      let temp = 28, humidity = 65;
      
      if (hour >= 10 && hour < 16) {
        temp = 32;
        humidity = 60;
      }
      
      const wbgt = this.calculateWBGT(temp, humidity);
      
      return {
        temp,
        humidity,
        wbgt,
        level: this.getAlertLevel(wbgt),
        stationName: 'モックデータ',
        observedAt: new Date().toISOString()
      };
    }
  }

  /**
   * WBGTを計算
   */
  calculateWBGT(temp, humidity) {
    // 簡易WBGT計算式
    const wbgt = 0.735 * temp + 0.0374 * humidity + 0.00292 * temp * humidity - 2.5;
    return Math.round(wbgt * 10) / 10;
  }

  /**
   * WBGT値から警戒レベルを判定
   */
  getAlertLevel(wbgt) {
    if (wbgt < 21) return 'ほぼ安全';
    if (wbgt < 25) return '注意';
    if (wbgt < 28) return '警戒';
    if (wbgt < 31) return '厳重警戒';
    return '危険';
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    let hits = 0;
    let misses = 0;
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, data] of this.cache.entries()) {
      totalSize++;
      if (data.expiresAt < now) {
        expiredCount++;
      }
    }

    return {
      size: totalSize,
      expired: expiredCount,
      maxSize: 100,
      ttl: this.cacheExpiryMs,
      hits: this.cacheHits || 0,
      misses: this.cacheMisses || 0,
      hitRate: this.cacheHits && this.cacheMisses 
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
}

export const weatherServiceFixed = new WeatherServiceFixed();