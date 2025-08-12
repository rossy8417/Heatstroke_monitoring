import { logger } from '../utils/logger.js';

/**
 * 気象庁アメダスデータ取得サービス
 * 非公式JSONエンドポイントを使用
 */
class WeatherService {
  constructor() {
    // 気象庁の非公式JSONエンドポイント
    this.baseUrl = 'https://www.jma.go.jp/bosai/amedas/data/point';
    this.areaUrl = 'https://www.jma.go.jp/bosai/common/const/area.json';
    this.stationUrl = 'https://www.jma.go.jp/bosai/amedas/const/amedastable.json';
    
    // キャッシュ（5分間有効）
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分
  }

  /**
   * アメダス観測所一覧を取得
   */
  async getStations() {
    try {
      const response = await fetch(this.stationUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const stations = await response.json();
      
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
      const [stationLat, stationLon] = station.lat;
      const distance = this.calculateDistance(lat, lon, stationLat, stationLon);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { id, ...station, distance };
      }
    }

    logger.info('Found nearest station', { 
      stationId: nearest?.id, 
      name: nearest?.kjName,
      distance: nearest?.distance 
    });
    
    return nearest;
  }

  /**
   * 特定観測所の最新データを取得
   * @param {string} stationId - 観測所ID（5桁）
   */
  async getLatestData(stationId) {
    // キャッシュチェック
    const cached = this.cache.get(stationId);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('Using cached weather data', { stationId });
      return cached.data;
    }

    try {
      // 現在時刻から最新データのURLを生成
      const now = new Date();
      const dateStr = this.formatDate(now);
      const url = `${this.baseUrl}/${stationId}/${dateStr}.json`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // 最新のデータポイントを取得
      const latestTime = Object.keys(data).sort().pop();
      const latestData = data[latestTime];
      
      // キャッシュに保存
      this.cache.set(stationId, {
        data: { time: latestTime, ...latestData },
        timestamp: Date.now()
      });
      
      logger.info('Fetched latest weather data', { 
        stationId, 
        time: latestTime,
        temp: latestData?.temp?.[0],
        humidity: latestData?.humidity?.[0]
      });
      
      return { time: latestTime, ...latestData };
    } catch (error) {
      logger.error('Failed to fetch weather data', { stationId, error: error.message });
      throw error;
    }
  }

  /**
   * WBGTを計算
   * @param {number} temp - 気温（℃）
   * @param {number} humidity - 相対湿度（%）
   */
  calculateWBGT(temp, humidity) {
    // 簡易WBGT計算式（屋外の場合）
    // WBGT = 0.735 × Ta + 0.0374 × RH + 0.00292 × Ta × RH + 7.619 × SR - 4.557 × SR² - 0.0572 × WS - 4.064
    // 簡略化版（日射量・風速を標準値と仮定）
    const wbgt = 0.735 * temp + 0.0374 * humidity + 0.00292 * temp * humidity - 2.5;
    
    return Math.round(wbgt * 10) / 10;
  }

  /**
   * WBGT値から警戒レベルを判定
   * @param {number} wbgt - WBGT値
   */
  getAlertLevel(wbgt) {
    if (wbgt < 21) return '注意';
    if (wbgt < 25) return '注意';
    if (wbgt < 28) return '警戒';
    if (wbgt < 31) return '厳重警戒';
    return '危険';
  }

  /**
   * 地域メッシュコードから気象データとWBGTを取得
   * @param {string} meshCode - 地域メッシュコード
   */
  async getWeatherByMesh(meshCode) {
    try {
      // メッシュコードから緯度経度を計算（簡略化）
      // 実際には適切な変換が必要
      const { lat, lon } = this.meshToLatLon(meshCode);
      
      // 最寄りの観測所を検索
      const station = await this.findNearestStation(lat, lon);
      if (!station) throw new Error('No station found');
      
      // 最新データを取得
      const data = await this.getLatestData(station.id);
      
      // 気温と湿度を取得
      const temp = data.temp?.[0];
      const humidity = data.humidity?.[0];
      
      if (temp === undefined || humidity === undefined) {
        throw new Error('Temperature or humidity data not available');
      }
      
      // WBGT計算
      const wbgt = this.calculateWBGT(temp, humidity);
      const level = this.getAlertLevel(wbgt);
      
      return {
        meshCode,
        stationId: station.id,
        stationName: station.kjName,
        distance: station.distance,
        time: data.time,
        temp,
        humidity,
        wbgt,
        level,
        precipitation: data.precipitation1h?.[0] || 0,
        wind: data.wind?.[0] || 0
      };
    } catch (error) {
      logger.error('Failed to get weather by mesh', { meshCode, error: error.message });
      
      // フォールバック値を返す
      return {
        meshCode,
        wbgt: 28, // デフォルト警戒値
        level: '警戒',
        error: error.message
      };
    }
  }

  /**
   * 2点間の距離を計算（km）
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
    return deg * (Math.PI/180);
  }

  /**
   * 日付を気象庁API用フォーマットに変換
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * メッシュコードから緯度経度への簡易変換
   * 実際のプロジェクトでは正確な変換ライブラリを使用してください
   */
  meshToLatLon(meshCode) {
    // 仮の実装（東京付近のデフォルト値）
    // 実際には地域メッシュコードの仕様に従った変換が必要
    const defaults = {
      '5339-24': { lat: 35.6762, lon: 139.6503 }, // 東京
      '5339-25': { lat: 35.6895, lon: 139.6917 }, // 新宿
      '5339-23': { lat: 35.6584, lon: 139.7454 }, // 港区
    };
    
    if (defaults[meshCode]) {
      return defaults[meshCode];
    }
    
    // デフォルト（東京駅）
    return { lat: 35.6812, lon: 139.7671 };
  }
}

export const weatherService = new WeatherService();