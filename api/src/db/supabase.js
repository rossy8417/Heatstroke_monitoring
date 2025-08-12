import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// 公開クライアント（Row Level Securityあり）
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// サービスクライアント（管理者権限、RLSバイパス）
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// 接続チェック
export async function checkConnection() {
  if (!supabase) {
    logger.warn('Supabase not configured - using in-memory storage');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    logger.info('Supabase connection successful');
    return true;
  } catch (error) {
    logger.error('Supabase connection failed', { error: error.message });
    return false;
  }
}

// データベース初期化（スキーマ作成）
export async function initializeDatabase() {
  if (!supabaseAdmin) {
    logger.warn('Supabase admin client not configured');
    return false;
  }

  try {
    // スキーマが既に存在するかチェック
    const { data: tables } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(1);

    if (tables) {
      logger.info('Database schema already initialized');
      return true;
    }
  } catch (error) {
    logger.info('Initializing database schema...');
    // スキーマがまだ存在しない場合は、Supabaseダッシュボードから
    // schema.sqlを実行する必要があります
    logger.warn('Please run schema.sql in Supabase SQL Editor');
    return false;
  }
}

// エラーハンドリングヘルパー
export function handleSupabaseError(error, defaultMessage = 'Database operation failed') {
  if (!error) return null;
  
  logger.error('Supabase error', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  
  return {
    error: true,
    message: error.message || defaultMessage,
    code: error.code
  };
}