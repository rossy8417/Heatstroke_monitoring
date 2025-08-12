#!/usr/bin/env node

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkNumbers() {
  console.log('🔍 Twilioアカウント状況\n');
  
  try {
    // アカウントタイプ確認
    const account = await client.api.v2010.accounts(accountSid).fetch();
    console.log('📋 アカウント情報:');
    console.log(`  Status: ${account.status}`);
    console.log(`  Type: ${account.type} ${account.type === 'Trial' ? '(無料版)' : '(有料版✅)'}`);
    
    // 所有番号
    console.log('\n📞 所有している電話番号:');
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
    if (phoneNumbers.length === 0) {
      console.log('  番号を所有していません');
      console.log('\n💡 日本の番号を購入してください:');
      console.log('  https://console.twilio.com/develop/phone-numbers/manage/search');
      console.log('  1. Country: Japan を選択');
      console.log('  2. Mobile (050) または Local (03/06) を選択');
      console.log('  3. Buy をクリック');
    } else {
      phoneNumbers.forEach(num => {
        const isJapan = num.phoneNumber.startsWith('+81');
        console.log(`  ${num.phoneNumber} ${isJapan ? '🇯🇵' : '🇺🇸'}`);
        console.log(`    Name: ${num.friendlyName}`);
        console.log(`    Capabilities: Voice=${num.capabilities.voice}, SMS=${num.capabilities.sms}`);
        console.log(`    月額: ${num.price} ${num.priceUnit}`);
      });
    }
    
    // 利用可能な日本の番号を検索
    console.log('\n🔎 購入可能な日本の番号を検索中...');
    const availableNumbers = await client.availablePhoneNumbers('JP')
      .mobile
      .list({ limit: 3 });
    
    if (availableNumbers.length > 0) {
      console.log('\n📱 購入可能な番号（例）:');
      availableNumbers.forEach(num => {
        console.log(`  ${num.phoneNumber}`);
        console.log(`    地域: ${num.region || 'Mobile'}`);
        console.log(`    月額: 約${num.price}円`);
      });
      console.log('\n購入はこちら: https://console.twilio.com/develop/phone-numbers/manage/search');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

checkNumbers();