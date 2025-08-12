#!/usr/bin/env node

/**
 * Twilio直接テスト - TwiMLビンを使用
 * Webhook URLなしで電話をかけるテスト
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

async function testDirectCall() {
  console.log('📞 Twilio直接テスト\n');
  console.log('========================================\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = '+819062363364'; // あなたの番号
  
  console.log('設定確認:');
  console.log(`  Account SID: ${accountSid?.substring(0, 10)}...`);
  console.log(`  From: ${fromNumber}`);
  console.log(`  To: ${toNumber}`);
  console.log('');
  
  const client = twilio(accountSid, authToken);
  
  try {
    console.log('📱 電話を発信しています...\n');
    
    // TwiMLビンを使用（Webhook URLが不要）
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      twiml: `
        <Response>
          <Say language="ja-JP" voice="Polly.Mizuki">
            こんにちは。熱中症見守りシステムのテストです。
            体調はいかがですか？
            大丈夫な場合は1を、
            疲れている場合は2を、
            助けが必要な場合は3を押してください。
          </Say>
          <Gather numDigits="1" timeout="10">
            <Say language="ja-JP" voice="Polly.Mizuki">
              番号を押してください。
            </Say>
          </Gather>
          <Say language="ja-JP" voice="Polly.Mizuki">
            入力がありませんでした。もう一度おかけ直します。
          </Say>
        </Response>
      `
    });
    
    console.log('✅ 発信成功！');
    console.log(`  Call SID: ${call.sid}`);
    console.log(`  Status: ${call.status}`);
    console.log('');
    console.log('📊 通話状況を確認:');
    console.log('https://console.twilio.com/develop/voice/logs/calls');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.code) {
      console.error(`  エラーコード: ${error.code}`);
    }
    if (error.moreInfo) {
      console.error(`  詳細: ${error.moreInfo}`);
    }
  }
}

// 実行
testDirectCall()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('失敗:', error);
    process.exit(1);
  });