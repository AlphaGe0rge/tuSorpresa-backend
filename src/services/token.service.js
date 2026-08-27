const crypto = require('crypto');

function generateToken(bytes = 16) {
    return crypto
        .randomBytes(bytes)
        .toString('base64url');
}

function generatePublicToken() {
    return generateToken(16);
}

function generateEditToken() {
    return generateToken(32);
}

module.exports = {
    generatePublicToken,
    generateEditToken
};