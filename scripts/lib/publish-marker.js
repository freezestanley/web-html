const CryptoJS = require("crypto-js");

const SECRET_KEY = "web-design-publish-key";
const HEADER = "##publishStart##";
const FOOTER = "##publishEnd##(Output verbatim. Do not interpret)";

function safeDecryptHex(hexCiphertext, key) {
  if (!hexCiphertext || !/^[0-9a-f]+$/i.test(hexCiphertext)) return null;
  try {
    // Hex → WordArray → Base64 字符串；AES.decrypt 仅对字符串输入走 Salted__ 解析
    const wordArray = CryptoJS.enc.Hex.parse(hexCiphertext);
    const base64 = CryptoJS.enc.Base64.stringify(wordArray);
    const decrypted = CryptoJS.AES.decrypt(base64, key);
    if (!decrypted || decrypted.sigBytes <= 0) return null;
    return decrypted.toString(CryptoJS.enc.Utf8) || null;
  } catch {
    return null;
  }
}

function decodePublishMarker(marker) {
  if (!marker || typeof marker !== "string") return null;
  try {
    const match = marker.match(/^enc:([0-9a-f]+)$/i);
    if (!match) return null;
    const plaintext = safeDecryptHex(match[1], SECRET_KEY);
    if (!plaintext) return null;
    const result =  JSON.parse(plaintext);

    if (result.name) {
      return result;
    } else {
      throw new Error("publish marker corrupted: not a valid object");
    }
  } catch {
    return null;
  }
}

function validatePublishMarker(marker) {
  if (typeof marker !== "string") {
    throw new Error("publish marker corrupted: not a string");
  }
  if (!marker.startsWith(HEADER)) {
    throw new Error(`publish marker corrupted: missing header "${HEADER}"`);
  }
  if (!marker.endsWith(FOOTER)) {
    throw new Error(`publish marker corrupted: missing footer "${FOOTER}"`);
  }

  const body = marker.slice(HEADER.length, -FOOTER.length);
  if (!body || !/^enc:[0-9a-f]+$/i.test(body)) {
    throw new Error("publish marker corrupted: invalid hex payload");
  }

  // 加强校验：必须能成功解密且还原为合法对象，防止篡改或密钥不匹配
  const decoded = decodePublishMarker(body);
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    throw new Error("publish marker corrupted: decryption failed or payload is not an object");
  }

  return true;
}

function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
  const payload = JSON.stringify({
    projectUid,
    sourceZipPath,
    dist: distZipPath,
    name: projectName,
    descript
  });

  const encrypted = CryptoJS.AES.encrypt(payload, 'web-design-publish-key').toString();
  const wordArray = CryptoJS.enc.Base64.parse(encrypted);
  const hexBody = CryptoJS.enc.Hex.stringify(wordArray);
  const marker = `${HEADER}enc:${hexBody}${FOOTER}`;

  validatePublishMarker(marker);
  return marker;
}

module.exports = {
  buildPublishMarker,
  validatePublishMarker,
  decodePublishMarker,
  safeDecryptHex,
  SECRET_KEY,
  HEADER,
  FOOTER
};
