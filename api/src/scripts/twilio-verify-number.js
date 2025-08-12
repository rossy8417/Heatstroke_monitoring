#!/usr/bin/env node

/**
 * Twilio無料トライアルで電話番号を認証するスクリプト
 * 使用方法: node src/scripts/twilio-verify-number.js +819012345678
 */

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ TWILIO_ACCOUNT_SID と TWILIO_AUTH_TOKEN を .env に設定してください');
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.log(`
📞 Twilio認証済み番号管理ツール

使用方法:
  node src/scripts/twilio-verify-number.js [command] [phone]

コマンド:
  list                     認証済み番号一覧を表示
  add +819012345678       番号を認証リストに追加
  remove +819012345678    番号を認証リストから削除
  test +819012345678      テスト発信

例:
  node src/scripts/twilio-verify-number.js list
  node src/scripts/twilio-verify-number.js add +819012345678
`);
  process.exit(0);
}

async function listVerifiedNumbers() {
  try {
    console.log('\n📋 認証済み電話番号一覧:\n');
    
    const callerIds = await client.outgoingCallerIds.list();
    
    if (callerIds.length === 0) {
      console.log('  認証済みの番号はありません');
    } else {
      callerIds.forEach((callerId, index) => {
        console.log(`  ${index + 1}. ${callerId.phoneNumber} - ${callerId.friendlyName}`);
      });
    }
    
    console.log('\n💡 新しい番号を追加するには:');
    console.log('  node src/scripts/twilio-verify-number.js add +819012345678');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function addVerifiedNumber(number) {
  try {
    console.log(`\n📞 ${number} を認証リストに追加します...\n`);
    
    // 認証プロセスを開始
    const validation = await client.validationRequests.create({
      phoneNumber: number,
      friendlyName: `Test Number ${new Date().toLocaleDateString()}`,
      callDelay: 0
    });
    
    console.log('✅ 認証リクエストを送信しました');
    console.log('\n以下の手順で認証を完了してください:');
    console.log('1. まもなく入力した番号に電話がかかってきます');
    console.log('2. 自動音声で6桁の認証コードが読み上げられます');
    console.log('3. Twilioコンソールで認証を完了してください:');
    console.log(`   https://console.twilio.com/develop/phone-numbers/manage/verified`);
    console.log('\n認証コード:', validation.validationCode);
    
  } catch (error) {
    if (error.message.includes('already verified')) {
      console.log('✅ この番号は既に認証済みです');
    } else {
      console.error('❌ エラー:', error.message);
    }
  }
}

async function removeVerifiedNumber(number) {
  try {
    console.log(`\n🗑️  ${number} を認証リストから削除します...\n`);
    
    const callerIds = await client.outgoingCallerIds.list({ phoneNumber: number });
    
    if (callerIds.length === 0) {
      console.log('❌ この番号は認証リストにありません');
      return;
    }
    
    await client.outgoingCallerIds(callerIds[0].sid).remove();
    console.log('✅ 削除しました');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

async function testCall(number) {
  try {
    console.log(`\n📞 ${number} にテスト発信します...\n`);
    
    const call = await client.calls.create({
      to: number,
      from: process.env.TWILIO_PHONE_NUMBER || '+15005550006', // テスト番号
      twiml: `
        <Response>
          <Say language="ja-JP" voice="Polly.Mizuki">
            こんにちは。これはテスト通話です。
            正常に動作しています。
          </Say>
        </Response>
      `
    });
    
    console.log('✅ 発信しました');
    console.log('  Call SID:', call.sid);
    console.log('  Status:', call.status);
    console.log('\n💡 通話履歴はこちらで確認できます:');
    console.log('  https://console.twilio.com/develop/phone-numbers/manage/active-numbers');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    
    if (error.message.includes('not verified')) {
      console.log('\n💡 この番号は認証されていません。先に認証してください:');
      console.log(`  node src/scripts/twilio-verify-number.js add ${number}`);
    }
  }
}

// コマンド実行
const command = phoneNumber.toLowerCase();

switch (command) {
  case 'list':
    await listVerifiedNumbers();
    break;
  case 'add':
    const addNumber = process.argv[3];
    if (!addNumber) {
      console.error('❌ 電話番号を指定してください');
      process.exit(1);
    }
    await addVerifiedNumber(addNumber);
    break;
  case 'remove':
    const removeNumber = process.argv[3];
    if (!removeNumber) {
      console.error('❌ 電話番号を指定してください');
      process.exit(1);
    }
    await removeVerifiedNumber(removeNumber);
    break;
  case 'test':
    const testNumber = process.argv[3];
    if (!testNumber) {
      console.error('❌ 電話番号を指定してください');
      process.exit(1);
    }
    await testCall(testNumber);
    break;
  default:
    // 番号が直接指定された場合は追加
    await addVerifiedNumber(phoneNumber);
}