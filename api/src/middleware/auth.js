import { supabase } from '../db/supabase.js';
import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from './requestId.js';

/**
 * 認証ミドルウェア - Supabase JWT認証
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    // Supabaseでトークンを検証
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn('Authentication failed', { 
        error: error?.message,
        requestId: getCurrentRequestId()
      });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // リクエストオブジェクトにユーザー情報を追加
    req.user = user;
    req.userId = user.id;
    
    logger.debug('User authenticated', { 
      userId: user.id,
      email: user.email,
      requestId: getCurrentRequestId()
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error.message,
      requestId: getCurrentRequestId()
    });
    res.status(500).json({ error: 'Internal authentication error' });
  }
};

/**
 * オプショナル認証ミドルウェア - 認証が失敗してもリクエストを続行
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          req.user = user;
          req.userId = user.id;
          
          logger.debug('Optional auth succeeded', { 
            userId: user.id,
            requestId: getCurrentRequestId()
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed', { 
      error: error.message,
      requestId: getCurrentRequestId()
    });
    next(); // エラーがあっても続行
  }
};

/**
 * 管理者権限チェックミドルウェア
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 管理者ロールの確認（app_metadataまたはuser_metadataから）
  const userMetadata = req.user.user_metadata || {};
  const appMetadata = req.user.app_metadata || {};
  
  const isAdmin = userMetadata.role === 'admin' || 
                  appMetadata.role === 'admin' ||
                  userMetadata.is_admin === true ||
                  appMetadata.is_admin === true;

  if (!isAdmin) {
    logger.warn('Admin access denied', { 
      userId: req.user.id,
      requestId: getCurrentRequestId()
    });
    return res.status(403).json({ error: 'Admin privileges required' });
  }

  next();
};