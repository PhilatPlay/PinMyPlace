const { Xendit } = require('xendit-node');

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const xendit = XENDIT_SECRET_KEY ? new Xendit({ secretKey: XENDIT_SECRET_KEY }) : null;

/**
 * Get available payment methods per country/currency
 */
const XENDIT_PAYMENT_METHODS = {
    'PHP': 'EWALLET',  // GCash, PayMaya, GrabPay
    'IDR': 'EWALLET',  // OVO, DANA, LinkAja, ShopeePay
    'THB': 'EWALLET',  // PromptPay, TrueMoney
    'VND': 'EWALLET',  // VNPay, MoMo
    'MYR': 'EWALLET',  // Touch'n Go, GrabPay, Boost
    'SGD': 'EWALLET'   // GrabPay
};

// Specific e-wallet channel codes
const EWALLET_CHANNELS = {
    'PHP': 'PH_GCASH',
    'IDR': 'ID_OVO',
    'THB': 'TH_PROMPTPAY',
    'VND': 'VN_VNPAY',
    'MYR': 'MY_GRABPAY',
    'SGD': 'SG_GRABPAY'
};

/**
 * Create Xendit eWallet payment
 * @param {number} amount - Amount in currency
 * @param {string} currency - Currency code (PHP, IDR, THB, VND, MYR, SGD)
 * @param {string} description - Payment description
 * @param {object} metadata - Additional data
 * @param {string} successUrl - Redirect URL on success
 * @param {string} phone - Customer phone number
 */
async function createXenditPayment(amount, currency, description, metadata = {}, successUrl, phone) {
    try {
        if (!xendit) {
            return {
                success: false,
                error: 'Xendit not configured. Please add XENDIT_SECRET_KEY to .env'
            };
        }

        const referenceId = metadata.referenceNumber || `XEN-${Date.now()}`;

        // Store metadata in description (Xendit doesn't have a metadata field)
        const metadataString = JSON.stringify(metadata);
        
        // Append reference ID to success URL (Xendit doesn't auto-append like Stripe)
        const successUrlWithRef = successUrl.includes('?')
            ? `${successUrl}&ref=${referenceId}`
            : `${successUrl}?ref=${referenceId}`;

        // Use Invoice API - let Xendit show all available payment methods for that currency
        const invoice = await xendit.Invoice.createInvoice({
            data: {
                externalId: referenceId,
                amount: amount,
                currency: currency,
                payerEmail: metadata.email || `customer-${referenceId}@pinmyplace.app`,
                description: description || 'PinMyPlace Location Payment',
                successRedirectUrl: successUrlWithRef,
                // Store metadata as custom field if available
                items: [{
                    name: description,
                    quantity: metadata.quantity || 1,
                    price: metadata.unitPrice ? metadata.unitPrice : amount, // Use unit price if available
                    category: metadata.type || 'service'
                }]
                // Don't specify paymentMethods - let Xendit show all available options
            }
        });

        console.log('Xendit invoice created:', invoice);

        return {
            success: true,
            paymentLink: invoice.invoiceUrl,
            chargeId: invoice.id,
            referenceNumber: referenceId,
            metadata: metadata  // Return metadata so it can be saved
        };
    } catch (error) {
        console.error('Xendit payment creation error:', error);
        if (error.response) {
            console.error('Error response:', JSON.stringify(error.response, null, 2));
        }
        if (error.rawResponse) {
            console.error('Raw response:', JSON.stringify(error.rawResponse, null, 2));
        }
        return {
            success: false,
            error: error.errorMessage || error.message || 'Failed to create Xendit payment'
        };
    }
}/**
 * Verify Xendit payment status
 * @param {string} chargeId - Xendit invoice ID or external reference ID
 */
async function verifyXenditPayment(chargeId) {
    try {
        if (!xendit) {
            return {
                success: false,
                error: 'Xendit not configured'
            };
        }

        let invoice;
        
        // Try getting invoice by ID first
        try {
            invoice = await xendit.Invoice.getInvoiceById({
                invoiceId: chargeId
            });
        } catch (error) {
            // If that fails, it might be an external ID, try fetching by externalId
            const invoices = await xendit.Invoice.getInvoices({
                externalId: chargeId,
                limit: 1
            });
            if (invoices && invoices.length > 0) {
                invoice = invoices[0];
            } else {
                throw new Error(`No invoice found with external ID: ${chargeId}`);
            }
        }

        console.log('Xendit invoice verification:', invoice);

        // Extract metadata from items if available
        const items = invoice.items || [];
        const metadata = items.length > 0 ? {
            type: items[0].category || '',
            quantity: items[0].quantity || 0
        } : {};

        return {
            success: true,
            isPaid: invoice.status === 'PAID' || invoice.status === 'SETTLED',
            status: invoice.status,
            metadata: metadata,  // Return extracted metadata
            amount: invoice.amount,
            currency: invoice.currency,
            externalId: invoice.externalId,
            invoiceId: invoice.id
        };
    } catch (error) {
        console.error('Xendit verification error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle Xendit webhook
 * @param {object} event - Xendit webhook event
 */
function handleXenditWebhook(event) {
    try {
        // Handle invoice paid event
        if (event.status === 'PAID' || event.status === 'SETTLED') {
            return {
                type: 'payment_success',
                referenceNumber: event.external_id,
                metadata: {},
                amount: event.amount,
                currency: event.currency
            };
        }

        if (event.status === 'EXPIRED' || event.status === 'FAILED') {
            return {
                type: 'payment_failed',
                referenceNumber: event.external_id
            };
        }

        return null;
    } catch (error) {
        console.error('Xendit webhook handling error:', error.message);
        return null;
    }
}

module.exports = {
    createXenditPayment,
    verifyXenditPayment,
    handleXenditWebhook,
    XENDIT_PAYMENT_METHODS
};
