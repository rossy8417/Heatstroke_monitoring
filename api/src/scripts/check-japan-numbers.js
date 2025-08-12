#!/usr/bin/env node

import twilio from 'twilio';
import { config } from 'dotenv';
config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkJapanNumbers() {
  console.log('🇯🇵 日本番号の取得可能状況を確認中...\n');
  
  try {
    // アカウントのRegulatory Compliance状態を確認
    console.log('📋 アカウント状態確認:');
    const account = await client.api.v2010.accounts(accountSid).fetch();
    console.log(`  Type: ${account.type}`);
    console.log(`  Status: ${account.status}\n`);
    
    // 050番号（Mobile）を検索
    console.log('📱 050番号（Mobile）の検索...');
    try {
      const mobileNumbers = await client.availablePhoneNumbers('JP')
        .mobile
        .list({ limit: 3 });
      
      if (mobileNumbers.length > 0) {
        console.log('✅ 購入可能な050番号:');
        mobileNumbers.forEach(num => {
          console.log(`  ${num.phoneNumber}`);
          console.log(`    料金: ${num.price} ${num.priceUnit}/月`);
          console.log(`    機能: 音声=${num.capabilities.voice}, SMS=${num.capabilities.sms}`);
        });
      } else {
        console.log('❌ 050番号は現在利用できません');
      }
    } catch (error) {
      console.log('❌ 050番号の検索エラー:', error.message);
      if (error.code === 20003) {
        console.log('   → Regulatory Complianceの設定が必要です');
      }
    }
    
    // 03番号（東京）を検索
    console.log('\n☎️ 03番号（東京）の検索...');
    try {
      const tokyoNumbers = await client.availablePhoneNumbers('JP')
        .local
        .list({ 
          areaCode: '3',
          limit: 3 
        });
      
      if (tokyoNumbers.length > 0) {
        console.log('✅ 購入可能な03番号:');
        tokyoNumbers.forEach(num => {
          console.log(`  ${num.phoneNumber}`);
          console.log(`    料金: ${num.price} ${num.priceUnit}/月`);
        });
      } else {
        console.log('❌ 03番号は現在利用できません');
      }
    } catch (error) {
      console.log('❌ 03番号の検索エラー:', error.message);
    }
    
    // Toll-Free番号を検索
    console.log('\n📞 フリーダイヤル番号の検索...');
    try {
      const tollFreeNumbers = await client.availablePhoneNumbers('JP')
        .tollFree
        .list({ limit: 3 });
      
      if (tollFreeNumbers.length > 0) {
        console.log('✅ 購入可能なフリーダイヤル:');
        tollFreeNumbers.forEach(num => {
          console.log(`  ${num.phoneNumber}`);
          console.log(`    料金: ${num.price} ${num.priceUnit}/月`);
        });
      } else {
        console.log('❌ フリーダイヤルは現在利用できません');
      }
    } catch (error) {
      console.log('❌ フリーダイヤルの検索エラー:', error.message);
    }
    
    console.log('\n\n💡 次のステップ:');
    console.log('1. 番号が表示されない場合:');
    console.log('   → Regulatory Complianceの設定が必要');
    console.log('   → https://console.twilio.com/develop/phone-numbers/regulatory-compliance');
    console.log('\n2. 番号が表示される場合:');
    console.log('   → Twilioコンソールから購入');
    console.log('   → https://console.twilio.com/develop/phone-numbers/manage/search');
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    
    if (error.code === 20003) {
      console.log('\n⚠️ Regulatory Complianceが必要です');
      console.log('以下のURLから設定してください:');
      console.log('https://console.twilio.com/develop/phone-numbers/regulatory-compliance/bundles');
    }
  }
}

checkJapanNumbers();