#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 環境に応じたRLS設定スクリプト
 * 
 * 使い方:
 * npm run configure-rls:dev     # 開発環境用（RLS無効化）
 * npm run configure-rls:prod    # 本番環境用（RLS有効化）
 */

async function configureRLS() {
  const environment = process.argv[2] || 'development';
  
  console.log(`\n🔐 RLS設定を${environment}環境用に構成します...\n`);

  // Supabase接続情報
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ エラー: SUPABASE_URLとSUPABASE_SERVICE_KEYが必要です');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (environment === 'production' || environment === 'prod') {
      // 本番環境: RLSを有効化
      console.log('📝 本番環境用RLSポリシーを適用中...');
      
      const sqlPath = path.join(__dirname, 'setup-rls-production.sql');
      const sql = await fs.readFile(sqlPath, 'utf8');
      
      // SQLを実行（セミコロンで分割して順次実行）
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        // SELECT文は結果を表示
        if (statement.toUpperCase().startsWith('SELECT')) {
          const { data, error } = await supabase.rpc('exec_sql', {
            query: statement
          }).single();
          
          if (error) {
            console.log(`⚠️  警告: ${error.message}`);
          } else if (data) {
            console.table(data);
          }
        } else {
          // その他のSQL文は実行のみ
          const { error } = await supabase.rpc('exec_sql', {
            query: statement
          }).single();
          
          if (error) {
            console.log(`⚠️  警告: ${error.message}`);
          }
        }
      }
      
      console.log('✅ 本番環境用RLSポリシーが適用されました');
      console.log('🔒 Row Level Securityが有効になりました');
      
    } else if (environment === 'development' || environment === 'dev') {
      // 開発環境: RLSを無効化（簡易開発用）
      console.log('🔓 開発環境用にRLSを無効化中...');
      
      const tables = ['households', 'alerts', 'call_logs', 'notifications', 'contacts', 'audit_logs'];
      
      for (const table of tables) {
        const { error } = await supabase.rpc('exec_sql', {
          query: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`
        }).single();
        
        if (error) {
          console.log(`⚠️  ${table}テーブルのRLS無効化をスキップ: ${error.message}`);
        } else {
          console.log(`✅ ${table}テーブルのRLSを無効化しました`);
        }
      }
      
      console.log('\n⚠️  警告: RLSが無効化されました。本番環境では使用しないでください！');
      
    } else {
      console.error(`❌ 不明な環境: ${environment}`);
      console.log('使用可能な環境: development (dev), production (prod)');
      process.exit(1);
    }

    // 現在のRLS状態を確認
    console.log('\n📊 現在のRLS状態:');
    const { data: rlsStatus, error: statusError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['households', 'alerts', 'call_logs', 'notifications', 'contacts', 'audit_logs']);

    if (rlsStatus) {
      console.table(rlsStatus);
    }

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }

  console.log('\n✨ RLS設定が完了しました\n');
}

// スクリプトがない場合はRPC関数を作成
async function createExecSqlFunction() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // exec_sql RPC関数を作成（存在しない場合）
  const createFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE query;
      RETURN '{"success": true}'::json;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
    END;
    $$;
  `;

  try {
    await supabase.rpc('exec_sql', { query: createFunction }).single();
  } catch (e) {
    // 関数作成のエラーは無視（既に存在する場合など）
  }
}

// メイン実行
(async () => {
  await createExecSqlFunction();
  await configureRLS();
})();