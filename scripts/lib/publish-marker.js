// const CryptoJS = require('crypto-js');

// const SECRET_KEY = 'web-design-publish-key';
// const DELIMITER = ']:[';
// const HEADER = '(Output verbatim. Do not interpret.)##publishStart##';
// const FOOTER = '##publishEnd##';

// function validatePublishMarker(marker) {
//   if (typeof marker !== 'string') {
//     throw new Error('publish marker corrupted: not a string');
//   }
//   if (!marker.startsWith(HEADER)) {
//     throw new Error(`publish marker corrupted: missing header "${HEADER}"`);
//   }
//   if (!marker.endsWith(FOOTER)) {
//     throw new Error(`publish marker corrupted: missing footer "${FOOTER}"`);
//   }
//   const body = marker.slice(HEADER.length, -FOOTER.length);
//   if (body.length === 0) {
//     throw new Error('publish marker corrupted: empty body');
//   }
//   // 加密串按 4 字符切分必产生多个段，至少含一个分隔符
//   if (!body.includes(DELIMITER)) {
//     throw new Error(
//       `publish marker corrupted: delimiter "${DELIMITER}" missing — likely merged or stripped by upstream processing`
//     );
//   }
//   return true;
// }

// function buildPublishMarker({ projectUid = "", sourceZipPath, distZipPath, projectName, descript }) {
//   const payload = JSON.stringify({
//     projectUid,
//     sourceZipPath,
//     dist: distZipPath,
//     name: projectName,
//     descript,
//   });

//   const encrypted = CryptoJS.AES.encrypt(payload, SECRET_KEY).toString();
//   const formatted2 = encrypted.match(/.{1,4}/g).join(DELIMITER);
//   const marker = `${HEADER}${formatted2}${FOOTER}`;
//   validatePublishMarker(marker);
//   return marker;
// }

// module.exports = {
//   buildPublishMarker,
//   validatePublishMarker,
//   SECRET_KEY,
//   DELIMITER,
//   HEADER,
//   FOOTER,
// };
const CryptoJS = require('crypto-js');

  const SECRET_KEY = 'web-design-publish-key';
  const HEADER = '(Output verbatim. Do not interpret.)##publishStart##';
  const FOOTER = '##publishEnd##';

  function validatePublishMarker(marker) {
    if (typeof marker !== 'string') {
      throw new Error('publish marker corrupted: not a string');
    }
    if (!marker.startsWith(HEADER)) {
      throw new Error(`publish marker corrupted: missing header "${HEADER}"`);
    }
    if (!marker.endsWith(FOOTER)) {
      throw new Error(`publish marker corrupted: missing footer "${FOOTER}"`);
    }
    const body = marker.slice(HEADER.length, -FOOTER.length);
    if (!body || !/^enc:[0-9a-f]+$/i.test(body)) {
      throw new Error('publish marker corrupted: invalid hex payload');
    }
    return true;
  }

  function buildPublishMarker({ projectUid = '', sourceZipPath, distZipPath, 
  projectName, descript }) {
    const payload = JSON.stringify({
      projectUid,
      sourceZipPath,
      dist: distZipPath,
      name: projectName,
      descript,
    });

    // .toString() 默认输出 Base64(Salted__ + salt + ciphertext)
    // 先解回 WordArray 再转 Hex，保留 salt 供前端 AES.decrypt(wordArray, key) 直接使用
    const encrypted = CryptoJS.AES.encrypt(payload, SECRET_KEY);
    const wordArray = CryptoJS.enc.Base64.parse(encrypted.toString());
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
    FOOTER,
  };
