export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // 月額（円）
  stripePriceId?: string; // Stripe Price ID
  features: {
    maxHouseholds: number;
    maxAlerts: number;
    lineNotifications: boolean;
    smsNotifications: boolean;
    voiceCalls: boolean;
    reports: boolean;
    apiAccess: boolean;
    support: 'community' | 'email' | 'priority';
  };
  userType: 'individual' | 'business' | 'community';
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // 個人・家族向けプラン
  {
    id: 'free',
    name: '無料プラン',
    description: '1世帯の見守りに',
    price: 0,
    stripePriceId: undefined,
    userType: 'individual',
    features: {
      maxHouseholds: 1,
      maxAlerts: 10, // 1日あたり
      lineNotifications: true,
      smsNotifications: false,
      voiceCalls: false,
      reports: false,
      apiAccess: false,
      support: 'community',
    },
  },
  {
    id: 'personal',
    name: 'パーソナル',
    description: '1世帯の充実した見守り',
    price: 500,
    stripePriceId: 'price_1RwCj5BAkas7NkkJLnBfhxQK',
    userType: 'individual',
    features: {
      maxHouseholds: 1,
      maxAlerts: 50,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: false,
      support: 'email',
    },
  },
  {
    id: 'family',
    name: 'ファミリー',
    description: '最大3世帯まで見守り可能',
    price: 1200,
    stripePriceId: 'price_1RwCkKBAkas7NkkJBvdETxe4',
    userType: 'individual',
    features: {
      maxHouseholds: 3,
      maxAlerts: 100,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: false,
      support: 'email',
    },
  },

  // 町内会・自治会向けプラン
  {
    id: 'community-basic',
    name: 'コミュニティベーシック',
    description: '小規模な地域見守り（〜10世帯）',
    price: 3000,
    stripePriceId: 'price_1RwCpPBAkas7NkkJrYpRDrSJ',
    userType: 'community',
    features: {
      maxHouseholds: 10,
      maxAlerts: 200,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: false,
      support: 'email',
    },
  },
  {
    id: 'community-standard',
    name: 'コミュニティスタンダード',
    description: '地域全体の見守り（〜20世帯）',
    price: 5000,
    stripePriceId: 'price_1RwCpoBAkas7NkkJWBn6U06u',
    userType: 'community',
    features: {
      maxHouseholds: 20,
      maxAlerts: 500,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: true,
      support: 'priority',
    },
  },

  // 介護施設・事業者向けプラン
  {
    id: 'business-starter',
    name: 'ビジネススターター',
    description: '小規模施設向け（〜30世帯）',
    price: 10000,
    stripePriceId: 'price_1RwCqXBAkas7NkkJpi3F73mx',
    userType: 'business',
    features: {
      maxHouseholds: 30,
      maxAlerts: 1000,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: true,
      support: 'priority',
    },
  },
  {
    id: 'business-pro',
    name: 'ビジネスプロ',
    description: '中規模施設向け（〜50世帯）',
    price: 20000,
    stripePriceId: 'price_1RwCqyBAkas7NkkJyffK83wn',
    userType: 'business',
    features: {
      maxHouseholds: 50,
      maxAlerts: 2000,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: true,
      support: 'priority',
    },
  },
  {
    id: 'enterprise',
    name: 'エンタープライズ',
    description: '大規模施設・カスタム対応',
    price: -1, // 要相談
    stripePriceId: undefined,
    userType: 'business',
    features: {
      maxHouseholds: -1, // 無制限
      maxAlerts: -1,
      lineNotifications: true,
      smsNotifications: true,
      voiceCalls: true,
      reports: true,
      apiAccess: true,
      support: 'priority',
    },
  },
];

// ユーザータイプに応じたプランを取得
export const getPlansByUserType = (userType: 'individual' | 'business' | 'community') => {
  return SUBSCRIPTION_PLANS.filter(plan => plan.userType === userType);
};

// プランIDから詳細を取得
export const getPlanById = (planId: string) => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};