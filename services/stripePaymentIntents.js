const Stripe = require('stripe');

// Same Stripe account as main, just using Payment Intents API for LATAM currencies
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

// Stripe currency mapping (lowercase for Stripe API)
const STRIPE_CURRENCY_MAP = {
    'PHP': 'php',
    'MYR': 'myr',
    'SGD': 'sgd',
    'THB': 'thb',
    'IDR': 'idr',
    'VND': 'vnd',
    'USD': 'usd',
    'HKD': 'hkd',
    // Latin America
    'MXN': 'mxn',
    'BRL': 'brl',
    'COP': 'cop',
    'ARS': 'ars'
};

/**
 * Get available payment method types for a currency using Payment Intents API
 * @param {string} currency - Currency code (PHP, MYR, SGD, etc.)
 * @returns {Array<string>} - Array of payment method types
 */
function getPaymentMethodTypes(currency) {
    const methods = {
        // Southeast Asia
        'PHP': ['card', 'paymaya', 'grabpay'], // GCash via Stripe Connect if available
        'MYR': ['card', 'fpx', 'grabpay'],
        'SGD': ['card', 'paynow', 'grabpay'],
        'THB': ['card', 'promptpay'],
        'IDR': ['card', 'grabpay'],
        'VND': ['card'],
        'HKD': ['card'],
        
        // Latin America - Cards only (OXXO/Boleto require regional Stripe account)
        'MXN': ['card'],
        'BRL': ['card'],
        'COP': ['card'],
        'ARS': ['card'],
        
        // Default
        'USD': ['card']
    };
    
    return methods[currency] || ['card'];
}

/**
 * Create a Payment Intent for LATAM and SEA currencies
 * Cards only for LATAM (local methods require regional Stripe account)
 * 
 * @param {number} amount - Amount in currency's smallest unit (e.g., cents, centavos)
 * @param {string} currency - Currency code (MXN, BRL, COP, ARS, etc.)
 * @param {string} description - Payment description
 * @param {object} metadata - Additional data to store with payment
 * @param {string} customerEmail - Customer email for receipt
 * @param {string} returnUrl - URL to redirect after payment completion
 */
async function createPaymentIntent(amount, currency, description, metadata = {}, customerEmail = null, returnUrl) {
    try {
        if (!stripe) {
            console.error('Stripe not configured');
            return {
                success: false,
                error: 'Stripe payment system not configured. Please add STRIPE_SECRET_KEY to .env file'
            };
        }

        const stripeCurrency = STRIPE_CURRENCY_MAP[currency] || 'usd';
        const paymentMethodTypes = getPaymentMethodTypes(currency);
        
        // Create Payment Intent
        const paymentIntentParams = {
            amount: Math.round(amount * 100), // Convert to cents/centavos
            currency: stripeCurrency,
            payment_method_types: paymentMethodTypes,
            description: description,
            metadata: {
                ...metadata,
                currency: currency,
                description: description
            }
        };

        // Add customer email if provided (required for some payment methods)
        if (customerEmail) {
            paymentIntentParams.receipt_email = customerEmail;
        }

        // Create the Payment Intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            paymentMethodTypes: paymentIntent.payment_method_types,
            status: paymentIntent.status
        };
    } catch (error) {
        console.error('Payment Intent creation error:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to create payment intent'
        };
    }
}

/**
 * Retrieve a Payment Intent by ID
 * @param {string} paymentIntentId - The Payment Intent ID
 */
async function retrievePaymentIntent(paymentIntentId) {
    try {
        if (!stripe) {
            return { success: false, error: 'Stripe not configured' };
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        return {
            success: true,
            paymentIntent: {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                paymentMethod: paymentIntent.payment_method,
                metadata: paymentIntent.metadata,
                charges: paymentIntent.charges?.data || []
            }
        };
    } catch (error) {
        console.error('Payment Intent retrieval error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Confirm a Payment Intent (for server-side confirmation)
 * @param {string} paymentIntentId - The Payment Intent ID
 * @param {string} paymentMethodId - The Payment Method ID
 */
async function confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
        if (!stripe) {
            return { success: false, error: 'Stripe not configured' };
        }

        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethodId
        });
        
        return {
            success: true,
            status: paymentIntent.status,
            paymentIntent: paymentIntent
        };
    } catch (error) {
        console.error('Payment Intent confirmation error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Verify webhook signature for Payment Intent events
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 */
function verifyWebhookSignature(payload, signature) {
    try {
        if (!stripe) {
            throw new Error('Stripe not configured');
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET_TEST;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET or STRIPE_WEBHOOK_SECRET_TEST not configured');
        }

        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        return { success: true, event };
    } catch (error) {
        console.error('Webhook signature verification failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Handle Payment Intent webhook events
 * @param {object} event - Stripe webhook event
 */
async function handlePaymentIntentWebhook(event) {
    try {
        const paymentIntent = event.data.object;
        
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
                return {
                    success: true,
                    status: 'succeeded',
                    paymentIntentId: paymentIntent.id,
                    metadata: paymentIntent.metadata
                };
                
            case 'payment_intent.payment_failed':
                console.log(`❌ Payment failed: ${paymentIntent.id}`);
                return {
                    success: false,
                    status: 'failed',
                    paymentIntentId: paymentIntent.id,
                    error: paymentIntent.last_payment_error?.message
                };
                
            case 'payment_intent.processing':
                console.log(`⏳ Payment processing: ${paymentIntent.id}`);
                return {
                    success: true,
                    status: 'processing',
                    paymentIntentId: paymentIntent.id
                };
                
            case 'payment_intent.canceled':
                console.log(`🚫 Payment canceled: ${paymentIntent.id}`);
                return {
                    success: false,
                    status: 'canceled',
                    paymentIntentId: paymentIntent.id
                };
                
            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
                return { success: true, status: 'unhandled' };
        }
    } catch (error) {
        console.error('Webhook handling error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    createPaymentIntent,
    retrievePaymentIntent,
    confirmPaymentIntent,
    verifyWebhookSignature,
    handlePaymentIntentWebhook,
    getPaymentMethodTypes
};
