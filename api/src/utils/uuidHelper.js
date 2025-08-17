/**
 * UUID関連のヘルパー関数
 */

/**
 * 文字列がUUID形式かどうかを検証
 */
export function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * IDをUUID形式に正規化
 * - すでにUUID形式の場合はそのまま返す
 * - UUID形式でない場合はnullを返す（安全のため）
 */
export function normalizeUUID(id) {
  if (!id) return null;
  
  // 文字列に変換
  const idStr = String(id).toLowerCase().trim();
  
  // UUID形式の検証
  if (isValidUUID(idStr)) {
    return idStr;
  }
  
  // UUID形式でない場合はnullを返す
  return null;
}

/**
 * Supabase用にIDを安全にキャスト
 */
export function castToUUID(id) {
  const normalized = normalizeUUID(id);
  if (!normalized) {
    throw new Error(`Invalid UUID format: ${id}`);
  }
  return normalized;
}

/**
 * 条件付きでUUIDをキャスト（nullの場合はnullを返す）
 */
export function safeCastToUUID(id) {
  if (!id) return null;
  try {
    return castToUUID(id);
  } catch (error) {
    console.warn(`Failed to cast to UUID: ${id}`, error.message);
    return null;
  }
}