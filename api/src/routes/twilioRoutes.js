import express from 'express';
import { 
  generateTwiML, 
  handleGather, 
  handleStatusCallback, 
  handleSmsStatusCallback 
} from '../controllers/twilioController.js';
import { twilioService } from '../services/twilioService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// TwiML生成（IVR音声フロー）
router.post('/twiml', asyncHandler(generateTwiML));
router.get('/twiml', asyncHandler(generateTwiML));

// DTMF入力処理
router.post('/gather', asyncHandler(handleGather));

// ステータスコールバック
router.post('/status', asyncHandler(handleStatusCallback));
router.post('/sms-status', asyncHandler(handleSmsStatusCallback));

// テスト用エンドポイント

// 発信テスト
router.post('/test/call', asyncHandler(async (req, res) => {
  const { to, alertId = 'test_alert', name = 'テスト' } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  const result = await twilioService.makeCall({
    to,
    alertId,
    householdName: name,
    attempt: 1
  });
  
  logger.info('Test call initiated', result);
  res.json(result);
}));

// SMS送信テスト
router.post('/test/sms', asyncHandler(async (req, res) => {
  const { to, message = 'テストメッセージです' } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  const result = await twilioService.sendSms({
    to,
    body: message,
    alertId: 'test_alert'
  });
  
  logger.info('Test SMS sent', result);
  res.json(result);
}));

// アカウント情報
router.get('/account/balance', asyncHandler(async (req, res) => {
  const balance = await twilioService.getAccountBalance();
  res.json(balance);
}));

// 利用可能番号検索
router.get('/numbers/available', asyncHandler(async (req, res) => {
  const { areaCode = '050' } = req.query;
  const result = await twilioService.searchAvailableNumbers(areaCode);
  res.json(result);
}));

export default router;