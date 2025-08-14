import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Stripeはbodyをrawのまま必要とするため
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // イベント処理
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // セッションからユーザーIDとプランIDを取得
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        
        if (userId && planId) {
          // Supabaseでユーザーのサブスクリプション情報を更新
          const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: planId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              current_period_start: new Date(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
              updated_at: new Date(),
            });

          if (error) {
            console.error('Failed to update subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // サブスクリプションのステータス更新
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            updated_at: new Date(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Failed to update subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // サブスクリプションをキャンセル
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date(),
            updated_at: new Date(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Failed to cancel subscription:', error);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // 支払い履歴を記録
        const { error } = await supabase
          .from('payment_history')
          .insert({
            user_id: invoice.metadata?.userId,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            paid_at: new Date(invoice.status_transitions.paid_at! * 1000),
            created_at: new Date(),
          });

        if (error) {
          console.error('Failed to record payment:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // 支払い失敗を記録
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            user_id: invoice.metadata?.userId,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: 'failed',
            created_at: new Date(),
          });

        // サブスクリプションのステータスを更新
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date(),
          })
          .eq('stripe_customer_id', invoice.customer);

        if (paymentError) console.error('Failed to record payment failure:', paymentError);
        if (subError) console.error('Failed to update subscription:', subError);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}