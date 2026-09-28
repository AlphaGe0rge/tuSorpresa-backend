const crypto = require('crypto');
const axios = require('axios');

class WompiService {

    // ============================================================
    // CONFIGURATION
    // ============================================================

    static getBaseUrl() {

        if (process.env.WOMPI_BASE_URL) {
            return process.env.WOMPI_BASE_URL;
        }

        if (
            process.env.WOMPI_ENV === 'production'
        ) {
            return 'https://production.wompi.co/v1';
        }

        return 'https://sandbox.wompi.co/v1';
    }


    // ============================================================
    // INTEGRITY SIGNATURE
    // ============================================================

    static generateIntegritySignature({
        reference,
        amountInCents,
        currency = 'COP'
    }) {

        if (
            !reference ||
            !amountInCents ||
            !currency
        ) {
            throw new Error(
                'INVALID_WOMPI_SIGNATURE_DATA'
            );
        }

        const value =
            `${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`;

        return crypto
            .createHash('sha256')
            .update(value)
            .digest('hex');
    }


    // ============================================================
    // EVENT SIGNATURE
    // ============================================================

    static validateEventSignature(event) {

        const properties =
            event?.signature?.properties;

        const checksum =
            event?.signature?.checksum;

        const timestamp =
            event?.timestamp;

        const secret =
            process.env.WOMPI_EVENTS_SECRET;


        if (
            !Array.isArray(properties) ||
            !properties.length ||
            !checksum ||
            !timestamp ||
            !secret
        ) {
            return false;
        }


        const transaction =
            event?.data?.transaction;


        if (!transaction) {
            return false;
        }


        const values = properties.map(
            property => {

                const parts =
                    property.split('.');

                let value =
                    event.data;

                for (
                    const part
                    of parts
                ) {

                    value =
                        value?.[part];
                }

                return value ?? '';
            }
        );


        const concatenated =
            values.join('') +
            timestamp +
            secret;


        const calculated =
            crypto
                .createHash('sha256')
                .update(concatenated)
                .digest('hex');


        return this.safeCompare(
            calculated,
            checksum
        );
    }


    // ============================================================
    // OPTIONAL HEADER VALIDATION
    // ============================================================

    static validateEventHeader(
        event,
        headerChecksum
    ) {

        if (!headerChecksum) {
            return true;
        }

        const bodyChecksum =
            event?.signature?.checksum;

        if (!bodyChecksum) {
            return false;
        }

        return this.safeCompare(
            bodyChecksum,
            headerChecksum
        );
    }


    // ============================================================
    // SAFE STRING COMPARISON
    // ============================================================

    static safeCompare(
        first,
        second
    ) {

        if (
            typeof first !== 'string' ||
            typeof second !== 'string'
        ) {
            return false;
        }

        const firstBuffer =
            Buffer.from(first);

        const secondBuffer =
            Buffer.from(second);

        if (
            firstBuffer.length !==
            secondBuffer.length
        ) {
            return false;
        }

        return crypto.timingSafeEqual(
            firstBuffer,
            secondBuffer
        );
    }


    // ============================================================
    // GET TRANSACTION
    // ============================================================

    static async getTransaction(
        transactionId
    ) {

        if (!transactionId) {
            throw new Error(
                'WOMPI_TRANSACTION_ID_REQUIRED'
            );
        }


        try {

            const response =
                await axios.get(
                    `${this.getBaseUrl()}/transactions/${encodeURIComponent(transactionId)}`,
                    {
                        headers: {
                            Accept:
                                'application/json',

                            Authorization:
                                `Bearer ${process.env.WOMPI_PRIVATE_KEY}`
                        },

                        timeout: 10000
                    }
                );


            return response.data?.data;

        } catch (error) {

            console.error(
                'Wompi get transaction error:',
                error.response?.data ||
                error.message
            );

            throw new Error(
                'WOMPI_TRANSACTION_QUERY_FAILED'
            );
        }
    }
}


module.exports = WompiService;