
const EmailService = require('../services/email.service');

const MAX_LENGTH = {
    name: 100,
    email: 254,
    reason: 30,
    orderReference: 120,
    subject: 150,
    message: 5000
};

const ALLOWED_REASONS = new Set([
    'purchase',
    'experience',
    'refund',
    'privacy',
    'other'
]);

function cleanString(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.createContactMessage = async (req, res) => {
    const name = cleanString(req.body?.name, MAX_LENGTH.name);
    const email = cleanString(req.body?.email, MAX_LENGTH.email).toLowerCase();
    const reason = cleanString(req.body?.reason, MAX_LENGTH.reason);
    const orderReference = cleanString(req.body?.orderReference, MAX_LENGTH.orderReference);
    const subject = cleanString(req.body?.subject, MAX_LENGTH.subject);
    const message = cleanString(req.body?.message, MAX_LENGTH.message);
    const privacyAccepted = req.body?.privacyAccepted === true;

    if (!name || !email || !message) {
        return res.status(400).json({
            message: 'Nombre, correo y mensaje son obligatorios.'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'El correo electrónico no es válido.'
        });
    }

    if (!ALLOWED_REASONS.has(reason)) {
        return res.status(400).json({
            message: 'El motivo de consulta no es válido.'
        });
    }

    if (!privacyAccepted) {
        return res.status(400).json({
            message: 'Debes aceptar el tratamiento de datos.'
        });
    }

    const supportEmail = process.env.WORKSPACE_EMAIL;

    if (!supportEmail || !process.env.WORKSPACE_APP_PASSWORD) {
        return res.status(500).json({
            message: 'El servicio de contacto no está configurado.'
        });
    }

    try {
        await EmailService.sendContactMessage({
            to: supportEmail,
            name,
            email,
            reason,
            orderReference,
            subject,
            message
        });

        return res.status(200).json({
            message: 'Tu mensaje fue enviado correctamente.'
        });
    } catch (error) {
        console.error('Error enviando consulta de contacto:', error.message);

        return res.status(502).json({
            message: 'No fue posible enviar el mensaje en este momento.'
        });
    }
};
