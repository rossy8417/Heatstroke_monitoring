#!/usr/bin/env node

/**
 * Twilioテスト発信スクリプト
 * 熱中症見守りIVRのテスト
 */

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Twilio環境変数が設定されていません');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function makeTestCall() {
  const toNumber = process.argv[2] || '+8109062363364'; // デフォルトは認証済み番号
  
  console.log('🔥 熱中症見守りシステム - テスト発信');
  console.log('================================\n');
  console.log(`📞 発信先: ${toNumber}`);
  console.log(`📱 発信元: ${fromNumber}`);
  console.log('\n発信中...\n');
  
  try {
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      twiml: `
        <Response>
          <Gather numDigits="1" timeout="10" action="/gather">
            <Say language="ja-JP" voice="Polly.Mizuki">
              こんにちは。熱中症予防の確認です。
              本日は暑さが厳しくなっています。
              体調はいかがですか？
              
              大丈夫でしたら、1を押してください。
              少し疲れている場合は、2を押してください。
              助けが必要な場合は、3を押してください。
            </Say>
          </Gather>
          <Say language="ja-JP" voice="Polly.Mizuki">
            入力が確認できませんでした。
            ご協力ありがとうございました。
          </Say>
        </Response>
      `
    });
    
    console.log('✅ 発信成功！\n');
    console.log('📋 通話詳細:');
    console.log(`  Call SID: ${call.sid}`);
    console.log(`  状態: ${call.status}`);
    console.log(`  作成日時: ${call.dateCreated}`);
    
    console.log('\n💡 注意事項:');
    console.log('  - 無料トライアルのため、最初に英語の案内が流れます');
    console.log('  - その後、日本語の音声ガイダンスが流れます');
    console.log('  - 1, 2, 3 のいずれかのボタンを押してください');
    
    console.log('\n📊 通話履歴の確認:');
    console.log('  https://console.twilio.com/develop/voice/logs/calls');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    
    if (error.code === 21608) {
      console.log('\n💡 この番号は認証されていません。');
      console.log('以下のコマンドで認証してください:');
      console.log(`  node --env-file=.env src/scripts/twilio-verify-number.js add ${toNumber}`);
    } else if (error.code === 21210) {
      console.log('\n💡 発信元番号が正しくありません。');
      console.log('.envファイルのTWILIO_PHONE_NUMBERを確認してください。');
    }
  }
}

// 実行
makeTestCall();