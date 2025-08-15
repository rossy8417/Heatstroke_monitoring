import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin as supabase } from '../../../lib/supabase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing user id' });
    }

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', id)
      .single();

    if (error) {
      return res.status(200).json(null);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Subscription fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
}


