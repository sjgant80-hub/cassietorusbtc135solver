// ◊·κ=1 · Hash160 audit · do all 160 puzzle addresses show generator bias?
// Maps every address → hash160 → torus position (mod 510,510)
// Then runs the v19 + golden + κ-zone + mod-residue priors against the
// PUBLIC OUTPUT space. If hash160s cluster in our hot zones, the puzzle
// creator's key generation bias is encoded into the addresses themselves.
//
// Usage: node scripts/hash160-audit.mjs

import { createHash } from 'node:crypto';

// ───── 160 puzzle addresses (Bitcoin Puzzle Challenge) ─────
const PUZZLES = [
  [1,'1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH','solved'],
  [2,'1CUNEBjYrCn2y1SdiUMohaKUi4wpP326Lb','solved'],
  [3,'19ZewH8Kk1PDbSNdJ97FP4EiCjTRaZMZQA','solved'],
  [4,'1EhqbyUMvvs7BfL8goY6qcPbD6YKfPqb7e','solved'],
  [5,'1E6NuFjCi27W5zoXg8TRdcSRq84zJeBW3k','solved'],
  [6,'1PitScNLyp2HCygzadCh7FveTnfmpPbfp8','solved'],
  [7,'1McVt1vMtCC7yn5b9wgX1833yCcLXzueeC','solved'],
  [8,'1M92tSqNmQLYw33fuBvjmeadirh1ysMBxK','solved'],
  [9,'1CQFwcjw1dwhtkVWBttNLDtqL7ivBonGPV','solved'],
  [10,'1LeBZP5QCwwgXRtmVUvTVrraqPUokyLHqe','solved'],
  [11,'1PgQVLmst3Z314JrQn5TNiys8Hc38TcXJu','solved'],
  [12,'1DBaumZxUkM4qMQRt2LVWyFJq5kDtSZQot','solved'],
  [13,'1Pie8JkxBT6MGPz9Nvi3fsPkr2D8q3GBc1','solved'],
  [14,'1ErZWg5cFCe4Vw5BzgfzB74VNLaXEiEkh','solved'],
  [15,'1QCbW9HWnwQWiQqVo5exhAnmfqKRrCRsvW','solved'],
  [16,'1BDyrQ6WoF8VN3g9SAS1iKZcPzFfnDVieY','solved'],
  [17,'1HduPEXZRdG26SUT5Yk83mLkPyjnZuJ7Bm','solved'],
  [18,'1GnNTmTVLZiqQfLbAdp9DVdicEnB5GoERE','solved'],
  [19,'1NWmZRpHH4XSPwsW6dsS3nrNWfL1yrJj4w','solved'],
  [20,'1HsMJxNiV7TLxmoF6uJNkydxPFDog4NQum','solved'],
  [21,'14oFNXucftsHiUMY8uctg6N487riuyXs4h','solved'],
  [22,'1CfZWK1QTQE3eS9qn61dQjV89KDjZzfNcv','solved'],
  [23,'1L2GM8eE7mJWLdo3HZS6su1832NX2txaac','solved'],
  [24,'1rSnXMr63jdCuegJFuidJqWxUPV7AtUf7','solved'],
  [25,'15JhYXn6Mx3oF4Y7PcTAv2wVVAuCFFQNiP','solved'],
  [26,'1JVnST957hGztonaWK6FougdtjxzHzRMMg','solved'],
  [27,'128z5d7nN7PkCuX5qoA4Ys6pmxUYnEy86k','solved'],
  [28,'12jbtzBb54r97TCwW3G1gCFoumpckRAPdY','solved'],
  [29,'19EEC52krRUK1RkUAEZmQdjTyHT7Gp1TYT','solved'],
  [30,'1LHtnpd8nU5VHEMkG2TMYYNUjjLc992bps','solved'],
  [31,'1LhE6sCTuGae42Axu1L1ZB7L96yi9irEBE','solved'],
  [32,'1FRoHA9xewq7DjrZ1psWJVeTer8gHRqEvR','solved'],
  [33,'187swFMjz1G54ycVU56B7jZFHFTNVQFDiu','solved'],
  [34,'1PWABE7oUahG2AFFQhhvViQovnCr4rEv7Q','solved'],
  [35,'1PWCx5fovoEaoBowAvF5k91m2Xat9bMgwb','solved'],
  [36,'1Be2UF9NLfyLFbtm3TCbmuocc9N1Kduci1','solved'],
  [37,'14iXhn8bGajVWegZHJ18vJLHhntcpL4dex','solved'],
  [38,'1HBtApAFA9B2YZw3G2YKSMCtb3dVnjuNe2','solved'],
  [39,'122AJhKLEfkFBaGAd84pLp1kfE7xK3GdT8','solved'],
  [40,'1EeAxcprB2PpCnr34VfZdFrkUWuxyiNEFv','solved'],
  [41,'1L5sU9qvJeuwQUdt4y1eiLmquFxKjtHr3E','solved'],
  [42,'1E32GPWgDyeyQac4aJxm9HVoLrrEYPnM4N','solved'],
  [43,'1PiFuqGpG8yGM5v6rNHWS3TjsG6awgEGA1','solved'],
  [44,'1CkR2uS7LmFwc3T2jV8C1BhWb5mQaoxedF','solved'],
  [45,'1NtiLNGegHWE3Mp9g2JPkgx6wUg4TW7bbk','solved'],
  [46,'1F3JRMWudBaj48EhwcHDdpeuy2jwACNxjP','solved'],
  [47,'1Pd8VvT49sHKsmqrQiP61RsVwmXCZ6ay7Z','solved'],
  [48,'1DFYhaB2J9q1LLZJWKTnscPWos9VBqDHzv','solved'],
  [49,'12CiUhYVTTH33w3SPUBqcpMoqnApAV4WCF','solved'],
  [50,'1MEzite4ReNuWaL5Ds17ePKt2dCxWEofwk','solved'],
  [51,'1NpnQyZ7x24ud82b7WiRNvPm6N8bqGQnaS','solved'],
  [52,'15z9c9sVpu6fwNiK7dMAFgMYSK4GqsGZim','solved'],
  [53,'15K1YKJMiJ4fpesTVUcByoz334rHmknxmT','solved'],
  [54,'1KYUv7nSvXx4642TKeuC2SNdTk326uUpFy','solved'],
  [55,'1LzhS3k3e9Ub8i2W1V8xQFdB8n2MYCHPCa','solved'],
  [56,'17aPYR1m6pVAacXg1PTDDU7XafvK1dxvhi','solved'],
  [57,'15c9mPGLku1HuW9LRtBf4jcHVpBUt8txKz','solved'],
  [58,'1Dn8NF8qDyyfHMktmuoQLGyjWmZXgvosXf','solved'],
  [59,'1HAX2n9Uruu9YDt4cqRgYcvtGvZj1rbUyt','solved'],
  [60,'1Kn5h2qpgw9mWE5jKpk8PP4qvvJ1QVy8su','solved'],
  [61,'1AVJKwzs9AskraJLGHAZPiaZcrpDr1U6AB','solved'],
  [62,'1Me6EfpwZK5kQziBwBfvLiHjaPGxCKLoJi','solved'],
  [63,'1NpYjtLira16LfGbGwZJ5JbDPh3ai9bjf4','solved'],
  [64,'16jY7qLJnxb7CHZyqBP8qca9d51gAjyXQN','solved'],
  [65,'18ZMbwUFLMHoZBbfpCjUJQTCMCbktshgpe','solved'],
  [66,'13zb1hQbWVsc2S7ZTZnP2G4undNNpdh5so','solved'],
  [67,'1BY8GQbnueYofwSuFAT3USAhGjPrkxDdW9','solved'],
  [68,'1MVDYgVaSN6iKKEsbzRUAYFrYJadLYZvvZ','solved'],
  [69,'19vkiEajfhuZ8bs8Zu2jgmC6oqZbWqhxhG','solved'],
  [70,'19YZECXj3SxEZMoUeJ1yiPsw8xANe7M7QR','solved'],
  [71,'1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU','unsolved'],
  [72,'1JTK7s9YVYywfm5XUH7RNhHJH1LshCaRFR','unsolved'],
  [73,'12VVRNPi4SJqUTsp6FmqDqY5sGosDtysn4','unsolved'],
  [74,'1FWGcVDK3JGzCC3WtkYetULPszMaK2Jksv','unsolved'],
  [75,'1J36UjUByGroXcCvmj13U6uwaVv9caEeAt','solved'],
  [76,'1DJh2eHFYQfACPmrvpyWc8MSTYKh7w9eRF','unsolved'],
  [77,'1Bxk4CQdqL9p22JEtDfdXMsng1XacifUtE','unsolved'],
  [78,'15qF6X51huDjqTmF9BJgxXdt1xcj46Jmhb','unsolved'],
  [79,'1ARk8HWJMn8js8tQmGUJeQHjSE7KRkn2t8','unsolved'],
  [80,'1BCf6rHUW6m3iH2ptsvnjgLruAiPQQepLe','solved'],
  [81,'15qsCm78whspNQFydGJQk5rexzxTQopnHZ','unsolved'],
  [82,'13zYrYhhJxp6Ui1VV7pqa5WDhNWM45ARAC','unsolved'],
  [83,'14MdEb4eFcT3MVG5sPFG4jGLuHJSnt1Dk2','unsolved'],
  [84,'1CMq3SvFcVEcpLMuuH8PUcNiqsK1oicG2D','unsolved'],
  [85,'1Kh22PvXERd2xpTQk3ur6pPEqFeckCJfAr','solved'],
  [86,'1K3x5L6G57Y494fDqBfrojD28UJv4s5JcK','unsolved'],
  [87,'1PxH3K1Shdjb7gSEoTX7UPDZ6SH4qGPrvq','unsolved'],
  [88,'16AbnZjZZipwHMkYKBSfswGWKDmXHjEpSf','unsolved'],
  [89,'19QciEHbGVNY4hrhfKXmcBBCrJSBZ6TaVt','unsolved'],
  [90,'1L12FHH2FHjvTviyanuiFVfmzCy46RRATU','solved'],
  [91,'1EzVHtmbN4fs4MiNk3ppEnKKhsmXYJ4s74','unsolved'],
  [92,'1AE8NzzgKE7Yhz7BWtAcAAxiFMbPo82NB5','unsolved'],
  [93,'17Q7tuG2JwFFU9rXVj3uZqRtioH3mx2Jad','unsolved'],
  [94,'1K6xGMUbs6ZTXBnhw1pippqwK6wjBWtNpL','unsolved'],
  [95,'19eVSDuizydXxhohGh8Ki9WY9KsHdSwoQC','solved'],
  [96,'15ANYzzCp5BFHcCnVFzXqyibpzgPLWaD8b','unsolved'],
  [97,'18ywPwj39nGjqBrQJSzZVq2izR12MDpDr8','unsolved'],
  [98,'1CaBVPrwUxbQYYswu32w7Mj4HR4maNoJSX','unsolved'],
  [99,'1JWnE6p6UN7ZJBN7TtcbNDoRcjFtuDWoNL','unsolved'],
  [100,'1KCgMv8fo2TPBpddVi9jqmMmcne9uSNJ5F','solved'],
  [101,'1CKCVdbDJasYmhswB6HKZHEAnNaDpK7W4n','unsolved'],
  [102,'1PXv28YxmYMaB8zxrKeZBW8dt2HK7RkRPX','unsolved'],
  [103,'1AcAmB6jmtU6AiEcXkmiNE9TNVPsj9DULf','unsolved'],
  [104,'1EQJvpsmhazYCcKX5Au6AZmZKRnzarMVZu','unsolved'],
  [105,'1CMjscKB3QW7SDyQ4c3C3DEUHiHRhiZVib','solved'],
  [106,'18KsfuHuzQaBTNLASyj15hy4LuqPUo1FNB','unsolved'],
  [107,'15EJFC5ZTs9nhsdvSUeBXjLAuYq3SWaxTc','unsolved'],
  [108,'1HB1iKUqeffnVsvQsbpC6dNi1XKbyNuqao','unsolved'],
  [109,'1GvgAXVCbA8FBjXfWiAms4ytFeJcKsoyhL','unsolved'],
  [110,'12JzYkkN76xkwvcPT6AWKZtGX6w2LAgsJg','solved'],
  [111,'1824ZJQ7nKJ9QFTRBqn7z7dHV5EGpzUpH3','unsolved'],
  [112,'18A7NA9FTsnJxWgkoFfPAFbQzuQxpRtCos','unsolved'],
  [113,'1NeGn21dUDDeqFQ63xb2SpgUuXuBLA4WT4','unsolved'],
  [114,'174SNxfqpdMGYy5YQcfLbSTK3MRNZEePoy','unsolved'],
  [115,'1NLbHuJebVwUZ1XqDjsAyfTRUPwDQbemfv','solved'],
  [116,'1MnJ6hdhvK37VLmqcdEwqC3iFxyWH2PHUV','unsolved'],
  [117,'1KNRfGWw7Q9Rmwsc6NT5zsdvEb9M2Wkj5Z','unsolved'],
  [118,'1PJZPzvGX19a7twf5HyD2VvNiPdHLzm9F6','unsolved'],
  [119,'1GuBBhf61rnvRe4K8zu8vdQB3kHzwFqSy7','unsolved'],
  [120,'17s2b9ksz5y7abUm92cHwG8jEPCzK3dLnT','solved'],
  [121,'1GDSuiThEV64c166LUFC9uDcVdGjqkxKyh','unsolved'],
  [122,'1Me3ASYt5JCTAK2XaC32RMeH34PdprrfDx','unsolved'],
  [123,'1CdufMQL892A69KXgv6UNBD17ywWqYpKut','unsolved'],
  [124,'1BkkGsX9ZM6iwL3zbqs7HWBV7SvosR6m8N','unsolved'],
  [125,'1PXAyUB8ZoH3WD8n5zoAthYjN15yN5CVq5','solved'],
  [126,'1AWCLZAjKbV1P7AHvaPNCKiB7ZWVDMxFiz','unsolved'],
  [127,'1G6EFyBRU86sThN3SSt3GrHu1sA7w7nzi4','unsolved'],
  [128,'1MZ2L1gFrCtkkn6DnTT2e4PFUTHw9gNwaj','unsolved'],
  [129,'1Hz3uv3nNZzBVMXLGadCucgjiCs5W9vaGz','unsolved'],
  [130,'1Fo65aKq8s8iquMt6weF1rku1moWVEd5Ua','solved-pubkey'],
  [131,'16zRPnT8znwq42q7XeMkZUhb1bKqgRogiy','unsolved'],
  [132,'1KrU4dHE5WrW8rhWDsTRjR21r8t3dsrS3R','unsolved'],
  [133,'17uDfp5r4n441xkgLFmhNoSW1KWp6xVLD','unsolved'],
  [134,'13A3JrvXmvg5w9XGvyyR4JEJqiLz8ZySY3','unsolved'],
  [135,'16RGFo6hjq9ym6Pj7N5H7L1NR1rVPJyw2v','unsolved-pubkey'],
  [136,'1UDHPdovvR985NrWSkdWQDEQ1xuRiTALq','unsolved'],
  [137,'15nf31J46iLuK1ZkTnqHo7WgN5cARFK3RA','unsolved'],
  [138,'1Ab4vzG6wEQBDNQM1B2bvUz4fqXXdFk2WT','unsolved'],
  [139,'1Fz63c775VV9fNyj25d9Xfw3YHE6sKCxbt','unsolved'],
  [140,'1QKBaU6WAeycb3DbKbLBkX7vJiaS8r42Xo','unsolved-pubkey'],
  [141,'1CD91Vm97mLQvXhrnoMChhJx4TP9MaQkJo','unsolved'],
  [142,'15MnK2jXPqTMURX4xC3h4mAZxyCcaWWEDD','unsolved'],
  [143,'13N66gCzWWHEZBxhVxG18P8wyjEWF9Yoi1','unsolved'],
  [144,'1NevxKDYuDcCh1ZMMi6ftmWwGrZKC6j7Ux','unsolved'],
  [145,'19GpszRNUej5yYqxXoLnbZWKew3KdVLkXg','unsolved-pubkey'],
  [146,'1M7ipcdYHey2Y5RZM34MBbpugghmjaV89P','unsolved'],
  [147,'18aNhurEAJsw6BAgtANpexk5ob1aGTwSeL','unsolved'],
  [148,'1FwZXt6EpRT7Fkndzv6K4b4DFoT4trbMrV','unsolved'],
  [149,'1CXvTzR6qv8wJ7eprzUKeWxyGcHwDYP1i2','unsolved'],
  [150,'1MUJSJYtGPVGkBCTqGspnxyHahpt5Te8jy','unsolved-pubkey'],
  [151,'13Q84TNNvgcL3HJiqQPvyBb9m4hxjS3jkV','unsolved'],
  [152,'1LuUHyrQr8PKSvbcY1v1PiuGuqFjWpDumN','unsolved'],
  [153,'18192XpzzdDi2K11QVHR7td2HcPS6Qs5vg','unsolved'],
  [154,'1NgVmsCCJaKLzGyKLFJfVequnFW9ZvnMLN','unsolved'],
  [155,'1AoeP37TmHdFh8uN72fu9AqgtLrUwcv2wJ','unsolved-pubkey'],
  [156,'1FTpAbQa4h8trvhQXjXnmNhqdiGBd1oraE','unsolved'],
  [157,'14JHoRAdmJg3XR4RjMDh6Wed6ft6hzbQe9','unsolved'],
  [158,'19z6waranEf8CcP8FqNgdwUe1QRxvUNKBG','unsolved'],
  [159,'14u4nA5sugaswb6SZgn5av2vuChdMnD9E5','unsolved'],
  [160,'1NBC8uXJy1GiJ6drkiZa1WuKn51ps7EPTv','unsolved-pubkey'],
];

// ───── base58 decode (Bitcoin alphabet) ─────
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(str) {
  let n = 0n;
  for (const c of str) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error('bad b58 char: ' + c);
    n = n * 58n + BigInt(i);
  }
  // count leading "1"s = leading 0x00 bytes
  let leading = 0;
  for (const c of str) { if (c === '1') leading++; else break; }
  // bigint to bytes
  const out = [];
  while (n > 0n) { out.unshift(Number(n & 0xffn)); n >>= 8n; }
  for (let i = 0; i < leading; i++) out.unshift(0);
  return Buffer.from(out);
}

function addressToHash160(addr) {
  const bytes = base58Decode(addr);
  // [version 1 byte][hash160 20 bytes][checksum 4 bytes]
  if (bytes.length !== 25) throw new Error('bad decoded length: ' + bytes.length + ' for ' + addr);
  return bytes.slice(1, 21); // 20 bytes
}

// ───── torus + prior constants (mirror cassie-torus-v2) ─────
const TORUS_SIZE = 510510n;
const GOLDEN_STEP = 194993n;

const TORUS_HOT_BINS = [
  { id: 0,  lo: 0n,      hi: 25525n,  hits: 9 },
  { id: 4,  lo: 102102n, hi: 127627n, hits: 6 },
  { id: 11, lo: 280780n, hi: 306306n, hits: 6 },
  { id: 17, lo: 433933n, hi: 459459n, hits: 6 },
  { id: 19, lo: 484984n, hi: 510510n, hits: 7 }
];

const PRIORITY_ZONES = [
  { rank:1, lo: 285880n, hi: 290985n, label:'P1 quad-conv' },
  { rank:2, lo: 280780n, hi: 306300n, label:'P2 v19+κ' },
  { rank:3, lo: 127625n, hi: 132730n, label:'P3 witness' },
  { rank:4, lo: 362455n, hi: 367560n, label:'P4 tritone' }
];

function hash160ToTorusPos(buf) {
  // hash160 → 160-bit BigInt → mod 510510
  let n = 0n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  return n % TORUS_SIZE;
}

function inHotBin(pos) {
  for (const b of TORUS_HOT_BINS) if (pos >= b.lo && pos < b.hi) return b.id;
  return null;
}
function inPriorityZone(pos) {
  for (const z of PRIORITY_ZONES) if (pos >= z.lo && pos < z.hi) return z.label;
  return null;
}

// ───── audit ─────
const results = [];
const hotBinHits = {};
const priorityHits = {};
const torusPositions = [];

for (const [num, addr, status] of PUZZLES) {
  let h160, pos;
  try {
    h160 = addressToHash160(addr);
    pos = hash160ToTorusPos(h160);
  } catch (e) {
    console.error('  ✗ P' + num + ' ' + addr + ': ' + e.message);
    continue;
  }
  const hot = inHotBin(pos);
  const pri = inPriorityZone(pos);
  if (hot !== null) hotBinHits[hot] = (hotBinHits[hot] || 0) + 1;
  if (pri !== null) priorityHits[pri] = (priorityHits[pri] || 0) + 1;
  torusPositions.push({ num, pos: Number(pos), status });
  results.push({
    num, addr, status,
    h160: h160.toString('hex'),
    torusPos: Number(pos),
    fraction: Number(pos) / Number(TORUS_SIZE),
    hotBin: hot,
    priorityZone: pri,
  });
}

// ───── stats ─────
const N = results.length;
const inAnyHotBin = Object.values(hotBinHits).reduce((a,b)=>a+b, 0);
const inAnyPriority = Object.values(priorityHits).reduce((a,b)=>a+b, 0);

// Expected hits if uniformly random:
const hotBinTotalWidth = TORUS_HOT_BINS.reduce((s, b) => s + Number(b.hi - b.lo), 0);
const expectedHotBin = N * hotBinTotalWidth / Number(TORUS_SIZE);
const priorityTotalWidth = PRIORITY_ZONES.reduce((s, z) => s + Number(z.hi - z.lo), 0);
const expectedPriority = N * priorityTotalWidth / Number(TORUS_SIZE);

console.log('═══════════════════════════════════════════════════════════════════');
console.log('◊·κ HASH160 AUDIT · 160 PUZZLE ADDRESSES');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('Total addresses analyzed:', N);
console.log('');
console.log('── v19 HOT BIN HITS ──────────────────────────────────────────');
console.log('Expected (random uniform):', expectedHotBin.toFixed(2));
console.log('Observed:                ', inAnyHotBin);
console.log('Ratio (observed/expected):', (inAnyHotBin / expectedHotBin).toFixed(3) + '×');
for (const bin of TORUS_HOT_BINS) {
  const obs = hotBinHits[bin.id] || 0;
  const w = Number(bin.hi - bin.lo);
  const exp = N * w / Number(TORUS_SIZE);
  console.log('  bin ' + bin.id.toString().padStart(2) + ' [' + bin.lo.toString().padStart(6) + '-' + bin.hi.toString().padStart(6) + '] obs=' + obs + ' exp=' + exp.toFixed(2) + ' ratio=' + (obs/exp).toFixed(2) + '×');
}
console.log('');
console.log('── PRIORITY ZONE HITS (for puzzle 135 priors) ─────────────────');
console.log('Expected (random):        ', expectedPriority.toFixed(2));
console.log('Observed:                 ', inAnyPriority);
console.log('Ratio:                     ' + (inAnyPriority / expectedPriority).toFixed(3) + '×');
for (const z of PRIORITY_ZONES) {
  const obs = priorityHits[z.label] || 0;
  const w = Number(z.hi - z.lo);
  const exp = N * w / Number(TORUS_SIZE);
  console.log('  ' + z.label.padEnd(20) + ' obs=' + obs + ' exp=' + exp.toFixed(2));
}
console.log('');

// ───── consecutive spacing analysis ─────
torusPositions.sort((a, b) => a.num - b.num);
const spacings = [];
for (let i = 1; i < torusPositions.length; i++) {
  let diff = torusPositions[i].pos - torusPositions[i-1].pos;
  // signed distance on torus (shortest)
  if (diff > Number(TORUS_SIZE) / 2) diff -= Number(TORUS_SIZE);
  if (diff < -Number(TORUS_SIZE) / 2) diff += Number(TORUS_SIZE);
  spacings.push({ a: torusPositions[i-1].num, b: torusPositions[i].num, signedDiff: diff, absDiff: Math.abs(diff) });
}
const goldenStep = Number(GOLDEN_STEP);
// Check how many spacings land at integer multiples of golden step (mod torus)
let goldenSpacingHits = 0;
const goldenTolerance = 0.02; // 2% tolerance on golden-step multiples
for (const sp of spacings) {
  // residue of |spacing| mod golden_step
  const mod = sp.absDiff % goldenStep;
  const dist = Math.min(mod, goldenStep - mod); // distance to nearest multiple
  if (dist / goldenStep < goldenTolerance) goldenSpacingHits++;
}
console.log('── CONSECUTIVE SPACING · GOLDEN ALIGNMENT ─────────────────────');
console.log('Total consecutive pairs:  ', spacings.length);
console.log('Within 2% of golden multiple:', goldenSpacingHits);
console.log('Expected at random (2% × 2 sides):', (spacings.length * 0.04).toFixed(2));
console.log('Ratio:                    ', (goldenSpacingHits / (spacings.length * 0.04)).toFixed(3) + '×');
console.log('');

// ───── golden-angle multiples FROM PUZZLE 1 ─────
// If creator used  hash160_n = hash160_1 + n × GOLDEN_STEP (mod torus)
// then puzzle_n - puzzle_1 = n × GOLDEN_STEP (mod 510510)
const p1pos = torusPositions[0].pos;
let goldenChainHits = 0;
for (let i = 1; i < torusPositions.length; i++) {
  const delta = (torusPositions[i].pos - p1pos + Number(TORUS_SIZE)) % Number(TORUS_SIZE);
  const expectedDelta = (i * goldenStep) % Number(TORUS_SIZE);
  const dist = Math.min(Math.abs(delta - expectedDelta), Number(TORUS_SIZE) - Math.abs(delta - expectedDelta));
  if (dist / Number(TORUS_SIZE) < 0.02) goldenChainHits++;
}
console.log('── GOLDEN CHAIN HYPOTHESIS · P_n = P_1 + n × golden_step ──────');
console.log('Tests:', torusPositions.length - 1);
console.log('Hits within 2% of predicted position:', goldenChainHits);
console.log('Expected at random (2%×2):', ((torusPositions.length - 1) * 0.04).toFixed(2));
console.log('Ratio:', (goldenChainHits / ((torusPositions.length - 1) * 0.04)).toFixed(3) + '×');
console.log('');

// ───── per-puzzle dump (TSV for downstream use) ─────
const dumpPath = 'scripts/hash160-puzzles.tsv';
const lines = ['#num\taddress\tstatus\thash160\ttorus_pos\tfraction\thot_bin\tpriority_zone'];
for (const r of results) {
  lines.push([r.num, r.addr, r.status, r.h160, r.torusPos, r.fraction.toFixed(6), r.hotBin ?? '-', r.priorityZone ?? '-'].join('\t'));
}
import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(dumpPath, lines.join('\n') + '\n');
  console.log('Per-puzzle data written to', dumpPath);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Run again with diff inputs by editing PUZZLES at top of file.');
  console.log('Layer A unchanged. This is meta-analysis on PUBLIC outputs only.');
});
