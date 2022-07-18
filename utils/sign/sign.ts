
type Hex = Uint8Array | string;
type Ent = Hex | true;
type PrivKey = Hex | bigint | number;
type PubKey = Hex | Point;
type Sig = Hex | Signature;
type RecoveredSig = { sig: Signature; recovery: number};
type OptsRecov = { recovered?: true; canonical?: boolean; der?: boolean; extraEntropy?: Ent};
type OptsNoRecov = { recovered?: false; canonical?: boolean; der?: boolean; extraEntropy?: Ent};


const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const _3n = BigInt(3);
const _8n = BigInt(8);

const POW_2_256 = _2n ** BigInt(256);
const POW_2_128 = _2n ** BigInt(128);


const CURVE = {
    a: _0n,
    b: BigInt(7),
    P: POW_2_256 - _2n ** BigInt(32) - BigInt(977),
    n: POW_2_256 - BigInt('432420386565659656852420866394968145599'),
    h: _1n,
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee')
};

function randomBytes (bytesLength: number = 32) : Uint8Array {
    // return Uint8Array.from(getRandomBytes(bytesLength));
    const array = new Uint8Array(bytesLength);
    globalThis.crypto.getRandomValues(array);

    return array;
}

const divNearest = (a: bigint, b: bigint) => (a + b / _2n) / b;

function isUint8a (bytes: Uint8Array | unknown) : bytes is Uint8Array{
    return bytes instanceof Uint8Array;
}

const pointPrecomputes = new WeakMap<Point, JacobianPoint[]>();

const bytesToNumber : Function = async (bytes: Uint8Array) => {
    return hexToNumber(bytesToHex(bytes));
}

const bits2int : Function = (bytes: Uint8Array) => {
    const slice = bytes.length > 32 ? bytes.slice(0, 32) : bytes;
    return bytesToNumber(slice);
}

const bits2octets : Function = (bytes : Uint8Array) => {
    const z1 = bits2int(bytes);
    const z2 = mod(z1, CURVE.n);

    return int2octets( z2 < _0n ? z1 : z2);
}

const hexToNumber : Function = async (hex: string) => {
    if(typeof hex !== 'string'){
        throw new TypeError('hexToNumber: expected string');
    }

    return BigInt(`0x${hex}`);
} 

const hexes = Array.from({length: 256}, (v, i) => i.toString(16).padStart(2, '0'));
const bytesToHex : Function = async (uint8a: Uint8Array) => {
    if(!(uint8a instanceof Uint8Array)) throw new Error("Expected Uint8Array");

    let hex = '';

    for(let i = 0 ; i < uint8a.length ; i++){
        hex += hexes[uint8a[i]];
    }

    return hex;
    
} 

const hexToBytes : Function = async (hex: string) => {
    if(typeof hex !== 'string'){
        throw new TypeError("hexToBytes: expected string.");
    }

    if(hex.length % 2) throw new Error('hexToBytes: recieved invalid unpadded hex ' + hex.length);

    const array = new Uint8Array(hex.length / 2);

    for(let i = 0; i < array.length; i++){
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);

        if(Number.isNaN(byte) || byte < 0) throw new Error("Invalid byte sequence");
        array[i] = byte;
    }

    return array;
}

const concatBytes : Function = (...arrays: Uint8Array[]) => {
    if(!arrays.every(isUint8a)) throw new Error("Uint8Array list expected");
    if(arrays.length === 1) return arrays[0];

    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);

    for(let i = 0, pad = 0; i < arrays.length; i++){
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}

const ensureBytes : Function = async (hex : Hex)  => {
    return hex instanceof Uint8Array ? Uint8Array.from(hex) : hexToBytes(hex);
} 

const numTo32bStr : Function = async (num: number | bigint) => {
    if(num > POW_2_256) throw new Error('Expected number < 2^256');

    return num.toString(16).padStart(64, '0');
}

const int2octets : Function= async (num: bigint) => {
    if(typeof num !== 'bigint') throw new Error('Expected bigint');
    const hex = numTo32bStr(num);
    return hexToBytes(hex);
}

function mod (a: bigint, b: bigint = CURVE.P): bigint {
    const result = a % b;
    return result >= _0n ? result : b + result;
}

const invert : Function = async (number : bigint, modulo : bigint = CURVE.P) => {
    if(number === _0n || modulo <= _0n){
        throw new Error("invert: expected positive integers.");
    }

    let a = mod(number, modulo);
    let b = modulo;

    let x = _0n, y = _1n, u = _1n, v = _0n;

    while(a !== _0n){
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;

        b = a;
        a = r; 
        x = u; 
        y = v; 
        u = m; 
        v = n;
    }

    const gcd = b;

    if(gcd !== _1n) throw new Error("invert does not exist");
    return mod(x, modulo);
}

const invertBatch : Function = (nums: bigint[], p: bigint = CURVE.P) => {
    const scratch = new Array(nums.length);

    const lastMultiplied = nums.reduce((acc, num, i) => {
        if( num === _0n ) return acc;
        scratch[i] = acc;
        return mod(acc * num, p);
    }, _1n);

    const inverted = invert(lastMultiplied, p);

    nums.reduceRight((acc, num, i) => {
        if(num === _0n) return acc;
        scratch[i] = mod(acc * scratch[i], p);
        return mod(acc * num, p);
    }, inverted);

    return scratch;
}

const splitScalarEndo : Function = (k: bigint) => {
    const { n } = CURVE;
    
    const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
    const b1 = -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
    const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
    const b2 = a1;

    const c1 = divNearest(b2 * k, n);
    const c2 = divNearest(-b1 * k, n);

    let k1 = mod(k - c1 * a1 - c2 * a2, n);
    let k2 = mod(-c1 * b1 - c2 * b2, n);

    const k1neg = k1 > POW_2_128;
    const k2neg = k2 > POW_2_128;

    if(k1neg) k1 = n - k1;
    if(k2neg) k2 = n - k2;

    if(k1 > POW_2_128 || k2 > POW_2_128){
        throw new Error('splitScalarEndo: Endomorphism failed, k=' + k);
    }

    return { k1neg, k1, k2neg, k2 };
}

const normalizePrivateKey : Function = (key : PrivKey) => {
    let num: bigint;

    if(typeof key === 'bigint'){
        num = key;
    }else if(typeof key === 'number' && Number.isSafeInteger(key) && key > 0){
        num = BigInt(key);
    }else if(typeof key === 'string'){
        if(key.length !== 64) throw new Error("Expected 32 bytes of private key");
        num = hexToNumber(key);
    }else if(isUint8a(key)){
        if(key.length !== 32) throw new Error("Expected 32 bytes of private key");
        num = bytesToNumber(key);
    }else{
        throw new TypeError('Expected valid private key');
    }

    if(!isWithinCurveOrder(num)) throw new Error("Expected private key: 0 < key < n");
    return num;
}

const initSigArgs : Function = async (msgHash: Hex, pk: PrivKey, extraEntropy?:Ent ) => {
    
    if(msgHash == null) throw new Error(`sign: expected valid message hash, not "${msgHash}"`);

    const h1 = ensureBytes(msgHash);
    const d = normalizePrivateKey(pk);

    const seedArgs = [int2octets(d), bits2octets(h1)];

    if(extraEntropy != null){
        if(extraEntropy === true) extraEntropy = randomBytes(32);

        const e = ensureBytes(extraEntropy);
        if(e.length != 32) throw new Error(`sign: Expected 32 bytes of extra data`);
        seedArgs.push(e);
    }

    const seed = concatBytes(...seedArgs);
    const m = bits2int(h1);

    return { seed, m, d };
}

const sliceDER : Function = async (s: string) => {
    return Number.parseInt(s[0], 16) >= 8 ? '00' + s : s;
}

const numberToHexUnpadded : Function = async (num: number | bigint) => {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}

const normalizeScalar : Function = (num : number | bigint) => {
    if(typeof num === 'number' && Number.isSafeInteger(num) && num > 0) return BigInt(num); 
    if(typeof num === 'bigint' && isWithinCurveOrder(num)) return num;
    throw new TypeError("Expected valid private scalar: 0 < scalar < curve.n");
}

const USE_ENDOMORPHISM = CURVE.a === _0n;

class JacobianPoint {
    constructor(readonly x: bigint, readonly y: bigint, readonly z: bigint){}

    static readonly BASE = new JacobianPoint(CURVE.Gx, CURVE.Gy, _1n);
    static readonly ZERO = new JacobianPoint(_0n, _1n, _0n);

    static fromAffine(p: Point): JacobianPoint {
        if(!(p instanceof Point)){
            throw new TypeError('JacobianPoint#fromAffine: expected Point');
        }

        return new JacobianPoint(p.x, p.y, _1n);
    }

    static toAffineBatch(points: JacobianPoint[]): Point[] {
        const toInv = invertBatch(points.map((p) => p.z));
        return points.map((p, i) => p.toAffine(toInv[i]));
    }

    static normalizeZ(points: JacobianPoint[]): JacobianPoint[] {
        return JacobianPoint.toAffineBatch(points).map(JacobianPoint.fromAffine);
    }

    toAffine(invZ: bigint = invert(this.z)) : Point {
        const { x, y, z } = this;
        const iz1 = invZ;
        const iz2 = mod(iz1 * iz1);
        const iz3 = mod(iz2 * iz1);

        const ax = mod(x * iz2);
        const ay = mod(y * iz3);
        const zz = mod(x * iz1);

        if(zz !== _1n) throw new Error('invZ was invalid');
        return new Point(ax, ay);
    }

    multiply(scalar: number | bigint, affinePoint ?: Point): JacobianPoint {
        let n = normalizeScalar(scalar);
        let point: JacobianPoint;

        let fake: JacobianPoint;

        if(USE_ENDOMORPHISM){
            const { k1neg, k1, k2neg, k2 } = splitScalarEndo(n);

            let { p: k1p, f: f1p } = this.wNAF(k1, affinePoint);
            let { p: k2p, f: f2p } = this.wNAF(k2, affinePoint);

            if(k1neg) k1p = k1p.negate();
            if(k2neg) k2p = k2p.negate();

            k2p = new JacobianPoint(mod(k2p.x * CURVE.beta), k2p.y, k2p.z);

            point = k1p.add(k2p);
            fake = f1p.add(f2p);
        }else {
            const {p, f} = this.wNAF(n, affinePoint);
            point = p;
            fake = f;
        }

        return JacobianPoint.normalizeZ([point, fake])[0];
    }

    add(other: JacobianPoint): JacobianPoint {
        if(!(other instanceof JacobianPoint)) throw new TypeError("JacobianPoint expected");

        const { x: X1, y: Y1,  z: Z1} = this;
        const { x: X2, y: Y2,  z: Z2} = other;

        if(X2 === _0n || Y2 === _0n) return this;
        if(X1 === _0n || Y1 === _0n) return other;

        const Z1Z1 = mod(Z1 ** _2n);
        const Z2Z2 = mod(Z2 ** _2n);

        const U1 = mod(X1 * Z2Z2);
        const U2 = mod(X2 * Z1Z1);

        const S1 = mod(mod(Y1 * Z2) * Z2Z2);
        const S2 = mod(mod(Y2 * Z1) * Z1Z1);

        const H = mod(U2 - U1);
        const r = mod(S2 - S1);

        if(H === _0n){
            if(r === _0n) {
                return this.double();
            }else{
                return JacobianPoint.ZERO;
            }
        }

        const HH = mod(H ** _2n);
        const HHH = mod(H * HH);
        const V = mod(U1 * HH);
        const X3 = mod(r ** _2n - HHH - _2n * V);
        const Y3 = mod(r * (V - X3) - S1 * HHH);
        const Z3 = mod(Z1 * Z2 * H);

        return new JacobianPoint(X3, Y3, Z3);

    }

    negate(): JacobianPoint {
        return new JacobianPoint(this.x, mod(-this.y), this.z);
    }

    equals(other: JacobianPoint): boolean {
        if(!(other instanceof JacobianPoint)) throw new TypeError("JacobianPoint expected");

        const { x: X1, y: Y1, z: Z1} = this;
        const { x: X2, y: Y2, z: Z2} = other;

        const Z1Z1 = mod(Z1 ** _2n);
        const Z2Z2 = mod(Z2 ** _2n);
        const U1 = mod(X1 * Z2Z2);
        const U2 = mod(X2 * Z1Z1);

        const S1 = mod(mod(Y1 * Z2) * Z2Z2);
        const S2 = mod(mod(Y2 * Z1) * Z1Z1);

        return U1 === U2 && S1 === S2;
    }

    double(): JacobianPoint {
        const { x: X1, y: Y1, z: Z1} = this;

        const A = mod(X1 ** _2n);
        const B = mod(Y1 ** _2n);
        const C = mod(B ** _2n);
        const D = mod(_2n * (mod((X1 + B) ** _2n) - A - C));
        const E = mod(_3n * A);
        const F = mod(E ** _2n);
        const X3 = mod(F - _2n * D);
        const Y3 = mod(E * (D - X3) - _8n * C);
        const Z3 = mod(_2n * Y1 * Z1);

        return new JacobianPoint(X3, Y3, Z3);
    }

    private precomputeWindow(W: number): JacobianPoint[] {
        const windows = USE_ENDOMORPHISM ? 128 / W + 1 : 256 / W + 1;
        const points: JacobianPoint[] = [];

        let p: JacobianPoint = this;

        let base = p;

        for(let window = 0; window < windows; window++){
            base = p;
            points.push(base);

            for(let i = 1; i < 2 ** (W - 1); i++){
                base = base.add(p);
                points.push(base);
            }
            p = base.double();
        }

        return points;

    }

    private wNAF(n: bigint, affinePoint?: Point) : { p: JacobianPoint; f: JacobianPoint; } {
        if(!affinePoint && this.equals(JacobianPoint.BASE)) affinePoint = Point.BASE;

        const W = (affinePoint && affinePoint._WINDOW_SIZE) || 1;

        if(256 % W) {
            throw new Error('Point#wNAF: Invalid precomputation window, must be power of 2');
        }

        let precomputes = affinePoint && pointPrecomputes.get(affinePoint);

        if(!precomputes){
            precomputes = this.precomputeWindow(W);

            if(affinePoint && W !== 1){
                precomputes = JacobianPoint.normalizeZ(precomputes);
                pointPrecomputes.set(affinePoint, precomputes);
            }
        }

        let p = JacobianPoint.ZERO;
        let f = JacobianPoint.ZERO;

        const windows = 1 + (USE_ENDOMORPHISM ? 128 / W : 256 / W);
        const windowSize = 2 ** (W - 1);
        const mask = BigInt(2 ** W -1);
        const maxNumber = 2 ** W;
        const shiftBy = BigInt(W);
        
        for(let window = 0; window < windows ; window++) {
            const offset = window * windowSize;
            let wbits = Number(n & mask);

            n >>= shiftBy;

            if(wbits > windowSize) {
                wbits -= maxNumber;
                n += _1n;
            }

            if(wbits === 0){
                let pr = precomputes[offset];
                if(window % 2) pr = pr.negate();
                f = f.add(pr);
            }else {
                let cached = precomputes[offset + Math.abs(wbits) - 1];
                if(wbits < 0) cached = cached.negate();
                p = p.add(cached);
            }
        }

        return { p, f };

    }
};

class Signature {

    constructor(readonly r: bigint, readonly s: bigint){
        this.assertValidity();
    }

    assertValidity(): void {
        const { r, s } = this;
        if(!isWithinCurveOrder(r)) throw new Error("Invalid Signature: r must be 0 < r < n");
        if(!isWithinCurveOrder(s)) throw new Error("Invalid Signature: s must be 0 < r < n");
    }

    toDERRawBytes(isCompressed = false){
        return hexToBytes(this.toDERHex(isCompressed));
    }

    toDERHex(isCompressed = false){
        const sHex = sliceDER(numberToHexUnpadded(this.s));

        if(isCompressed) return sHex;

        const rHex = sliceDER(numberToHexUnpadded(this.r));
        const rLen = numberToHexUnpadded(rHex.length / 2);
        const sLen = numberToHexUnpadded(sHex.length / 2);
        const length = numberToHexUnpadded(rHex.length / 2 + sHex.length / 2 + 4);

        return `30${length}02${rLen}${rHex}02${sLen}${sHex}`;
    }

    hasHighS(): boolean {
        const HALF = CURVE.n >> _1n;
        return this.s > HALF;
    }

    toCompactRawBytes(){
        return numTo32bStr(this.r) + numTo32bStr(this.s);
    }

    normalizeS(): Signature{
        return this.hasHighS() ? new Signature(this.r, CURVE.n - this.s) : this;
    }
};

class HmacDrbg {
    k: Uint8Array;
    v: Uint8Array;

    counter: number;

    constructor() {
        this.v = new Uint8Array(32).fill(1);
        this.k = new Uint8Array(32).fill(0);
        this.counter = 0;
    }

    private hmac(...values: Uint8Array[]){
        return hmacSha256(this.k, ...values);
    }

    incr() {
        if(this.counter >= 1000){
            throw new Error("Tried 1000 values for sign(), all were invalid");
        }
    }

    async reseed(seed = new Uint8Array()){
        this.k = await this.hmac(this.v, Uint8Array.from([0x00]), seed);
        this.v = await this.hmac(this.v);

        if(seed.length === 0) return;

        this.k = await this.hmac(this.v, Uint8Array.from([0x01]), seed);
        this.v = await this.hmac(this.v);
    }

    async generate() : Promise<Uint8Array>{
        this.incr();
        this.v = await this.hmac(this.v);
        return this.v;
    }
}

class Point {
    static BASE: Point = new Point(CURVE.Gx, CURVE.Gy);

    static ZERO: Point = new Point(_0n, _0n);

    _WINDOW_SIZE ?: number;

    constructor(readonly x: bigint, readonly y: bigint){

    }

    _setWindowSize(windowSize: number){
        this._WINDOW_SIZE = windowSize;
        pointPrecomputes.delete(this);
    }

    multiply(scalar: number | bigint){
        return JacobianPoint.fromAffine(this).multiply(scalar, this).toAffine();
    }

    add(other : Point) {
        return JacobianPoint.fromAffine(this).add(JacobianPoint.fromAffine(other)).toAffine();
    }

    negate() {
        return new Point(this.x, mod(-this.y));
    }
};

const isWithinCurveOrder: Function = async (num: bigint) => {
    return _0n < num && num < CURVE.n;
}



const kmdToSig : Function = async (kBytes : Uint8Array, m : bigint, d: bigint) => {
    const k = bytesToNumber(kBytes);

    if(!isWithinCurveOrder(k)) return;

    const {n} = CURVE;

    const q = Point.BASE.multiply(k);

    const r = mod(q.x, n);
    if(r === _0n) return;

    const s = mod(invert(k, n) * mod(m + d * r, n), n);
    if(s === _0n) return;

    const sig = new Signature(r, s);

    const recovery = (q.x === sig.r ? 0 : 2) | Number(q.y & _1n);
    return {sig, recovery};
}

const finalizeSig: Function = async (recSig: RecoveredSig, opts: OptsNoRecov | OptsRecov) => {
    let {sig, recovery} = recSig;
    const {canonical, der, recovered} = Object.assign({
        canonical: true, der: true
    }, opts);

    if(canonical && sig.hasHighS()){
        sig = sig.normalizeS();
        recovery ^= 1;
    }

    const hashed = der ? sig.toDERRawBytes() : sig.toCompactRawBytes();

    return recovered ? [hashed, recovery] : hashed;
}

const sign : Function = async (msgHash: Hex, pk: PrivKey, opts={extraEntropy: true}) => {
    const {seed, m, d} = initSigArgs(msgHash, pk, opts.extraEntropy);

    let sig: RecoveredSig | undefined;

    const drbg = new HmacDrbg();
    await drbg.reseed(seed);

    while(!(sig = kmdToSig(await drbg.generate(), m, d))) await drbg.reseed();
    
    return finalizeSig(sig, opts);

}

export default sign