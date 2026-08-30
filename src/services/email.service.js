const { Resend } = require('resend');

class EmailService {

    static resend =
        new Resend(
            process.env.RESEND_API_KEY
        );


    // ============================================================
    // SURPRISE CREATED
    // ============================================================

    static async sendSurpriseCreated({
        email,
        recipientName,
        publicToken,
        editToken
    }) {

        const frontendUrl =
            process.env.FRONTEND_URL;


        const publicUrl =
            `${frontendUrl}/s/${publicToken}`;


        const editUrl =
            `${frontendUrl}/e/${editToken}`;


        const { data, error } =
            await this.resend.emails.send({

                from:
                    process.env.EMAIL_FROM,

                to: [
                    email
                ],

                subject:
                    '🎁 Tu sorpresa está lista',

                html:
                    this.buildSurpriseCreatedEmail({
                        recipientName,
                        publicUrl,
                        editUrl
                    })
            });


        if (error) {

            console.error(
                'Unable to send surprise email:',
                error
            );

            throw new Error(
                'EMAIL_SEND_FAILED'
            );
        }


        return data;
    }


    // ============================================================
    // TEMPLATE
    // ============================================================

    static buildSurpriseCreatedEmail({
        recipientName,
        publicUrl,
        editUrl
    }) {

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
                    ${this.escapeHtml(recipientName)}
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


            <!-- EDIT -->

            <div
                style="
                    margin-top:15px;
                "
            >

                <a
                    href="${editUrl}"
                    style="
                        display:inline-block;
                        padding:14px 25px;
                        background:#f4e5ea;
                        color:#a52d50;
                        text-decoration:none;
                        border-radius:12px;
                        font-size:15px;
                        font-weight:bold;
                    "
                >
                    ✏️ Editar mi sorpresa
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


    // ============================================================
    // SECURITY
    // ============================================================

    static escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}


module.exports = EmailService;