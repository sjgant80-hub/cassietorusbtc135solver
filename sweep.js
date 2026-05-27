#!/usr/bin/env node
// ◊·κ STANDALONE SWEEP · browser-crash backup
//
// Use this if CASSIE's browser dies AFTER finding the key but BEFORE sweeping.
// You'll have the private key hex in the log · paste it here · BTC moves in seconds.
//
// SETUP (one-time):
//   npm install @noble/curves@1.7.0 @noble/hashes@1.5.0
//
// RUN:
//   node sweep.js <private-key-hex> <destination-btc-address>
//
// Example:
//   node sweep.js 4d33e7665705359f04f28b88cf897c603c9... bc1qyour-cold-wallet-address-here
//
// What it does:
//   1. Derives all 4 address formats (P2PKH compressed/uncompressed, P2WPKH, P2SH-segwit)
//   2. Queries mempool.space for UTXOs at each format
//   3. Builds a SINGLE-output transaction to your destination
//   4. Fetches the fastest fee rate
//   5. Signs with the private key
//   6. Broadcasts to mempool.space
//   7. Prints txid and mempool.space URL
//
// Total wall-clock: ~3-5 seconds on a warm connection.

'use strict';

let secp, sha256, ripemd160;
try {
  ({ secp256k1: secp } = require('@noble/curves/secp256k1'));
  ({ sha256 } = require('@noble/hashes/sha256'));
  ({ ripemd160 } = require('@noble/hashes/ripemd160'));
} catch(e) {
  console.error('Missing deps. Run: npm install @noble/curves@1.7.0 @noble/hashes@1.5.0');
  process.exit(1);
}

const [, , KEY_HEX, DEST_ADDR] = process.argv;
if (!KEY_HEX || !DEST_ADDR) {
  console.error('Usage: node sweep.js <private-key-hex> <destination-btc-address>');
  process.exit(1);
}
const cleanKey = KEY_HEX.replace(/^0x/, '').trim().padStart(64, '0');
if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
  console.error('Invalid key hex (need 64 hex chars)');
  process.exit(1);
}

// ─── helpers ──────────────────────────────────────────────────
const _htb = (h) => { const a = new Uint8Array(h.length/2); for (let i=0;i<a.length;i++) a[i]=parseInt(h.substr(i*2,2),16); return a; };
const _bth = (b) => Array.from(b).map(x => x.toString(16).padStart(2,'0')).join('');
const _cat = (...arrs) => { let n=0; for (const a of arrs) n+=a.length; const out=new Uint8Array(n); let o=0; for (const a of arrs){ out.set(a,o); o+=a.length; } return out; };
const _u32le = (n) => { const a=new Uint8Array(4); for (let i=0;i<4;i++){ a[i]=n&0xff; n=n>>>8; } return a; };
const _u64le = (n) => { const a=new Uint8Array(8); let x=BigInt(n); for (let i=0;i<8;i++){ a[i]=Number(x&0xffn); x=x>>8n; } return a; };
const _vint = (n) => { if (n<0xfd) return new Uint8Array([n]); if (n<=0xffff) return _cat(new Uint8Array([0xfd]), _u32le(n).slice(0,2)); return _cat(new Uint8Array([0xfe]), _u32le(n)); };

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function _b58chkEnc(bytes, sha) {
  const chk = sha(sha(bytes)).slice(0, 4);
  const full = _cat(bytes, chk);
  let bi = 0n;
  for (const b of full) bi = (bi << 8n) | BigInt(b);
  let s = '';
  while (bi > 0n) { s = B58[Number(bi % 58n)] + s; bi = bi / 58n; }
  for (const b of full) { if (b === 0) s = '1' + s; else break; }
  return s;
}
function _b58chkDec(s, sha) {
  let bi = 0n;
  for (const c of s) { const i = B58.indexOf(c); if (i < 0) throw Error('bad b58'); bi = bi*58n + BigInt(i); }
  let leading = 0; for (const c of s) { if (c==='1') leading++; else break; }
  const out = []; while (bi > 0n) { out.unshift(Number(bi & 0xffn)); bi = bi >> 8n; }
  for (let i = 0; i < leading; i++) out.unshift(0);
  const arr = new Uint8Array(out);
  const data = arr.slice(0, -4), chk = arr.slice(-4);
  const cmp = sha(sha(data)).slice(0, 4);
  for (let i = 0; i < 4; i++) if (cmp[i] !== chk[i]) throw Error('bad checksum');
  return data;
}

const BECH = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function _bech32poly(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function _bech32enc(hrp, witVer, witProg) {
  const data = [witVer];
  let acc = 0, bits = 0;
  for (const b of witProg) { acc = (acc<<8) | b; bits += 8; while (bits>=5) { bits -= 5; data.push((acc>>bits) & 31); } }
  if (bits > 0) data.push((acc<<(5-bits)) & 31);
  const hrpx = []; for (const c of hrp) hrpx.push(c.charCodeAt(0)>>5); hrpx.push(0); for (const c of hrp) hrpx.push(c.charCodeAt(0) & 31);
  const polymod = _bech32poly([...hrpx, ...data, 0,0,0,0,0,0]) ^ 1;
  const chk = []; for (let i = 0; i < 6; i++) chk.push((polymod >> ((5-i)*5)) & 31);
  return hrp + '1' + [...data, ...chk].map(v => BECH[v]).join('');
}
function _bech32dec(s) {
  s = s.toLowerCase();
  const sep = s.lastIndexOf('1');
  const hrp = s.slice(0, sep), payload = s.slice(sep+1);
  const data = []; for (const c of payload) { const i = BECH.indexOf(c); if (i < 0) throw Error('bad bech'); data.push(i); }
  const witVer = data[0];
  const prog5 = data.slice(1, -6);
  let acc = 0, bits = 0; const out = [];
  for (const v of prog5) { acc = (acc<<5) | v; bits += 5; while (bits>=8) { bits -= 8; out.push((acc>>bits) & 0xff); } }
  return { witVer, witProg: new Uint8Array(out) };
}

function deriveAll(privBytes) {
  const pubC = secp.getPublicKey(privBytes, true);
  const pubU = secp.getPublicKey(privBytes, false);
  const h160c = ripemd160(sha256(pubC));
  const h160u = ripemd160(sha256(pubU));
  const p2pkh_c = _b58chkEnc(_cat(new Uint8Array([0x00]), h160c), sha256);
  const p2pkh_u = _b58chkEnc(_cat(new Uint8Array([0x00]), h160u), sha256);
  const p2wpkh = _bech32enc('bc', 0, h160c);
  const redeem = _cat(new Uint8Array([0x00, 0x14]), h160c);
  const p2sh = _b58chkEnc(_cat(new Uint8Array([0x05]), ripemd160(sha256(redeem))), sha256);
  const wifC = _b58chkEnc(_cat(new Uint8Array([0x80]), privBytes, new Uint8Array([0x01])), sha256);
  const wifU = _b58chkEnc(_cat(new Uint8Array([0x80]), privBytes), sha256);
  return { pubC, pubU, p2pkh_c, p2pkh_u, p2wpkh, p2sh, wifC, wifU };
}

function addr2script(addr) {
  if (addr.toLowerCase().startsWith('bc1')) {
    const { witVer, witProg } = _bech32dec(addr);
    if (witVer === 0 && witProg.length === 20) return _cat(new Uint8Array([0x00, 0x14]), witProg);
    if (witVer === 0 && witProg.length === 32) return _cat(new Uint8Array([0x00, 0x20]), witProg);
    throw Error('unknown witness');
  }
  const d = _b58chkDec(addr, sha256);
  const ver = d[0], hash = d.slice(1);
  if (ver === 0x00 && hash.length === 20) return _cat(new Uint8Array([0x76, 0xa9, 0x14]), hash, new Uint8Array([0x88, 0xac]));
  if (ver === 0x05 && hash.length === 20) return _cat(new Uint8Array([0xa9, 0x14]), hash, new Uint8Array([0x87]));
  throw Error('unknown addr');
}

function buildSignedTx(utxos, outputs, privBytes, pubKey) {
  const pkh = ripemd160(sha256(pubKey));
  const myScript = _cat(new Uint8Array([0x76, 0xa9, 0x14]), pkh, new Uint8Array([0x88, 0xac]));
  const scriptSigs = [];
  for (let idx = 0; idx < utxos.length; idx++) {
    const parts = [_u32le(1), _vint(utxos.length)];
    for (let i = 0; i < utxos.length; i++) {
      const txid = _htb(utxos[i].txid); const rev = new Uint8Array(32); for (let j = 0; j < 32; j++) rev[j] = txid[31-j];
      parts.push(rev, _u32le(utxos[i].vout));
      if (i === idx) { parts.push(_vint(myScript.length), myScript); } else { parts.push(_vint(0)); }
      parts.push(_u32le(0xffffffff));
    }
    parts.push(_vint(outputs.length));
    for (const o of outputs) { parts.push(_u64le(o.value), _vint(o.script.length), o.script); }
    parts.push(_u32le(0), _u32le(1));  // locktime, hashType
    const preimage = _cat(...parts);
    const sigHash = sha256(sha256(preimage));
    const sig = secp.sign(sigHash, privBytes);
    const der = sig.toDERRawBytes ? sig.toDERRawBytes() : sig.toCompactRawBytes();
    const sigWithHash = _cat(der, new Uint8Array([0x01]));
    const scriptSig = _cat(_vint(sigWithHash.length), sigWithHash, _vint(pubKey.length), pubKey);
    scriptSigs.push(scriptSig);
  }
  const final = [_u32le(1), _vint(utxos.length)];
  for (let i = 0; i < utxos.length; i++) {
    const txid = _htb(utxos[i].txid); const rev = new Uint8Array(32); for (let j = 0; j < 32; j++) rev[j] = txid[31-j];
    final.push(rev, _u32le(utxos[i].vout), _vint(scriptSigs[i].length), scriptSigs[i], _u32le(0xffffffff));
  }
  final.push(_vint(outputs.length));
  for (const o of outputs) final.push(_u64le(o.value), _vint(o.script.length), o.script);
  final.push(_u32le(0));
  return _cat(...final);
}

// ─── main flow ────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  console.log('◊·κ standalone sweep · destination ' + DEST_ADDR);
  const privBytes = _htb(cleanKey);
  const a = deriveAll(privBytes);
  console.log('addresses derived:');
  console.log('  P2PKH (c):', a.p2pkh_c);
  console.log('  P2PKH (u):', a.p2pkh_u);
  console.log('  P2WPKH:   ', a.p2wpkh);
  console.log('  P2SH:     ', a.p2sh);
  console.log('  WIF (c):  ', a.wifC);
  console.log('  WIF (u):  ', a.wifU);

  // Find UTXOs (BTC puzzles canonically use uncompressed P2PKH but we check all 4)
  const fetch = global.fetch || ((url, opts) => import('node:https').then(({ request }) => new Promise((res, rej) => {
    const u = new URL(url);
    const req = request({ host: u.host, path: u.pathname + u.search, method: (opts && opts.method) || 'GET', headers: (opts && opts.headers) || {} }, (r) => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => res({ ok: r.statusCode >= 200 && r.statusCode < 300, status: r.statusCode, text: () => Promise.resolve(Buffer.concat(chunks).toString()), json: () => Promise.resolve(JSON.parse(Buffer.concat(chunks).toString())) }));
    });
    req.on('error', rej);
    if (opts && opts.body) req.write(opts.body);
    req.end();
  })));

  // BTC PUZZLE FACT: keys derive to the COMPRESSED P2PKH form (verified vs puzzles 1, 130).
  // Try compressed first · uncompressed only as fallback.
  const tries = [
    { addr: a.p2pkh_c, type: 'p2pkh', pub: a.pubC },   // canonical for BTC puzzles
    { addr: a.p2wpkh,  type: 'p2wpkh', pub: a.pubC },
    { addr: a.p2sh,    type: 'p2sh',   pub: a.pubC },
    { addr: a.p2pkh_u, type: 'p2pkh', pub: a.pubU }    // fallback only
  ];
  let utxos = null, pubKey = null, fundedAddr = null;
  for (const t of tries) {
    try {
      const r = await fetch('https://mempool.space/api/address/' + t.addr + '/utxo');
      if (!r.ok) continue;
      const u = await r.json();
      if (Array.isArray(u) && u.length) { utxos = u; pubKey = t.pub; fundedAddr = t.addr; console.log('UTXOs found at ' + t.addr + ' (' + t.type + ') · ' + u.length + ' outputs'); break; }
    } catch(e) { console.log('  fetch ' + t.addr + ' failed: ' + e.message); }
  }
  if (!utxos) { console.error('NO UTXOs at any address. Funds may have been swept.'); process.exit(2); }

  const totalSats = utxos.reduce((s, u) => s + u.value, 0);
  console.log('balance: ' + (totalSats/1e8).toFixed(8) + ' BTC (' + totalSats.toLocaleString() + ' sats)');

  // Fastest fee
  let feeRate = 50;
  try {
    const r = await fetch('https://mempool.space/api/v1/fees/recommended');
    if (r.ok) { const f = await r.json(); if (f && f.fastestFee) feeRate = f.fastestFee; }
  } catch(_){}
  feeRate = Math.max(30, feeRate);
  const estVsize = 10 + 148 * utxos.length + 34;
  const fee = estVsize * feeRate;
  const sendSats = totalSats - fee;
  if (sendSats < 546) { console.error('insufficient after fee'); process.exit(3); }
  console.log('fee: ' + fee + ' sats @ ' + feeRate + ' sat/vB · sending ' + (sendSats/1e8).toFixed(8) + ' BTC');

  // Build + sign
  const destScript = addr2script(DEST_ADDR);
  const rawTx = buildSignedTx(utxos, [{ value: sendSats, script: destScript }], privBytes, pubKey);
  const rawHex = _bth(rawTx);
  console.log('signed tx · ' + rawTx.length + ' bytes · t=' + (Date.now()-t0) + 'ms');

  // Broadcast
  const r = await fetch('https://mempool.space/api/tx', { method: 'POST', body: rawHex });
  if (!r.ok) {
    const err = await r.text();
    console.error('BROADCAST FAILED: ' + err);
    console.log('raw hex (use mempool.space/tx/push manually):');
    console.log(rawHex);
    process.exit(4);
  }
  const txid = await r.text();
  console.log('');
  console.log('◊◊◊ SWEPT in ' + (Date.now()-t0) + 'ms · txid: ' + txid);
  console.log('  https://mempool.space/tx/' + txid.trim());
})().catch(e => { console.error('error:', e.message); process.exit(5); });
