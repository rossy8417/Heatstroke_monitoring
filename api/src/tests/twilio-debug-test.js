#!/usr/bin/env node

/**
 * Twilioデバッグテスト - 詳細なログ出力
 */

import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

async function debugTwilioCall() {
  console.log('🔍 Twilioデバッグテスト\n');
  console.log('========================================\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const toNumber = '+819062363364';
  
  console.log('環境変数の確認:');
  console.log(`  TWILIO_ACCOUNT_SID: ${accountSid ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${authToken ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${fromNumber || '❌ 未設定'}`);
  console.log('');
  
  const client = twilio(accountSid, authToken);
  
  try {
    // アカウント情報を確認
    console.log('📊 アカウント情報を確認中...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`  アカウント名: ${account.friendlyName}`);
    console.log(`  ステータス: ${account.status}`);
    console.log(`  タイプ: ${account.type}`);
    console.log('');
    
    // 電話番号の詳細を確認
    console.log('📱 電話番号の確認...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({limit: 5});
    phoneNumbers.forEach(num => {
      console.log(`  番号: ${num.phoneNumber}`);
      console.log(`    機能: Voice=${num.capabilities.voice}, SMS=${num.capabilities.sms}`);
      console.log(`    ステータス: ${num.status}`);
    });
    console.log('');
    
    // テスト発信
    console.log('☎️  テスト発信を開始...');
    console.log(`  From: ${fromNumber}`);
    console.log(`  To: ${toNumber}`);
    console.log('');
    
    const call = await client.calls.create({
      to: toNumber,
      from: fromNumber,
      twiml: `
        <Response>
          <Say language="ja-JP" voice="Polly.Mizuki">
            デバッグテストです。
            この電話は正常に発信されています。
            5秒後に切断します。
          </Say>
          <Pause length="5"/>
          <Say language="ja-JP" voice="Polly.Mizuki">
            テスト完了です。
          </Say>
        </Response>
      `
    });
    
    console.log('✅ 発信リクエスト成功！');
    console.log(`  Call SID: ${call.sid}`);
    console.log(`  初期ステータス: ${call.status}`);
    console.log(`  方向: ${call.direction}`);
    console.log(`  作成時刻: ${call.dateCreated}`);
    console.log('');
    
    // 5秒待ってから通話状況を確認
    console.log('⏰ 5秒後に通話状況を確認します...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const callStatus = await client.calls(call.sid).fetch();
    console.log('');
    console.log('📊 通話状況:');
    console.log(`  現在のステータス: ${callStatus.status}`);
    console.log(`  持続時間: ${callStatus.duration}秒`);
    console.log(`  価格: ${callStatus.price || '計算中'}`);
    
    // エラーがあれば表示
    if (callStatus.status === 'failed' || callStatus.status === 'canceled') {
      console.log('');
      console.log('❌ 通話が失敗しました');
      
      // 通話の詳細なエラー情報を取得
      const notifications = await client.monitor.v1.alerts.list({
        resourceSid: call.sid,
        limit: 5
      });
      
      if (notifications.length > 0) {
        console.log('エラー詳細:');
        notifications.forEach(notif => {
          console.log(`  - ${notif.alertText}`);
        });
      }
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ エラーが発生しました:');
    console.error(`  メッセージ: ${error.message}`);
    
    if (error.code) {
      console.error(`  エラーコード: ${error.code}`);
      
      // Twilioエラーコードの説明
      const errorExplanations = {
        20003: '認証エラー: Account SIDまたはAuth Tokenが間違っています',
        20404: 'リソースが見つかりません: 電話番号が存在しない可能性があります',
        21211: '無効な電話番号: To番号の形式を確認してください',
        21214: '無効な電話番号: From番号がTwilioアカウントに登録されていません',
        21608: '電話番号が検証されていません（トライアルアカウントの場合）',
        11200: 'HTTP取得エラー: Webhook URLにアクセスできません',
        13223: '通話がブロックされました: 不正検知システムによるブロック',
        32203: '地理的権限エラー: この地域への発信が許可されていません'
      };
      
      if (errorExplanations[error.code]) {
        console.error(`  説明: ${errorExplanations[error.code]}`);
      }
    }
    
    if (error.moreInfo) {
      console.error(`  詳細情報: ${error.moreInfo}`);
    }
  }
  
  console.log('');
  console.log('💡 ヒント:');
  console.log('  - Twilioコンソールで通話ログを確認: https://console.twilio.com/develop/voice/logs/calls');
  console.log('  - デバッガーでエラーを確認: https://console.twilio.com/develop/debugger/alerts');
}

// 実行
debugTwilioCall()
  .then(() => {
    console.log('\n✅ デバッグテスト完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('致命的エラー:', error);
    process.exit(1);
  });