#!/usr/bin/env node

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// アカウント情報を確認
async function checkAccount() {
  console.log('🔍 Twilioアカウント情報\n');
  
  try {
    // アカウント情報
    const account = await client.api.v2010.accounts(accountSid).fetch();
    console.log('📋 アカウント詳細:');
    console.log(`  Status: ${account.status}`);
    console.log(`  Type: ${account.type}`);
    console.log(`  Friendly Name: ${account.friendlyName}`);
    
    // 残高確認
    try {
      const balance = await client.balance.fetch();
      console.log(`  Balance: ${balance.balance} ${balance.currency}`);
    } catch (e) {
      console.log('  Balance: 確認できません');
    }
    
    // 所有番号
    console.log('\n📞 所有している電話番号:');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    phoneNumbers.forEach(num => {
      console.log(`  ${num.phoneNumber} (${num.friendlyName})`);
      console.log(`    Capabilities: Voice=${num.capabilities.voice}, SMS=${num.capabilities.sms}`);
    });
    
    // 認証済み番号
    console.log('\n✅ 認証済みCaller IDs:');
    const callerIds = await client.outgoingCallerIds.list({ limit: 5 });
    callerIds.forEach(id => {
      console.log(`  ${id.phoneNumber} (${id.friendlyName})`);
    });
    
    // テスト用の簡単な発信
    const testNumber = callerIds[0]?.phoneNumber;
    if (testNumber) {
      console.log(`\n🎯 ${testNumber} への発信テスト\n`);
      
      // シンプルなTwiMLで発信
      const call = await client.calls.create({
        url: 'http://demo.twilio.com/docs/voice.xml', // Twilioのデモ音声
        to: testNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      console.log('✅ 発信成功!');
      console.log(`  Call SID: ${call.sid}`);
      console.log(`  Status: ${call.status}`);
      console.log('\n💡 まもなく電話がかかってきます（英語のデモ音声）');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.log('\nエラーコード:', error.code);
    console.log('詳細:', error.moreInfo);
  }
}

checkAccount();