import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {generateKeyPair,SignJWT} from 'jose';
const moduleOf=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule((await readFile(new URL(path,import.meta.url),'utf8')).replace("from 'jose'",`from '${new URL('../node_modules/jose/dist/webapi/index.js',import.meta.url)}'`),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const {verifyFirebaseToken}=await moduleOf('../lib/firebase-token.ts');
const {privateKey,publicKey}=await generateKeyPair('RS256');
const token=async overrides=>new SignJWT({auth_time:Math.floor(Date.now()/1000),...overrides}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('owner').setAudience('fishboard-36a96').setIssuer('https://securetoken.google.com/fishboard-36a96').setIssuedAt().setExpirationTime('5m').sign(privateKey);
test('Firebase token verifies project and signature, rejects missing/forged tokens',async()=>{
 assert.equal((await verifyFirebaseToken(await token({}),async()=>publicKey)).uid,'owner');
 await assert.rejects(verifyFirebaseToken('',async()=>publicKey));
 const wrong=await new SignJWT({auth_time:Math.floor(Date.now()/1000)}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('owner').setAudience('different').setIssuer('https://securetoken.google.com/fishboard-36a96').setIssuedAt().setExpirationTime('5m').sign(privateKey);
 await assert.rejects(verifyFirebaseToken(wrong,async()=>publicKey));
 const {publicKey:other}=await generateKeyPair('RS256');
 await assert.rejects(verifyFirebaseToken(await token({}),async()=>other));
 await assert.rejects(verifyFirebaseToken(await token({auth_time:Math.floor(Date.now()/1000)+1000}),async()=>publicKey));
});
const store=await moduleOf('../lib/firestore.ts');
test('Firestore operations stay in the verified owner namespace and update only position',async()=>{
 const original=globalThis.fetch,calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({fields:{id:{stringValue:'catch1'},x:{doubleValue:.25}},documents:[]})};
 try{const user={uid:'owner',token:'verified-token'};
 await store.createCatch(user,{id:'catch1',owner:'owner',name:'fish',date:'2026-10-06',x:.5,y:.4,source:'s',image:'i',created:'now'});
 await store.placeCatch(user,'catch1',.25,.75);
 assert.match(calls[0].url,/users\/owner\/catches\/catch1\?currentDocument.exists=false$/);
 assert.equal(calls[0].options.headers.Authorization,'Bearer verified-token');
 assert.deepEqual(JSON.parse(calls[1].options.body).fields,{x:{doubleValue:.25},y:{doubleValue:.75}});
 await assert.rejects(store.getCatch(user,'../../victim'));
 globalThis.fetch=async()=>new Response('',{status:403});await assert.rejects(store.listCatches(user));
 }finally{globalThis.fetch=original}
});
