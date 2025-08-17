import { logger } from '../utils/logger.js';
import { withWeatherRetry } from '../utils/retryWithBackoff.js';
import { getCurrentRequestId } from '../middleware/requestId.js';

/**
 * 統合気象サービス
 * 気象庁アメダスデータを取得し、WBGT値を計算
 */
class WeatherServiceUnified {
  constructor() {
    // キャッシュ設定
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分
    this.cacheExpiryMs = 5 * 60 * 1000;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    // 気象庁エンドポイント
    this.latestTimeUrl = 'https://www.jma.go.jp/bosai/amedas/data/latest_time.txt';
    this.stationUrl = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
  }

  /**
   * 最新の気象データを取得（東京）
   */
  async getTokyoWeather() {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    const cacheKey = 'tokyo_weather';
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.cacheHits++;
        logger.info('Using cached weather data', {
          duration_ms: Date.now() - startTime,
          provider: 'weather_jma',
          status: 'cache_hit',
          requestId
        });
        return cached.data;
      }
    }
    
    this.cacheMisses++;
    
    try {
      // Exponential backoffでリトライ
      const weatherData = await withWeatherRetry(async () => {
        // 最新時刻を取得
        const timeResponse = await fetch(this.latestTimeUrl);
        const latestTimeStr = await timeResponse.text();
        const latestTime = new Date(latestTimeStr.trim());
        
        // フォーマット: YYYYMMDD_HH
        const year = latestTime.getFullYear();
        const month = String(latestTime.getMonth() + 1).padStart(2, '0');
        const day = String(latestTime.getDate()).padStart(2, '0');
        const hour = String(latestTime.getHours()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const hourStr = hour;
        
        // 東京（44132）のデータを取得
        const dataUrl = `https://www.jma.go.jp/bosai/amedas/data/point/44132/${dateStr}_${hourStr}.json`;
        const dataResponse = await fetch(dataUrl);
        
        if (!dataResponse.ok) {
          throw new Error(`Weather API returned ${dataResponse.status}`);
        }
        
        const data = await dataResponse.json();
        
        // 最新のデータポイントを取得
        const times = Object.keys(data).sort();
        const latestData = data[times[times.length - 1]];
        
        if (!latestData || !latestData.temp || !latestData.humidity) {
          throw new Error('Incomplete weather data received');
        }
        
        return {
          temperature: latestData.temp[0],
          humidity: latestData.humidity[0],
          pressure: latestData.pressure?.[0],
          precipitation: latestData.precipitation10m?.[0] || 0,
          windSpeed: latestData.windSpeed?.[0],
          windDirection: latestData.windDirection?.[0],
          time: times[times.length - 1],
          stationId: '44132',
          stationName: '東京'
        };
      });
      
      // WBGT値を計算
      const wbgt = this.calculateWBGT(weatherData.temperature, weatherData.humidity);
      const level = this.getAlertLevel(wbgt);
      
      const result = {
        ...weatherData,
        wbgt,
        level
      };
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      const duration_ms = Date.now() - startTime;
      
      logger.info('Weather data fetched', {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        wbgt,
        level,
        duration_ms,
        provider: 'weather_jma',
        status: 'success',
        requestId
      });
      
      return result;
      
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to fetch weather data', {
        error: error.message,
        duration_ms,
        provider: 'weather_jma',
        status: 'failed',
        requestId
      });
      
      // フォールバック値を返す
      return {
        temperature: 28,
        humidity: 65,
        wbgt: 27,
        level: '警戒',
        error: 'Using fallback values',
        time: new Date().toISOString()
      };
    }
  }

  /**
   * グリッドコードから気象データを取得
   * @param {string} gridCode - グリッドコード（例: '5339-24-XXXX'）
   */
  async getWeatherByGrid(gridCode) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    const cacheKey = `grid_${gridCode}`;
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        this.cacheHits++;
        logger.info('Using cached grid weather', {
          gridCode,
          duration_ms: Date.now() - startTime,
          status: 'cache_hit',
          requestId
        });
        return cached.data;
      }
    }
    
    this.cacheMisses++;
    
    // グリッドコードから観測所を推定（簡易実装）
    // 実際はグリッドコードと観測所のマッピングテーブルが必要
    const stationMap = {
      '5339': '44132', // 東京
      '5235': '47662', // 大阪
      '5237': '47636', // 名古屋
      // 他のマッピングを追加
    };
    
    const gridPrefix = gridCode.substring(0, 4);
    const stationId = stationMap[gridPrefix] || '44132'; // デフォルトは東京
    
    try {
      const weatherData = await this.getStationWeather(stationId);
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });
      
      const duration_ms = Date.now() - startTime;
      
      logger.info('Grid weather data fetched', {
        gridCode,
        stationId,
        wbgt: weatherData.wbgt,
        duration_ms,
        status: 'success',
        requestId
      });
      
      return weatherData;
      
    } catch (error) {
      logger.error('Failed to fetch grid weather', {
        gridCode,
        error: error.message,
        requestId
      });
      
      // 東京のデータをフォールバックとして使用
      return this.getTokyoWeather();
    }
  }

  /**
   * 特定の観測所のデータを取得
   */
  async getStationWeather(stationId) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    try {
      const weatherData = await withWeatherRetry(async () => {
        // 最新時刻を取得
        const timeResponse = await fetch(this.latestTimeUrl);
        const latestTimeStr = await timeResponse.text();
        const latestTime = new Date(latestTimeStr.trim());
        
        // フォーマット: YYYYMMDD_HH
        const year = latestTime.getFullYear();
        const month = String(latestTime.getMonth() + 1).padStart(2, '0');
        const day = String(latestTime.getDate()).padStart(2, '0');
        const hour = String(latestTime.getHours()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const hourStr = hour;
        
        // 指定観測所のデータを取得
        const dataUrl = `https://www.jma.go.jp/bosai/amedas/data/point/${stationId}/${dateStr}_${hourStr}.json`;
        const dataResponse = await fetch(dataUrl);
        
        if (!dataResponse.ok) {
          throw new Error(`Weather API returned ${dataResponse.status} for station ${stationId}`);
        }
        
        const data = await dataResponse.json();
        
        // 最新のデータポイントを取得
        const times = Object.keys(data).sort();
        const latestData = data[times[times.length - 1]];
        
        if (!latestData || !latestData.temp || !latestData.humidity) {
          throw new Error('Incomplete weather data received');
        }
        
        return {
          temperature: latestData.temp[0],
          humidity: latestData.humidity[0],
          pressure: latestData.pressure?.[0],
          precipitation: latestData.precipitation10m?.[0] || 0,
          windSpeed: latestData.windSpeed?.[0],
          windDirection: latestData.windDirection?.[0],
          time: times[times.length - 1],
          stationId
        };
      });
      
      // WBGT値を計算
      const wbgt = this.calculateWBGT(weatherData.temperature, weatherData.humidity);
      const level = this.getAlertLevel(wbgt);
      
      const duration_ms = Date.now() - startTime;
      
      logger.info('Station weather fetched', {
        stationId,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        wbgt,
        duration_ms,
        requestId
      });
      
      return {
        ...weatherData,
        wbgt,
        level
      };
      
    } catch (error) {
      logger.error('Failed to fetch station weather', {
        stationId,
        error: error.message,
        requestId
      });
      throw error;
    }
  }

  /**
   * アメダス観測所一覧を取得
   */
  async getStations() {
    const cacheKey = 'stations';
    
    // キャッシュチェック（観測所リストは24時間キャッシュ）
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.data;
      }
    }
    
    try {
      const response = await fetch(this.stationUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const stations = await response.json();
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: stations,
        timestamp: Date.now()
      });
      
      logger.info('Fetched AMeDAS stations', { count: Object.keys(stations).length });
      return stations;
    } catch (error) {
      logger.error('Failed to fetch stations', { error: error.message });
      throw error;
    }
  }

  /**
   * 最寄りの観測所を検索
   * @param {number} lat - 緯度
   * @param {number} lon - 経度
   */
  async findNearestStation(lat, lon) {
    const stations = await this.getStations();
    let nearest = null;
    let minDistance = Infinity;

    for (const [id, station] of Object.entries(stations)) {
      // 緯度経度は配列形式 [lat, lon]
      const stationLat = station.lat[0];
      const stationLon = station.lon[0];
      const distance = this.calculateDistance(lat, lon, stationLat, stationLon);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          id,
          name: station.kjName,
          distance: Math.round(distance * 10) / 10,
          lat: stationLat,
          lon: stationLon,
          type: station.type
        };
      }
    }

    logger.info('Found nearest station', {
      station: nearest.name,
      distance: nearest.distance,
      lat,
      lon
    });

    return nearest;
  }

  /**
   * 2点間の距離を計算（ハバーサイン公式）
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径（km）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * WBGT値を計算（簡易式）
   * @param {number} temp - 気温（℃）
   * @param {number} humidity - 湿度（%）
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
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, data] of this.cache.entries()) {
      totalSize++;
      if (data.timestamp && (now - data.timestamp) > this.cacheTimeout) {
        expiredCount++;
      }
    }

    return {
      size: totalSize,
      expired: expiredCount,
      maxSize: 100,
      ttl: this.cacheExpiryMs,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.cacheHits && this.cacheMisses 
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('Weather cache cleared', { entriesCleared: size });
  }
}

export const weatherService = new WeatherServiceUnified();
export const weatherServiceFixed = weatherService; // 互換性のため
export const weatherServiceUnified = weatherService;