import Stripe from 'stripe';
import { logger } from '../utils/logger.js';
import { getCurrentRequestId } from '../middleware/requestId.js';

class StripeService {
  constructor() {
    this.secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.isConfigured = false;
    
    if (this.secretKey) {
      this.stripe = new Stripe(this.secretKey, {
        apiVersion: '2023-10-16',
        telemetry: false,
      });
      this.isConfigured = true;
      logger.info('Stripe service initialized');
    } else {
      logger.warn('Stripe not configured - using stub mode');
    }
  }

  /**
   * Checkout Session を作成
   */
  async createCheckoutSession({ priceId, successUrl, cancelUrl, customerId, metadata }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
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
      logger.info('Creating Stripe checkout session', {
        priceId,
        customerId,
        metadata,
        requestId,
        provider: 'stripe'
      });

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer: customerId,
        metadata: metadata || {},
        locale: 'ja',
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
   * 顧客を作成
   */
  async createCustomer({ email, name, metadata }) {
    const startTime = Date.now();
    const requestId = getCurrentRequestId();
    
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
        requestId,
        provider: 'stripe'
      });

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: metadata || {},
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
}

export const stripeService = new StripeService();