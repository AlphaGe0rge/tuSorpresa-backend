const axios = require('axios');

class EmailService {

    static apiUrl = 'https://api.brevo.com/v3/smtp/email';

    static async sendEmail({ email, subject, html, attachments = [], replyTo }) {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    sender: this.getSender(),
                    to: [{ email }],
                    subject,
                    htmlContent: html,
                    ...(replyTo ? { replyTo } : {}),
                    ...(attachments.length ? { attachment: attachments } : {})
                },
                {
                    headers: {
                        'api-key': process.env.BREVO_API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data;
        } catch (error) {
            console.error('Brevo email error:', error.response?.data || error.message);

            throw new Error('EMAIL_SEND_FAILED');
        }
    }

    static getSender() {
        const sender = process.env.EMAIL_FROM;

        // Formato esperado: Nombre <correo@dominio.com>
        const match = sender?.match(/^(.*?)\s*<([^<>]+)>$/);

        if (match) {
            return {
                name: match[1].trim(),
                email: match[2].trim()
            };
        }

        if (sender && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender)) {
            return { email: sender };
        }

        throw new Error('INVALID_EMAIL_FROM');
    }

    static async sendEmailVerification({ email, name, verificationToken }) {

        const frontendUrl = process.env.FRONTEND_URL;

        const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;

        return this.sendEmail({
            email,
            subject: '💌 Verifica tu correo en TuSorpresa',
            html: this.buildEmailVerificationEmail({
                name,
                verificationUrl
            })
        });
    }

    // EMAIL VERIFICATION TEMPLATE
    static buildEmailVerificationEmail({name, verificationUrl}) {

        return `
            <!DOCTYPE html>

            <html lang="es">

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

                <title>
                    Verifica tu correo
                </title>

            </head>


            <body
                style="
                    margin:0;
                    padding:0;
                    background:#fff4f7;
                    font-family:Arial,Helvetica,sans-serif;
                    color:#2b1b22;
                "
            >

                <div
                    style="
                        max-width:620px;
                        margin:0 auto;
                        padding:40px 20px;
                    "
                >

                    <div
                        style="
                            background:#ffffff;
                            border-radius:24px;
                            padding:40px 30px;
                            text-align:center;
                            box-shadow:
                                0 15px 50px
                                rgba(120,30,60,0.12);
                        "
                    >

                        <div
                            style="
                                font-size:42px;
                                margin-bottom:15px;
                            "
                        >
                            💌
                        </div>


                        <h1
                            style="
                                margin:0 0 15px;
                                font-size:32px;
                                color:#c73562;
                            "
                        >
                            ¡Bienvenido a TuSorpresa!
                        </h1>


                        <p
                            style="
                                font-size:17px;
                                line-height:1.6;
                                color:#5f4b53;
                            "
                        >
                            Hola,
                            <strong>
                                ${this.escapeHtml(name)}
                            </strong>.
                        </p>


                        <p
                            style="
                                font-size:16px;
                                line-height:1.7;
                                color:#6b5961;
                            "
                        >
                            Gracias por crear tu cuenta.
                            Para comenzar a utilizar todas las
                            funciones de TuSorpresa, necesitamos
                            confirmar que este correo electrónico
                            te pertenece.
                        </p>


                        <!-- VERIFY -->

                        <div
                            style="
                                margin-top:30px;
                            "
                        >

                            <a
                                href="${verificationUrl}"
                                style="
                                    display:inline-block;
                                    padding:15px 28px;
                                    background:#d94670;
                                    color:#ffffff;
                                    text-decoration:none;
                                    border-radius:12px;
                                    font-size:16px;
                                    font-weight:bold;
                                "
                            >
                                💖 Verificar mi correo
                            </a>

                        </div>


                        <!-- INFORMATION -->

                        <div
                            style="
                                margin-top:35px;
                                padding-top:25px;
                                border-top:1px solid #f0dce3;
                            "
                        >

                            <p
                                style="
                                    margin:0;
                                    font-size:13px;
                                    line-height:1.6;
                                    color:#8c7b82;
                                "
                            >
                                Este enlace es personal y tiene
                                una duración limitada por seguridad.
                            </p>

                        </div>


                        <!-- FALLBACK URL -->

                        <div
                            style="
                                margin-top:25px;
                                padding:15px;
                                background:#fff7f9;
                                border-radius:12px;
                                word-break:break-word;
                            "
                        >

                            <p
                                style="
                                    margin:0 0 8px;
                                    font-size:12px;
                                    color:#8c7b82;
                                "
                            >
                                Si el botón no funciona, copia y
                                pega este enlace en tu navegador:
                            </p>

                            <a
                                href="${verificationUrl}"
                                style="
                                    font-size:12px;
                                    color:#a52d50;
                                    text-decoration:none;
                                "
                            >
                                ${this.escapeHtml(verificationUrl)}
                            </a>

                        </div>

                    </div>


                    <p
                        style="
                            margin-top:25px;
                            text-align:center;
                            font-size:12px;
                            color:#a08e95;
                        "
                    >
                        Este correo fue enviado automáticamente.
                        Si no creaste una cuenta en TuSorpresa,
                        puedes ignorar este mensaje.
                    </p>

                </div>

            </body>

            </html>
        `;
    }

    static async sendSurpriseCreated({email, recipientName, senderName, publicToken, editToken, qrBuffer}) {

        const frontendUrl = process.env.FRONTEND_URL;

        const publicUrl = `${frontendUrl}/sorpresa/${publicToken}`;
        const editUrl = `${frontendUrl}/editar/${editToken}`;

        return this.sendEmail({
            email,
            subject: '🎁 Tu sorpresa está lista',
            html: this.buildSurpriseCreatedEmail({
                recipientName,
                senderName,
                publicUrl,
                editUrl
            }),
            attachments: qrBuffer
                ? [{
                    name: 'qr-tu-sorpresa.png',
                    content: qrBuffer.toString('base64')
                }]
                : []
        });
    }

    static buildSurpriseCreatedEmail({senderName, publicUrl, editUrl}) {

        return `
            <!DOCTYPE html>

            <html lang="es">

                <head>

                    <meta charset="UTF-8">

                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    >

                    <title>
                        Tu sorpresa está lista
                    </title>

                </head>


                <body
                    style="
                        margin:0;
                        padding:0;
                        background:#fff4f7;
                        font-family:Arial,Helvetica,sans-serif;
                        color:#2b1b22;
                    "
                >

                    <div
                        style="
                            max-width:620px;
                            margin:0 auto;
                            padding:40px 20px;
                        "
                    >

                        <div
                            style="
                                background:#ffffff;
                                border-radius:24px;
                                padding:40px 30px;
                                text-align:center;
                                box-shadow:
                                    0 15px 50px
                                    rgba(120,30,60,0.12);
                            "
                        >

                            <div
                                style="
                                    font-size:42px;
                                    margin-bottom:15px;
                                "
                            >
                                💌
                            </div>


                            <h1
                                style="
                                    margin:0 0 15px;
                                    font-size:32px;
                                    color:#c73562;
                                "
                            >
                                ¡Tu sorpresa está lista!
                            </h1>


                            <p
                                style="
                                    font-size:17px;
                                    line-height:1.6;
                                    color:#5f4b53;
                                "
                            >
                                Hola,
                                <strong>
                                    ${this.escapeHtml(senderName)}
                                </strong>.
                            </p>


                            <p
                                style="
                                    font-size:16px;
                                    line-height:1.7;
                                    color:#6b5961;
                                "
                            >
                                Tu página personalizada fue creada
                                correctamente.
                                Guarda este correo porque aquí tienes
                                los enlaces para acceder a ella.
                            </p>


                            <!-- VIEW -->

                            <div
                                style="
                                    margin-top:30px;
                                "
                            >

                                <a
                                    href="${publicUrl}"
                                    style="
                                        display:inline-block;
                                        padding:15px 28px;
                                        background:#d94670;
                                        color:#ffffff;
                                        text-decoration:none;
                                        border-radius:12px;
                                        font-size:16px;
                                        font-weight:bold;
                                    "
                                >
                                    💖 Ver mi sorpresa
                                </a>

                            </div>

                            <div
                                style="
                                    margin-top:35px;
                                    padding-top:25px;
                                    border-top:1px solid #f0dce3;
                                "
                            >

                                <p
                                    style="
                                        margin:0;
                                        font-size:13px;
                                        line-height:1.6;
                                        color:#8c7b82;
                                    "
                                >
                                    Guarda especialmente el enlace
                                    de edición. Lo necesitarás si
                                    quieres modificar tu sorpresa
                                    posteriormente.
                                </p>

                            </div>

                        </div>


                        <p
                            style="
                                margin-top:25px;
                                text-align:center;
                                font-size:12px;
                                color:#a08e95;
                            "
                        >
                            Este correo fue enviado automáticamente.
                        </p>

                    </div>

                </body>

            </html>
        `;
    }

    static escapeHtml(value) {

        return String(value ?? '').replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(/'/g, '&#039;');
    }

    
    static async sendContactMessage({to, name, email, reason, orderReference, subject, message}) {
        
        const reasonLabels = {
            purchase: 'Compra o pago',
            experience: 'Mi experiencia digital',
            refund: 'Devolución o reembolso',
            privacy: 'Privacidad y datos personales',
            other: 'Otra consulta'
        };

        const safeName = this.escapeHtml(name);
        const safeEmail = this.escapeHtml(email);
        const safeReason = this.escapeHtml(reasonLabels[reason] || reason);
        const safeReference = this.escapeHtml(orderReference || 'No indicada');
        const safeSubject = this.escapeHtml(subject || 'Consulta general');
        const safeMessage = this.escapeHtml(message).replace(/\r?\n/g, '<br>');

        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nueva consulta de contacto</title>
            </head>
            <body style="margin:0;padding:24px;background:#fff4f7;font-family:Arial,sans-serif;color:#302128;">
                <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #f0dfe5;border-radius:16px;padding:28px;">
                    <p style="color:#9b6177;font-size:12px;font-weight:bold;letter-spacing:2px;">
                        TUSORPRESADIGITAL
                    </p>

                    <h1 style="color:#302128;font-size:24px;">
                        Nueva consulta de contacto
                    </h1>

                    <p><strong>Nombre:</strong> ${safeName}</p>
                    <p><strong>Correo:</strong> ${safeEmail}</p>
                    <p><strong>Motivo:</strong> ${safeReason}</p>
                    <p><strong>Referencia:</strong> ${safeReference}</p>
                    <p><strong>Asunto:</strong> ${safeSubject}</p>

                    <div style="margin-top:22px;padding:18px;background:#fff7f9;border-radius:12px;">
                        <p style="font-weight:bold;">Mensaje</p>
                        <p style="line-height:1.7;overflow-wrap:anywhere;">
                            ${safeMessage}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return this.sendEmail({
            email: to,
            subject: `[Contacto TuSorpresaDigital] ${subject || reasonLabels[reason] || 'Consulta'}`,
            html,
            replyTo: {
                email,
                name
            }
        });
    }

}


module.exports = EmailService;