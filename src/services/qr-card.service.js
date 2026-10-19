
const QRCode = require('qrcode');
const sharp = require('sharp');

class QrCardService {
    static getTheme(template) {
        const themes = {
            'birthday-01': {
                title: 'FELIZ CUMPLEAÑOS',
                subtitle: 'Hoy celebramos a alguien muy especial',
                accent: '#e7476d',
                background: '#fff2f5',
                text: '#351b24',
                muted: '#856a73',
                frame: '#f2b7c5',
                decorationType: 'birthday',
                eyebrow: 'UN DÍA PARA CELEBRAR'
            },
            'love-01': {
                title: 'LOS LAZOS DEL DESTINO',
                subtitle: 'Hay encuentros que parecen escritos por el destino',
                accent: '#e7476d',
                background: '#fff3f6',
                text: '#351b24',
                muted: '#856a73',
                frame: '#f1c4cf',
                decorationType: 'destiny-ribbons',
                eyebrow: 'HECHO CON CARIÑO'
            },
            'love-02': {
                title: 'UNA HISTORIA DE AMOR',
                subtitle: 'Como un árbol, nuestro amor sigue creciendo',
                accent: '#c83d63',
                background: '#fff5f7',
                text: '#351b24',
                muted: '#856a73',
                frame: '#e8bdc8',
                decorationType: 'tree-of-love',
                eyebrow: 'HECHO CON CARIÑO'
            },
            'love-03': {
                title: 'UNA CARTA PARA TI',
                subtitle: 'Una pequeña sorpresa hecha con cariño',
                accent: '#b83259',
                background: '#fff6f8',
                text: '#351b24',
                muted: '#856a73',
                frame: '#e9b8c6',
                decorationType: 'love-letter',
                eyebrow: 'HECHO CON CARIÑO'
            },
            'anniversary-01': {
                title: 'NUESTRO ANIVERSARIO',
                subtitle: 'Celebremos cada recuerdo y todo lo que nos une',
                accent: '#b76b72',
                background: '#fff8f4',
                text: '#3d292d',
                muted: '#88716f',
                frame: '#dfc2a5',
                decorationType: 'anniversary',
                eyebrow: 'UN RECUERDO PARA SIEMPRE'
            },
            'invitation-01': {
                title: 'TIENES UNA INVITACIÓN',
                subtitle: 'Hay un momento especial esperando por ti',
                accent: '#b08a4a',
                background: '#fbf8f0',
                text: '#30291f',
                muted: '#82755f',
                frame: '#e4d3ac',
                decorationType: 'invitation',
                eyebrow: 'UNA INVITACIÓN ESPECIAL'
            },
            'friendship-01': {
                title: 'PARA UN GRAN AMIGO',
                subtitle: 'Las mejores historias se comparten con amigos',
                accent: '#5c8d9e',
                background: '#f2f9fa',
                text: '#25373c',
                muted: '#6d858b',
                frame: '#b9d6dc',
                decorationType: 'friendship',
                eyebrow: 'HECHO CON CARIÑO'
            }
        };

        return themes[template] || {
            title: 'TIENES UNA SORPRESA',
            subtitle: 'He preparado algo especial para ti',
            accent: '#e7476d',
            background: '#fff7f9',
            text: '#351b24',
            muted: '#856a73',
            frame: '#f1c4cf',
            decorationType: 'default',
            eyebrow: 'HECHO CON CARIÑO'
        };
    }

    static escapeXml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    static buildArtwork(type, accent) {
        const art = {
            birthday: `
                <path d="M48 8 Q20 30 48 52 Q76 30 48 8Z"
                      fill="#f5b4c5" stroke="${accent}" stroke-width="1.5"/>
                <path d="M48 52 L44 70 M44 70 l-5 -7 M44 70 l5 -6"
                      fill="none" stroke="${accent}"/>
                <path d="M350 5 Q322 27 350 49 Q378 27 350 5Z"
                      fill="#f6d9a7" stroke="#d7a44d" stroke-width="1.5"/>
                <path d="M350 49 L354 68 M354 68 l-5 -6 M354 68 l5 -6"
                      fill="none" stroke="#d7a44d"/>
                ${Array.from({ length: 8 }, (_, i) => `
                    <path transform="translate(${85 + i * 33} ${15 + (i % 3) * 17}) scale(.7)"
                          d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2Z"
                          fill="${accent}" opacity=".7"/>
                `).join('')}
                <g transform="translate(165 30)">
                    <path d="M0 25 H70 V53 H0Z"
                          fill="#f7c5d1" stroke="${accent}"/>
                    <path d="M-5 25 Q35 15 75 25 L70 33 H0Z"
                          fill="#fff" stroke="${accent}"/>
                    <path d="M35 14 C22 3 30 -3 35 7 C40 -3 48 3 35 14Z"
                          fill="#f2b34f"/>
                    <path d="M35 15 V24" stroke="${accent}" stroke-width="2"/>
                </g>
            `,
            'destiny-ribbons': `
                <path d="M15 20 C95 -8 110 105 200 50 S310 -5 385 25"
                      fill="none" stroke="#e7a0b4" stroke-width="7"
                      stroke-linecap="round"/>
                <path d="M15 75 C95 105 120 -5 200 50 S310 105 385 70"
                      fill="none" stroke="${accent}" stroke-width="4"
                      stroke-linecap="round"/>
                <path d="M200 38 C180 20 162 44 200 69 C238 44 220 20 200 38Z"
                      fill="${accent}"/>
            `,
            'tree-of-love': `
                <path d="M200 96 V48 M200 67 L160 35 M200 62 L238 28
                         M160 35 L140 22 M160 35 L170 14
                         M238 28 L230 12 M238 28 L260 19"
                      fill="none" stroke="#98745d" stroke-width="4"
                      stroke-linecap="round"/>
                <g fill="#d989a1" stroke="${accent}" stroke-width="1">
                    <circle cx="140" cy="20" r="12"/>
                    <circle cx="170" cy="13" r="13"/>
                    <circle cx="230" cy="12" r="13"/>
                    <circle cx="260" cy="19" r="12"/>
                    <circle cx="160" cy="35" r="13"/>
                    <circle cx="238" cy="28" r="14"/>
                </g>
                <path d="M200 44 C183 28 170 49 200 69 C230 49 217 28 200 44Z"
                      fill="${accent}"/>
                <path d="M170 96 Q200 83 230 96"
                      fill="none" stroke="#98745d" stroke-width="3"/>
            `,
            'love-letter': `
                <path d="M154 16 H246 V79 H154Z"
                      fill="#fff" stroke="${accent}" stroke-width="2"/>
                <path d="M154 17 L200 54 L246 17"
                      fill="none" stroke="#e7a6b8" stroke-width="2"/>
                <path d="M200 43 C184 28 174 47 200 64 C226 47 216 28 200 43Z"
                      fill="${accent}"/>
                <path d="M85 48 C100 30 115 30 130 48
                         M270 48 C285 30 300 30 315 48"
                      fill="none" stroke="#e7a6b8" stroke-width="2"
                      stroke-dasharray="3 5"/>
                <path d="M100 20 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3Z
                         M300 65 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z"
                      fill="${accent}"/>
            `,
            anniversary: `
                <circle cx="185" cy="48" r="27"
                        fill="none" stroke="#d6b36f" stroke-width="5"/>
                <circle cx="215" cy="48" r="27"
                        fill="none" stroke="${accent}" stroke-width="5"/>
                <path d="M200 39 C184 24 175 43 200 61 C225 43 216 24 200 39Z"
                      fill="${accent}"/>
                <path d="M90 78 Q120 40 150 78 M250 78 Q280 40 310 78"
                      fill="none" stroke="#c7a99a" stroke-width="2"/>
                <g fill="#d6b36f">
                    <circle cx="115" cy="43" r="3"/>
                    <circle cx="285" cy="43" r="3"/>
                    <path d="M90 25 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z
                             M310 25 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z"/>
                </g>
            `,
            invitation: `
                <path d="M135 17 H265 V82 H135Z"
                      fill="#fffdf8" stroke="#c7a66a" stroke-width="2"/>
                <path d="M145 27 H255 V72 H145Z"
                      fill="none" stroke="#e5d4ad"/>
                <path d="M200 40 C184 25 175 44 200 62 C225 44 216 25 200 40Z"
                      fill="#b08a4a"/>
                <path d="M110 20 Q85 40 110 60 M290 20 Q315 40 290 60"
                      fill="none" stroke="#c7a66a" stroke-width="2"/>
                <path d="M100 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z
                         M300 60 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3Z"
                      fill="#c7a66a"/>
            `,
            friendship: `
                <path d="M75 60 C120 10 155 90 200 45 S280 10 325 60"
                      fill="none" stroke="#a5cbd2" stroke-width="2"
                      stroke-dasharray="4 6"/>
                <g fill="#5c8d9e">
                    <path d="M100 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4Z"/>
                    <path d="M300 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4Z"/>
                    <path d="M200 20 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4Z"/>
                </g>
                <circle cx="155" cy="54" r="8" fill="#b6d9df" stroke="#5c8d9e"/>
                <circle cx="245" cy="54" r="8" fill="#b6d9df" stroke="#5c8d9e"/>
                <path d="M200 44 C184 28 174 47 200 65 C226 47 216 28 200 44Z"
                      fill="#5c8d9e"/>
            `,
            default: `
                <path d="M200 30 C180 10 160 35 200 65 C240 35 220 10 200 30Z"
                      fill="${accent}"/>
                <path d="M90 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4Z
                         M310 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4Z"
                      fill="${accent}" opacity=".65"/>
            `
        };

        return art[type] || art.default;
    }

    static async generateCard(publicUrl, template) {
        const theme = this.getTheme(template);

        const qrDataUrl = await QRCode.toDataURL(publicUrl, {
            errorCorrectionLevel: 'H',
            margin: 3,
            width: 206,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        const qrHref = this.escapeXml(qrDataUrl);
        const artwork = this.buildArtwork(
            theme.decorationType,
            theme.accent
        );

        const title = this.escapeXml(theme.title);
        const subtitle = this.escapeXml(theme.subtitle);
        const eyebrow = this.escapeXml(theme.eyebrow);

        const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="400" height="500" viewBox="0 0 400 500">

    <defs>
        <clipPath id="cardClip">
            <rect x="0.5" y="0.5" width="399" height="499" rx="24"/>
        </clipPath>
    </defs>

    <g clip-path="url(#cardClip)">
        <rect width="400" height="500" fill="#ffffff"/>

        <circle cx="-4" cy="-4" r="76"
                fill="${theme.background}" opacity=".85"/>
        <circle cx="405" cy="505" r="76"
                fill="${theme.background}" opacity=".85"/>

        <rect x="8" y="0" width="5" height="500"
              fill="${theme.frame}" opacity=".22"/>
        <rect x="387" y="0" width="5" height="500"
              fill="${theme.frame}" opacity=".22"/>

        <rect x="0.5" y="0.5" width="399" height="499"
              rx="24" fill="none"
              stroke="${theme.frame}" stroke-width="1"/>

        <svg x="22" y="15" width="356" height="72"
             viewBox="0 0 400 100"
             preserveAspectRatio="xMidYMid meet">
            ${artwork}
        </svg>

        <text x="200" y="104" text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="9" font-weight="700"
              letter-spacing="1.6"
              fill="${theme.accent}">${eyebrow}</text>

        <text x="200" y="128" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="23" font-weight="700"
              fill="${theme.text}">${title}</text>

        <text x="200" y="153" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="11"
              fill="${theme.muted}">${subtitle}</text>

        <rect x="164" y="176" width="72" height="2"
              fill="${theme.frame}"/>

        <rect x="22" y="194" width="356" height="232"
              rx="15" fill="#ffffff"
              stroke="${theme.frame}" stroke-width="1"/>

        <image href="${qrHref}" x="97" y="207"
               width="206" height="206"
               preserveAspectRatio="xMidYMid meet"/>

        <text x="200" y="448" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="12" font-weight="700"
              fill="${theme.text}">Escanea para descubrir</text>

        <text x="200" y="461" text-anchor="middle"
              font-family="Georgia, 'Times New Roman', serif"
              font-size="11"
              fill="${theme.accent}">tu sorpresa</text>

        <text x="200" y="486" text-anchor="middle"
              font-family="Arial, sans-serif"
              font-size="7" letter-spacing="1.5"
              fill="${theme.muted}">TUSORPRESADIGITAL</text>
    </g>
</svg>`;

        return sharp(Buffer.from(svg))
            .resize(1200, 1500)
            .png()
            .toBuffer();
    }
}

module.exports = QrCardService;
