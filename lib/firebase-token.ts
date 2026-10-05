import { importX509, jwtVerify, type JWTHeaderParameters } from 'jose';
const project = 'fishboard-36a96';
let certificates: Record<string,string> = {};
let expires = 0;
async function googleKey(header: JWTHeaderParameters) {
  if (Date.now() >= expires) {
    const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Firebase verification unavailable');
    certificates = await response.json() as Record<string,string>;
    const seconds = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1] || 300);
    expires = Date.now() + seconds * 1000;
  }
  if (!header.kid || !Object.hasOwn(certificates,header.kid)) throw new Error('Invalid Firebase signing key');
  return importX509(certificates[header.kid], 'RS256');
}
export async function verifyFirebaseToken(token:string, resolveKey:(header:JWTHeaderParameters)=>Promise<CryptoKey> = googleKey) {
  const {payload} = await jwtVerify(token, resolveKey, {algorithms:['RS256'],issuer:`https://securetoken.google.com/${project}`,audience:project,requiredClaims:['exp','iat','sub','auth_time']});
  const now=Math.floor(Date.now()/1000);
  if (!payload.sub || !/^[\w-]{1,128}$/.test(payload.sub) || typeof payload.iat!=='number' || payload.iat>now || typeof payload.auth_time!=='number' || payload.auth_time>now) throw new Error('Invalid Firebase identity');
  return {uid:payload.sub,token};
}
