import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptionId } = req.body || {};
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscriptionId' });
    }

    const canceled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return res.status(200).json({ status: canceled.status });
  } catch (error: any) {
    console.error('Stripe cancel error:', error);
    return res.status(500).json({ error: error.message });
  }
}


