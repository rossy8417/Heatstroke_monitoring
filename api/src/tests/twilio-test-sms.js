#!/usr/bin/env node

/**
 * Twilio SMS送信テスト
 */

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendTestSMS() {
  const toNumber = process.argv[2] || '+819062363364';
  
  console.log('📱 SMSテスト送信');
  console.log('================\n');
  console.log(`送信先: ${toNumber}`);
  console.log(`送信元: ${fromNumber}\n`);
  
  try {
    const message = await client.messages.create({
      to: toNumber,
      from: fromNumber,
      body: '【熱中症予防】本日は暑さ指数が警戒レベルです。水分補給を忘れずに。体調確認のお電話をさせていただく場合があります。'
    });
    
    console.log('✅ SMS送信成功！');
    console.log(`Message SID: ${message.sid}`);
    console.log(`Status: ${message.status}`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    
    if (error.code === 21608) {
      console.log('\n番号が認証されていません。Twilioコンソールで認証してください:');
      console.log('https://console.twilio.com/develop/phone-numbers/manage/verified');
    }
  }
}

sendTestSMS();