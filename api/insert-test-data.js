import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
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

async function insertTestData() {
  try {
    // 1. テスト用の世帯を作成
    console.log('📝 テスト用世帯を作成中...');
    
    // Generate UUIDs for households
    const householdId1 = randomUUID();
    const householdId2 = randomUUID();
    
    const households = [
      {
        id: householdId1,
        name: 'テスト太郎',
        phone: '+81901234567',
        address_grid: '5339-24',
        address_text: '東京都千代田区1-1-1',
        risk_flag: true,
        notes: '高血圧の既往歴あり',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: householdId2,
        name: 'テスト花子',
        phone: '+81901112222',
        address_grid: '5339-24',
        address_text: '東京都千代田区2-2-2',
        risk_flag: true,
        notes: '糖尿病の既往歴あり',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { data: householdData, error: householdError } = await supabase
      .from('households')
      .upsert(households, { onConflict: 'id' })
      .select();

    if (householdError) {
      console.error('❌ 世帯作成エラー:', householdError);
      return;
    }

    console.log('✅ 世帯作成完了:', householdData);

    // 2. テスト用アラートを作成
    console.log('📝 テスト用アラートを作成中...');
    
    const alerts = [
      {
        id: randomUUID(),
        household_id: householdId1,
        status: 'unanswered',
        wbgt: 28.5,
        level: '厳重警戒',
        metadata: {
          attempts: 1,
          lastCallAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分前
          lastResponseCode: 'no_answer'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        household_id: householdId2,
        status: 'tired',
        wbgt: 27.0,
        level: '警戒',
        metadata: {
          attempts: 2,
          lastCallAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15分前
          lastResponseCode: '2'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { data: alertData, error: alertError } = await supabase
      .from('alerts')
      .upsert(alerts, { onConflict: 'id' })
      .select();

    if (alertError) {
      console.error('❌ アラート作成エラー:', alertError);
      return;
    }

    console.log('✅ アラート作成完了:', alertData);
    
    console.log('\n🎉 テストデータ作成完了！');
    console.log('👉 http://localhost:3001/alerts でアラートページを確認してください');
    console.log('\n作成されたテストデータ:');
    console.log('- 未応答アラート (test-alert-1): 再コールボタンが表示されます');
    console.log('- 要注意アラート (test-alert-2): 再コールボタンが表示されます');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

insertTestData();