const Stripe = require('stripe');

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
    'USD': 'usd'
};

/**
 * Create Stripe payment session for multi-currency support
 * @param {number} amount - Amount in currency's smallest unit (e.g., cents, sen)
 * @param {string} currency - Currency code (PHP, MYR, SGD, etc.)
 * @param {string} description - Payment description
 * @param {object} metadata - Additional data to store with payment
 * @param {string} successUrl - URL to redirect after success
 * @param {string} cancelUrl - URL to redirect if cancelled
 */
async function createStripePayment(amount, currency, description, metadata = {}, successUrl, cancelUrl) {
    try {
        if (!stripe) {
            console.error('Stripe not configured');
            return {
                success: false,
                error: 'Stripe payment system not configured. Please add STRIPE_SECRET_KEY to .env file'
            };
        }

        const stripeCurrency = STRIPE_CURRENCY_MAP[currency] || 'usd';

        // Build success URL with session_id parameter
        // Stripe will replace {CHECKOUT_SESSION_ID} with actual session ID
        const successUrlWithRef = `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;

        // Payment methods available based on currency
        // Note: GCash and PayMaya require Stripe Connect in Philippines
        const paymentMethods = ['card']; // Cards available everywhere
        
        // Add valid e-wallets based on currency
        if (currency === 'PHP') {
            paymentMethods.push('grabpay'); // GCash/PayMaya require special setup
        } else if (currency === 'MYR') {
            paymentMethods.push('fpx', 'grabpay');
        } else if (currency === 'SGD') {
            paymentMethods.push('paynow', 'grabpay');
        } else if (currency === 'THB') {
            paymentMethods.push('promptpay');
        } else if (currency === 'IDR') {
            paymentMethods.push('grabpay'); // Available in Indonesia too
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: paymentMethods,
            line_items: [
                {
                    price_data: {
                        currency: stripeCurrency,
                        product_data: {
                            name: 'PinMyPlace GPS Pin',
                            description: description,
                        },
                        unit_amount: Math.round(amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrlWithRef,
            cancel_url: cancelUrl,
            metadata: metadata,
            client_reference_id: metadata.referenceNumber || `STRIPE-${Date.now()}`,
        });

        return {
            success: true,
            paymentLink: session.url,
            sessionId: session.id,
            referenceNumber: session.client_reference_id
        };
    } catch (error) {
        console.error('Stripe payment creation error:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to create Stripe payment session'
        };
    }
}

/**
 * Verify Stripe payment status
 * @param {string} sessionId - Stripe session ID
 */
async function verifyStripePayment(sessionId) {
    try {
        if (!stripe) {
            return {
                success: false,
                error: 'Stripe not configured'
            };
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return {
            success: true,
            isPaid: session.payment_status === 'paid',
            status: session.payment_status,
            metadata: session.metadata || {},
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase()
        };
    } catch (error) {
        console.error('Stripe verification error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle Stripe webhook events
 * @param {object} event - Stripe webhook event
 */
function handleStripeWebhook(event) {
    try {
        const eventType = event.type;

        if (eventType === 'checkout.session.completed') {
            const session = event.data.object;
            return {
                type: 'payment_success',
                referenceNumber: session.client_reference_id,
                metadata: session.metadata,
                amount: session.amount_total / 100,
                currency: session.currency.toUpperCase()
            };
        }

        if (eventType === 'checkout.session.expired') {
            const session = event.data.object;
            return {
                type: 'payment_expired',
                referenceNumber: session.client_reference_id
            };
        }

        return null;
    } catch (error) {
        console.error('Stripe webhook handling error:', error.message);
        return null;
    }
}

module.exports = {
    createStripePayment,
    verifyStripePayment,
    handleStripeWebhook
};
