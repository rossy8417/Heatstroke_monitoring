export function validateEnv() {
  const required = [];
  const optional = [
    'PORT',
    'WEBHOOK_SECRET',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LINE_CHANNEL_ID',
    'LOG_LEVEL'
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