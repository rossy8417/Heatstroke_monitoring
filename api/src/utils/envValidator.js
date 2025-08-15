export function validateEnv() {
  const required = [
    // Supabase (バックエンド書き込み用はSERVICE_KEYも推奨)
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    // Webhook検証や連携に必要
    // 'WEBHOOK_SECRET' は開発で省略可
  ];
  const optional = [
    'PORT',
    'WEBHOOK_SECRET',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LINE_CHANNEL_ID',
    'LOG_LEVEL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'TWILIO_WEBHOOK_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const warnings = [];
  
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    warnings.push('LINE_CHANNEL_ACCESS_TOKEN not set - LINE push messages will not be sent');
  }
  
  if (!process.env.LINE_CHANNEL_SECRET) {
    warnings.push('LINE_CHANNEL_SECRET not set - LINE webhook signatures will not be verified');
  }
  
  if (!process.env.WEBHOOK_SECRET) {
    warnings.push('WEBHOOK_SECRET not set - webhook signatures will not be verified');
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    warnings.push('Twilio not fully configured - falling back to stub for calls/SMS');
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY not set - billing APIs will not work');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}

export function getConfig() {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    webhookSecret: process.env.WEBHOOK_SECRET,
    line: {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      channelId: process.env.LINE_CHANNEL_ID
    },
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}