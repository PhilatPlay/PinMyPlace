const axios = require('axios');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Create GCash payment link
async function createGCashPayment(amount, description, metadata = {}) {
    try {
        const auth = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

        const response = await axios.post(
            `${PAYMONGO_API_URL}/links`,
            {
                data: {
                    attributes: {
                        amount: amount * 100, // Convert to cents
                        description: description,
                        remarks: metadata.referenceNumber || 'PinMyPlace Payment',
                        payment_method_types: ['gcash']
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            paymentLink: response.data.data.attributes.checkout_url,
            referenceNumber: response.data.data.id
        };
    } catch (error) {
        console.error('PayMongo payment creation error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.errors?.[0]?.detail || 'Failed to create payment link'
        };
    }
}

// Verify payment status
async function verifyPayment(paymentId) {
    try {
        const auth = Buffer.from(PAYMONGO_SECRET_KEY).toString('base64');

        const response = await axios.get(
            `${PAYMONGO_API_URL}/links/${paymentId}`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        const status = response.data.data.attributes.status;
        const payments = response.data.data.attributes.payments || [];

        return {
            success: true,
            isPaid: status === 'paid',
            status: status,
            paymentDetails: payments.length > 0 ? payments[0] : null
        };
    } catch (error) {
        console.error('PayMongo verification error:', error.response?.data || error.message);
        return {
            success: false,
            error: 'Failed to verify payment'
        };
    }
}

// Webhook handler for PayMongo events
function handleWebhook(event) {
    const eventType = event.data.attributes.type;

    switch (eventType) {
        case 'link.payment.paid':
            return {
                type: 'payment_success',
                referenceNumber: event.data.attributes.data.id,
                amount: event.data.attributes.data.attributes.amount / 100
            };
        case 'link.payment.failed':
            return {
                type: 'payment_failed',
                referenceNumber: event.data.attributes.data.id
            };
        default:
            return null;
    }
}

module.exports = {
    createGCashPayment,
    verifyPayment,
    handleWebhook
};
