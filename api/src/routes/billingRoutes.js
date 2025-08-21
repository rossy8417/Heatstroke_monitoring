import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const SUBSCRIPTIONS_FILE = path.join(__dirname, '../data/subscriptions.json');

const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  req.userToken = token;
  next();
};

const PLANS = [
  {
    id: 'plan_personal',
    name: 'パーソナルプラン',
    type: 'personal',
    price: 980,
    currency: 'JPY',
    interval: 'month',
    max_households: 1,
    max_contacts: 3,
    features: [
      '1世帯まで管理',
      '基本的なアラート機能',
      '3件まで緊急連絡先',
      'メール・SMS通知',
      '基本サポート'
    ],
    stripe_price_id: 'price_personal_980_jpy_monthly'
  },
  {
    id: 'plan_family',
    name: 'ファミリープラン',
    type: 'family',
    price: 2980,
    currency: 'JPY',
    interval: 'month',
    max_households: 3,
    max_contacts: 10,
    features: [
      '3世帯まで管理',
      '高度なアラート分析',
      '10件まで緊急連絡先',
      'LINE通知対応',
      'カスタムアラート設定',
      '優先サポート'
    ],
    stripe_price_id: 'price_family_2980_jpy_monthly',
    recommended: true
  },
  {
    id: 'plan_business',
    name: 'ビジネスプラン',
    type: 'business',
    price: 9800,
    currency: 'JPY',
    interval: 'month',
    max_households: 0, // 無制限
    max_contacts: 0, // 無制限
    features: [
      '無制限の世帯管理',
      '全機能利用可能',
      '無制限の緊急連絡先',
      'API アクセス',
      'データエクスポート',
      'ユーザー管理機能',
      '24時間サポート',
      'SLA保証'
    ],
    stripe_price_id: 'price_business_9800_jpy_monthly'
  }
];

router.get('/plans', authRequired, async (req, res) => {
  try {
    res.json(PLANS);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/change-plan', authRequired, async (req, res) => {
  try {
    const { planType } = req.body;
    const userId = req.userToken;
    
    if (!['personal', 'family', 'business'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const plan = PLANS.find(p => p.type === planType);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    let subscriptions = JSON.parse(subscriptionsData);
    
    const subscriptionIndex = subscriptions.findIndex(sub => sub.user_id === userId);
    
    if (subscriptionIndex === -1) {
      const newSubscription = {
        id: `sub_${Date.now()}`,
        user_id: userId,
        type: planType,
        status: 'active',
        price: plan.price,
        currency: plan.currency,
        max_households: plan.max_households,
        max_contacts: plan.max_contacts,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      subscriptions.push(newSubscription);
    } else {
      const currentPeriodEnd = new Date(subscriptions[subscriptionIndex].current_period_end);
      const now = new Date();
      
      subscriptions[subscriptionIndex] = {
        ...subscriptions[subscriptionIndex],
        type: planType,
        price: plan.price,
        max_households: plan.max_households,
        max_contacts: plan.max_contacts,
        current_period_start: now > currentPeriodEnd ? now.toISOString() : subscriptions[subscriptionIndex].current_period_start,
        current_period_end: now > currentPeriodEnd ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : subscriptions[subscriptionIndex].current_period_end,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString()
      };
    }
    
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    
    const updatedSubscription = subscriptions[subscriptionIndex] || subscriptions[subscriptions.length - 1];
    
    res.json({
      message: 'Plan changed successfully',
      subscription: updatedSubscription,
      plan: plan
    });
  } catch (error) {
    console.error('Error changing plan:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

router.post('/cancel', authRequired, async (req, res) => {
  try {
    const userId = req.userToken;
    
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    let subscriptions = JSON.parse(subscriptionsData);
    
    const subscriptionIndex = subscriptions.findIndex(sub => sub.user_id === userId);
    
    if (subscriptionIndex === -1) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    subscriptions[subscriptionIndex] = {
      ...subscriptions[subscriptionIndex],
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    };
    
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
    
    res.json({
      message: 'Subscription will be cancelled at the end of current period',
      subscription: subscriptions[subscriptionIndex]
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.get('/subscription', authRequired, async (req, res) => {
  try {
    const userId = req.userToken;
    
    const subscriptionsData = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    const subscriptions = JSON.parse(subscriptionsData);
    
    const subscription = subscriptions.find(sub => sub.user_id === userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.get('/invoices', authRequired, async (req, res) => {
  try {
    const userId = req.userToken;
    
    const mockInvoices = [
      {
        id: `inv_${Date.now() - 2592000000}`, // 30日前
        amount: 2980,
        currency: 'JPY',
        status: 'paid',
        period_start: new Date(Date.now() - 2592000000).toISOString(),
        period_end: new Date().toISOString(),
        created_at: new Date(Date.now() - 2592000000).toISOString(),
        invoice_pdf: null
      },
      {
        id: `inv_${Date.now() - 5184000000}`, // 60日前
        amount: 2980,
        currency: 'JPY',
        status: 'paid',
        period_start: new Date(Date.now() - 5184000000).toISOString(),
        period_end: new Date(Date.now() - 2592000000).toISOString(),
        created_at: new Date(Date.now() - 5184000000).toISOString(),
        invoice_pdf: null
      }
    ];
    
    res.json({
      data: mockInvoices,
      total: mockInvoices.length
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;