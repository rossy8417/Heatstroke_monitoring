import Stripe from 'stripe';
import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from '../middleware/requestId.js';
import crypto from 'crypto';

class StripeService {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.isConfigured = false;
    
    // 環境変数から価格IDを取得
    this.priceIds = {
      basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_dev',
      premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_dev',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_dev'
    };
    
    // 本番環境の価格IDマッピング
    if (process.env.NODE_ENV === 'production') {
      this.priceIds = {
        basic: process.env.STRIPE_PRICE_BASIC || 'price_1QZBJzKzqAqEGQ55N5VCHQTW',
        premium: process.env.STRIPE_PRICE_PREMIUM || 'price_1QZBJzKzqAqEGQ55G4VF2DGB',
        enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1QZBJzKzqAqEGQ55YR5GHIJQ'
      };
    }
    
    if (this.secretKey) {
      this.stripe = new Stripe(this.secretKey, {
        apiVersion: '2023-10-16',
        telemetry: false,
      });
      this.isConfigured = true;
      logger.info('Stripe service initialized', {
        environment: process.env.NODE_ENV,
        priceIds: this.priceIds
      });
    } else {
      logger.warn('Stripe not configured - using stub mode');
    }
  }

  /**
   * Idempotency Keyを生成
   */
  generateIdempotencyKey(prefix = 'stripe') {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 価格IDを取得（プラン名から）
   */
  getPriceId(planName) {
    return this.priceIds[planName] || planName;
  }

  /**
   * Checkout Session を作成（Idempotency Key付き）
   */
  async createCheckoutSession({ priceId, successUrl, cancelUrl, customerId, metadata, idempotencyKey }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    const finalIdempotencyKey = idempotencyKey || this.generateIdempotencyKey('checkout');
    
    if (!this.isConfigured) {
      logger.warn('Stripe not configured - returning stub session', { requestId });
      return {
        success: true,
        sessionId: `stub_cs_${Date.now()}`,
        url: successUrl,
        stub: true
      };
    }

    try {
      // プラン名から価格IDを解決
      const resolvedPriceId = this.getPriceId(priceId);
      
      logger.info('Creating Stripe checkout session', {
        priceId: resolvedPriceId,
        customerId,
        metadata,
        idempotencyKey: finalIdempotencyKey,
        requestId,
        provider: 'stripe'
      });

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: resolvedPriceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        metadata: {
          ...metadata,
          idempotency_key: finalIdempotencyKey
        },
        locale: 'ja',
      }, {
        idempotencyKey: finalIdempotencyKey
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('Checkout session created successfully', {
        sessionId: session.id,
        duration_ms,
        provider: 'stripe',
        status: 'success',
        requestId
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to create checkout session', {
        error: error.message,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Customer Portal Session を作成
   */
  async createPortalSession({ customerId, returnUrl }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      logger.warn('Stripe not configured - returning stub portal', { requestId });
      return {
        success: true,
        url: returnUrl,
        stub: true
      };
    }

    try {
      logger.info('Creating Stripe portal session', {
        customerId,
        requestId,
        provider: 'stripe'
      });

      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        locale: 'ja',
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('Portal session created successfully', {
        sessionId: session.id,
        duration_ms,
        provider: 'stripe',
        status: 'success',
        requestId
      });

      return {
        success: true,
        url: session.url
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to create portal session', {
        error: error.message,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * サブスクリプションを取得
   */
  async getSubscription(subscriptionId) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured'
      };
    }

    try {
      logger.info('Fetching subscription', {
        subscriptionId,
        requestId,
        provider: 'stripe'
      });

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      const duration_ms = Date.now() - startTime;
      
      logger.info('Subscription fetched successfully', {
        subscriptionId,
        status: subscription.status,
        duration_ms,
        provider: 'stripe',
        requestId
      });

      return {
        success: true,
        subscription
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to fetch subscription', {
        error: error.message,
        subscriptionId,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * サブスクリプションをキャンセル
   */
  async cancelSubscription(subscriptionId, immediately = false) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured'
      };
    }

    try {
      logger.info('Canceling subscription', {
        subscriptionId,
        immediately,
        requestId,
        provider: 'stripe'
      });

      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediately,
      });

      if (immediately) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      }

      const duration_ms = Date.now() - startTime;
      
      logger.info('Subscription canceled successfully', {
        subscriptionId,
        immediately,
        duration_ms,
        provider: 'stripe',
        status: 'success',
        requestId
      });

      return {
        success: true,
        subscription
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to cancel subscription', {
        error: error.message,
        subscriptionId,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Webhook署名を検証
   */
  verifyWebhookSignature(payload, signature) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
    if (!this.isConfigured || !this.webhookSecret) {
      logger.warn('Stripe webhook verification skipped', { requestId });
      return null;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      const duration_ms = Date.now() - startTime;
      
      logger.info('Webhook signature verified', {
        eventType: event.type,
        eventId: event.id,
        duration_ms,
        provider: 'stripe',
        requestId
      });

      return event;
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Webhook signature verification failed', {
        error: error.message,
        duration_ms,
        provider: 'stripe',
        requestId
      });

      return null;
    }
  }

  /**
   * 顧客を作成（Idempotency Key付き）
   */
  async createCustomer({ email, name, metadata, idempotencyKey }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    const finalIdempotencyKey = idempotencyKey || this.generateIdempotencyKey('customer');
    
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured'
      };
    }

    try {
      logger.info('Creating Stripe customer', {
        email,
        name,
        idempotencyKey: finalIdempotencyKey,
        requestId,
        provider: 'stripe'
      });

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          idempotency_key: finalIdempotencyKey
        },
      }, {
        idempotencyKey: finalIdempotencyKey
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('Customer created successfully', {
        customerId: customer.id,
        duration_ms,
        provider: 'stripe',
        status: 'success',
        requestId
      });

      return {
        success: true,
        customerId: customer.id
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      logger.error('Failed to create customer', {
        error: error.message,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 支払い意図を作成（Idempotency Key付き）
   */
  async createPaymentIntent({ amount, currency = 'jpy', customerId, metadata, idempotencyKey }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    const finalIdempotencyKey = idempotencyKey || this.generateIdempotencyKey('payment');
    
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Stripe not configured'
      };
    }

    try {
      logger.info('Creating payment intent', {
        amount,
        currency,
        customerId,
        idempotencyKey: finalIdempotencyKey,
        requestId,
        provider: 'stripe'
      });

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata: {
          ...metadata,
          idempotency_key: finalIdempotencyKey
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: finalIdempotencyKey
      });

      const duration_ms = Date.now() - startTime;
      
      logger.info('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        amount,
        duration_ms,
        provider: 'stripe',
        status: 'success',
        requestId
      });

      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      const duration_ms = Date.now() - startTime;
      
      // Idempotency conflict をハンドル
      if (error.type === 'idempotency_error') {
        logger.warn('Idempotency conflict detected', {
          idempotencyKey: finalIdempotencyKey,
          error: error.message,
          duration_ms,
          provider: 'stripe',
          requestId
        });
        
        return {
          success: false,
          error: 'Duplicate request detected',
          idempotencyConflict: true
        };
      }
      
      logger.error('Failed to create payment intent', {
        error: error.message,
        duration_ms,
        provider: 'stripe',
        status: 'failed',
        requestId
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 利用可能な価格IDのリストを取得
   */
  getAvailablePrices() {
    return this.priceIds;
  }
}

export const stripeService = new StripeService();