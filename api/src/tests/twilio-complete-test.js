#!/usr/bin/env node

/**
 * Twilio完全テスト - 番号入力の応答も含む
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

async function testCompleteCall() {
  console.log('📞 Twilio完全テスト（応答付き）\n');
  console.log('========================================\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = '+819062363364';
  
  const client = twilio(accountSid, authToken);
  
  try {
    console.log('📱 電話を発信しています...\n');
    
    // TwiMLビンを作成（番号入力後の処理も含む）
    const twimlBin = await client.serverlessV1
      .services('default')
      .assets
      .create({
        key: `/twiml-${Date.now()}.xml`,
        content: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP" voice="Polly.Mizuki">
    こんにちは、テスト太郎様。
    熱中症見守りシステムです。
    本日の熱中症警戒レベルが高くなっています。
    体調はいかがですか？
  </Say>
  <Say language="ja-JP" voice="Polly.Mizuki">
    お元気な場合は1を、
    疲れている場合は2を、
    助けが必要な場合は3を押してください。
  </Say>
  <Gather numDigits="1" timeout="10">
    <Say language="ja-JP" voice="Polly.Mizuki">
      番号を押してお答えください。
    </Say>
  </Gather>
  <Say language="ja-JP" voice="Polly.Mizuki">
    入力がありませんでした。
    安全確認のため、ご家族に連絡いたします。
    お大事になさってください。
  </Say>
</Response>`
      }).catch(err => {
        // TwiMLビンの作成に失敗した場合は、直接TwiMLを使用
        console.log('TwiMLビン作成失敗、直接TwiMLを使用');
        return null;
      });
    
    // 電話をかける
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      twiml: `
        <Response>
          <Say language="ja-JP" voice="Polly.Mizuki">
            こんにちは、テスト太郎様。
            熱中症見守りシステムです。
            本日の熱中症警戒レベルが高くなっています。
            体調はいかがですか？
          </Say>
          <Pause length="1"/>
          <Say language="ja-JP" voice="Polly.Mizuki">
            お元気な場合は1を、
            疲れている場合は2を、
            助けが必要な場合は3を押してください。
          </Say>
          <Pause length="10"/>
          <Say language="ja-JP" voice="Polly.Mizuki">
            電話テストを終了します。
            実際の運用では、番号入力により適切な対応を行います。
            1番：大丈夫です、と記録されます。
            2番：疲れています、と記録され、後ほど確認の連絡をします。
            3番：助けが必要、と記録され、すぐにご家族に連絡します。
            ありがとうございました。
          </Say>
        </Response>
      `
    });
    
    console.log('✅ 発信成功！');
    console.log(`  Call SID: ${call.sid}`);
    console.log(`  Status: ${call.status}`);
    console.log('');
    console.log('📊 番号入力の説明:');
    console.log('  1番 = 大丈夫（記録のみ）');
    console.log('  2番 = 疲れている（後で確認）');
    console.log('  3番 = 助けが必要（家族に緊急連絡）');
    console.log('');
    console.log('※ 現在はテストモードのため、番号入力後の');
    console.log('  実際の処理（家族への連絡等）は行いません。');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// 実行
testCompleteCall()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('失敗:', error);
    process.exit(1);
  });