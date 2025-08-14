import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getPlanById } from '../../../lib/subscription-plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planId, userId } = req.body;

  if (!planId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const plan = getPlanById(planId);
  
  if (!plan || !plan.stripePriceId) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    // Stripeチェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      metadata: {
        userId,
        planId,
      },
      // 顧客情報の収集
      customer_email: req.body.email,
      billing_address_collection: 'required',
      // 日本円の設定
      currency: 'jpy',
      // トライアル期間（オプション）
      subscription_data: {
        trial_period_days: 14, // 14日間の無料トライアル
        metadata: {
          userId,
          planId,
        },
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
}