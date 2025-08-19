import express from 'express';
import { supabaseDataStore } from '../services/supabaseDataStore.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandlerUnified.js';
import { getCurrentRequestId } from '../middleware/requestId.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// 全てのルートで認証が必要
router.use(authenticateUser);

// ================== ユーザープロファイル管理 ==================

// 現在のユーザー情報取得
router.get('/profile', asyncHandler(async (req, res) => {
  const userId = req.userId; // 認証ミドルウェアから取得

  const { data: user, error } = await supabaseDataStore.getUserProfile(userId);
  
  if (error) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
}));

// ユーザー情報更新
router.put('/profile', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { data, error } = await supabaseDataStore.updateUserProfile(userId, req.body);
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
}));

// ================== サブスクリプション管理 ==================

// 現在のサブスクリプション取得
router.get('/subscription', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { data: subscription, error } = await supabaseDataStore.getUserSubscription(userId);
  
  if (error) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  res.json(subscription);
}));

// ================== ユーザーの世帯管理 ==================

// ユーザーの世帯一覧取得
router.get('/households', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { data: households, error } = await supabaseDataStore.getUserHouseholds(userId);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data: households });
}));

// ユーザーの世帯追加（プラン制限チェック付き）
router.post('/households', asyncHandler(async (req, res) => {
  const userId = req.userId;

  // 1. 現在のサブスクリプション取得
  const { data: subscription, error: subError } = await supabaseDataStore.getUserSubscription(userId);
  
  if (subError || !subscription) {
    return res.status(403).json({ error: 'Valid subscription required' });
  }

  // 2. 現在の世帯数取得
  const { data: currentHouseholds, error: householdError } = await supabaseDataStore.getUserHouseholds(userId);
  
  if (householdError) {
    return res.status(500).json({ error: 'Failed to check current households' });
  }

  // 3. プラン制限チェック
  const currentCount = currentHouseholds?.length || 0;
  const maxHouseholds = subscription.max_households;
  
  if (maxHouseholds > 0 && currentCount >= maxHouseholds) {
    return res.status(403).json({ 
      error: 'Household limit exceeded',
      current: currentCount,
      maximum: maxHouseholds,
      planRequired: currentCount < 3 ? 'family' : 'business'
    });
  }

  // 4. 世帯作成
  const { data: household, error } = await supabaseDataStore.createHousehold(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // 5. ユーザーと世帯の関連付け
  const { error: linkError } = await supabaseDataStore.linkUserHousehold(userId, household.id, 'owner');
  
  if (linkError) {
    // ロールバック: 作成した世帯を削除
    await supabaseDataStore.deleteHousehold(household.id);
    return res.status(500).json({ error: 'Failed to link household to user' });
  }

  logger.info('User household created', {
    userId,
    householdId: household.id,
    currentCount: currentCount + 1,
    maxHouseholds,
    requestId: getCurrentRequestId()
  });

  res.status(201).json(household);
}));

// ユーザーの世帯更新
router.put('/households/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const householdId = req.params.id;

  // 1. ユーザーがこの世帯を管理する権限があるかチェック
  const { data: userHousehold, error: linkError } = await supabaseDataStore.getUserHouseholdLink(userId, householdId);
  
  if (linkError || !userHousehold) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  // 2. 編集権限チェック
  if (!userHousehold.permissions?.edit && userHousehold.relationship !== 'owner') {
    return res.status(403).json({ error: 'Edit permission required' });
  }

  // 3. 世帯更新
  const { data, error } = await supabaseDataStore.updateHousehold(householdId, req.body);
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
}));

// ユーザーの世帯削除
router.delete('/households/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const householdId = req.params.id;

  // 1. オーナー権限チェック
  const { data: userHousehold, error: linkError } = await supabaseDataStore.getUserHouseholdLink(userId, householdId);
  
  if (linkError || !userHousehold || userHousehold.relationship !== 'owner') {
    return res.status(403).json({ error: 'Owner permission required' });
  }

  // 2. 世帯削除
  const { error } = await supabaseDataStore.deleteHousehold(householdId);
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(204).send();
}));

// ================== 緊急連絡先管理 ==================

// 世帯の緊急連絡先一覧
router.get('/households/:id/contacts', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const householdId = req.params.id;

  // 権限チェック
  const { data: userHousehold, error: linkError } = await supabaseDataStore.getUserHouseholdLink(userId, householdId);
  
  if (linkError || !userHousehold) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const { data: contacts, error } = await supabaseDataStore.getHouseholdContacts(householdId);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data: contacts });
}));

// 緊急連絡先追加
router.post('/households/:id/contacts', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const householdId = req.params.id;

  // プラン制限チェック
  const { data: subscription } = await supabaseDataStore.getUserSubscription(userId);
  const { data: currentContacts } = await supabaseDataStore.getHouseholdContacts(householdId);
  
  const currentCount = currentContacts?.length || 0;
  const maxContacts = subscription?.max_contacts || 3;
  
  if (maxContacts > 0 && currentCount >= maxContacts) {
    return res.status(403).json({ 
      error: 'Contact limit exceeded',
      current: currentCount,
      maximum: maxContacts
    });
  }

  const { data: contact, error } = await supabaseDataStore.createHouseholdContact(householdId, req.body);
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(contact);
}));

// ================== セットアップ状況確認 ==================

// ユーザーのセットアップ完了状況
router.get('/setup-status', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { data: user } = await supabaseDataStore.getUserProfile(userId);
  const { data: subscription } = await supabaseDataStore.getUserSubscription(userId);
  const { data: households } = await supabaseDataStore.getUserHouseholds(userId);

  const setupStatus = {
    hasProfile: !!(user?.name && user?.phone),
    hasSubscription: !!subscription,
    hasHouseholds: households && households.length > 0,
    householdCount: households?.length || 0,
    maxHouseholds: subscription?.max_households || 1,
    nextStep: null
  };

  // 次のステップを決定
  if (!setupStatus.hasProfile) {
    setupStatus.nextStep = 'profile';
  } else if (!setupStatus.hasSubscription) {
    setupStatus.nextStep = 'subscription';
  } else if (!setupStatus.hasHouseholds) {
    setupStatus.nextStep = 'households';
  } else {
    setupStatus.nextStep = 'complete';
  }

  setupStatus.isComplete = setupStatus.nextStep === 'complete';

  res.json(setupStatus);
}));

export default router;