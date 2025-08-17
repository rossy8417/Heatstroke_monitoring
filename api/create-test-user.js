import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestUser() {
  try {
    console.log('📝 テストユーザーを作成中...');
    
    // テストユーザーの情報
    const email = 'test@example.com';
    const password = 'test123456';
    
    // ユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        name: 'テストユーザー',
        user_type: 'individual'
      }
    });

    if (authError) {
      // ユーザーが既に存在する場合はパスワードをリセット
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  ユーザーが既に存在します。パスワードをリセットします...');
        
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError) {
          const existingUser = users.users.find(u => u.email === email);
          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password: password }
            );
            
            if (updateError) {
              console.error('❌ パスワードリセットエラー:', updateError);
              return;
            }
            console.log('✅ パスワードをリセットしました');
          }
        }
      } else {
        console.error('❌ ユーザー作成エラー:', authError);
        return;
      }
    } else {
      console.log('✅ ユーザー作成完了:', authData.user.email);
    }
    
    console.log('\n🎉 テストユーザー作成完了！');
    console.log('================================');
    console.log('📧 メールアドレス: test@example.com');
    console.log('🔑 パスワード: test123456');
    console.log('================================');
    console.log('\n👉 http://localhost:3001/login でログインしてください');
    console.log('👉 ログイン後、http://localhost:3001/alerts でアラートページを確認できます');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

createTestUser();