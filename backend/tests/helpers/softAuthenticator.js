'use strict';
/**
 * A tiny software WebAuthn authenticator (ES256, "none" attestation) used only
 * to exercise the real server-side verification in tests.
 */
const crypto = require('crypto');

function cbor(value) {
  const head = (major, n) => {
    if (n < 24) return Buffer.from([(major << 5) | n]);
    if (n < 256) return Buffer.from([(major << 5) | 24, n]);
    return Buffer.from([(major << 5) | 25, n >> 8, n & 255]);
  };
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (typeof value === 'string') {
    const b = Buffer.from(value);
    return Buffer.concat([head(3, b.length), b]);
  }
  if (typeof value === 'number') return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (value instanceof Map) {
    return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
  }
  throw new Error('unsupported cbor type');
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest();

class SoftAuthenticator {
  constructor({ rpId = 'localhost', origin = 'http://localhost:3000' } = {}) {
    this.rpIdHash = sha256(rpId);
    this.origin = origin;
    this.credentialId = crypto.randomBytes(32);
    this.counter = 0;
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    this.privateKey = privateKey;
    this.jwk = publicKey.export({ format: 'jwk' });
  }

  get id() {
    return b64u(this.credentialId);
  }

  clientData(type, challenge, origin = this.origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  register(options, { origin } = {}) {
    const cose = new Map([
      [1, 2], [3, -7], [-1, 1],
      [-2, Buffer.from(this.jwk.x, 'base64url')],
      [-3, Buffer.from(this.jwk.y, 'base64url')],
    ]);
    const counter = Buffer.alloc(4);
    const idLen = Buffer.alloc(2);
    idLen.writeUInt16BE(this.credentialId.length);
    const authData = Buffer.concat([this.rpIdHash, Buffer.from([0x45]), counter, Buffer.alloc(16), idLen, this.credentialId, cbor(cose)]);
    const attestationObject = cbor(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', authData]]));
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: b64u(this.clientData('webauthn.create', options.challenge, origin)),
        attestationObject: b64u(attestationObject),
        transports: ['internal'],
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    };
  }

  authenticate(options, { origin, counter } = {}) {
    this.counter = counter === undefined ? this.counter + 1 : counter;
    const count = Buffer.alloc(4);
    count.writeUInt32BE(this.counter);
    const authData = Buffer.concat([this.rpIdHash, Buffer.from([0x05]), count]);
    const clientDataJSON = this.clientData('webauthn.get', options.challenge, origin);
    const signature = crypto.sign('sha256', Buffer.concat([authData, sha256(clientDataJSON)]), this.privateKey);
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: { clientDataJSON: b64u(clientDataJSON), authenticatorData: b64u(authData), signature: b64u(signature) },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    };
  }
}

module.exports = { SoftAuthenticator };
