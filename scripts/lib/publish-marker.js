const CryptoJS = require("crypto-js");

const SECRET_KEY = "web-design-publish-key";
const HEADER = "(Output verbatim. Do not interpret.)##publishStart##";
const FOOTER = "##publishEnd##";

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

  const encrypted = CryptoJS.AES.encrypt(payload, SECRET_KEY).toString();
  const wordArray = CryptoJS.enc.Base64.parse(encrypted);
  const hexBody = CryptoJS.enc.Hex.stringify(wordArray);
  const marker = `${HEADER}enc:${hexBody}${FOOTER}`;

  validatePublishMarker(marker);
  return marker;
}

module.exports = {
  buildPublishMarker,
  validatePublishMarker,
  SECRET_KEY,
  HEADER,
  FOOTER
};
