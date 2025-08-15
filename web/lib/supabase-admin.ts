import { createClient } from '@supabase/supabase-js';

// サーバー用（サービスロール）Supabaseクライアント
// 環境変数は公開変数(NEXT_PUBLIC_)ではなく、サーバ専用を使用
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});


