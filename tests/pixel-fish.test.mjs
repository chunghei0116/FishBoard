import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
const {removeBackdrop}=await load('../lib/pixel-cutout.ts');
test('cutout removes connected matte while preserving white fish and internal pixels',()=>{
 const w=10,h=10,data=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++)data.set([255,0,255,255],i*4);
 for(let y=3;y<7;y++)for(let x=2;x<8;x++)data.set([255,255,255,255],(y*w+x)*4);
 data.set([40,50,60,255],(4*w+4)*4);
 const result=removeBackdrop(data,w,h);
 assert.equal(result.data[3],0);assert.equal(result.data[(3*w+3)*4+3],255);assert.equal(result.data[(4*w+4)*4+3],255);
 assert.equal(result.width,6);assert.equal(result.height,4);
});
test('empty or unisolated output is rejected rather than saved as a square',()=>{
 assert.throws(()=>removeBackdrop(new Uint8ClampedArray(16*4).fill(255),4,4));
});
const {generatePixelFish}=await load('../lib/cloudflare-ai.ts');
test('Cloudflare uses uploaded reference with Klein multipart and surfaces quota failures',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/@cf\/black-forest-labs\/flux-2-klein-4b$/);assert.ok(options.body.get('input_image_0') instanceof Blob);assert.equal(options.body.get('width'),'512');assert.equal(options.headers.Authorization,'Bearer token');return Response.json({success:true,result:{image:'iVBORw0KGgo='}})};
 const output=await generatePixelFish({CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_AI_TOKEN:'token'},new Blob(['reference'],{type:'image/jpeg'}));assert.equal(output.type,'image/png');assert.equal(calls,1);
 globalThis.fetch=async()=>Response.json({success:false,errors:[{message:'quota exceeded'}]},{status:429});await assert.rejects(generatePixelFish({CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_AI_TOKEN:'token'},new Blob()),/免費額度/);
 }finally{globalThis.fetch=original}
});
