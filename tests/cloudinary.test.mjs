import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64');
const cloudinaryURL = dataModule(await readFile(new URL('../lib/cloudinary.ts', import.meta.url), 'utf8'));
const media = await import(cloudinaryURL);
globalThis.__fishboardTestEnv = {};
globalThis.__fishboardTestUser = null;
const catchesSource = (await readFile(new URL('../lib/catches.ts', import.meta.url), 'utf8'))
  .replace(/import[^\n]+\n/g, '')
  .replace(/^export function bindings[^\n]+/m, 'export function bindings(){return globalThis.__fishboardTestEnv}')
  + '\nasync function verifyFirebaseToken(){if(!globalThis.__fishboardTestUser)throw new Error();return {uid:globalThis.__fishboardTestUser.userId,token:"test-token"}}\n';
const catchesURL = dataModule(catchesSource);
const firestoreURL = dataModule(await readFile(new URL('../lib/firestore.ts',import.meta.url),'utf8'));
async function route(path) {
  return import(dataModule((await readFile(new URL(path, import.meta.url), 'utf8'))
    .replaceAll('@/lib/firestore', firestoreURL).replaceAll('@/lib/cloudinary', cloudinaryURL).replaceAll('@/lib/catches', catchesURL)));
}
const imageRoute = await route('../app/api/images/[id]/route.ts');
const catchRoute = await route('../app/api/catches/route.ts');
const originalFetch = globalThis.fetch;
const credentials = { CLOUDINARY_CLOUD_NAME: 'testcloud', CLOUDINARY_API_KEY: 'key', CLOUDINARY_API_SECRET: 'secret' };
afterEach(() => { globalThis.fetch = originalFetch; globalThis.__fishboardTestUser = null; globalThis.__fishboardTestEnv = {}; });

test('cross-cloud and malformed image references fail before any network call', async () => {
  globalThis.fetch = () => { throw new Error('Network must not be called'); };
  for (const ref of ['cloudinary:other/fishboard/id/badge.png', 'cloudinary:testcloud/../../badge.png', 'https://attacker.invalid/image']) {
    await assert.rejects(media.readImage(credentials, ref), /Invalid Cloudinary image reference/);
  }
});

test('image route requires login and checks owner before contacting storage', async () => {
  globalThis.fetch = () => { throw new Error('Network must not be called'); };
  const request = new Request('https://fishboard.test/api/images/other',{headers:{Authorization:'Bearer test-token'}});
  const params = { params: Promise.resolve({ id: 'other' }) };
  assert.equal((await imageRoute.GET(request, params)).status, 401);
  globalThis.__fishboardTestUser = { userId: 'owner' };
  globalThis.fetch = async (url,options)=>{assert.match(url,/users\/owner\/catches\/other$/);assert.equal(options.headers.Authorization,'Bearer test-token');return new Response('',{status:404})};
  assert.equal((await imageRoute.GET(request, params)).status, 404);
});

for (const failure of ['badge upload', 'database write']) {
  test(`failed ${failure} rolls back only the newly uploaded authenticated images`, async () => {
    globalThis.__fishboardTestUser = { userId: 'owner' };
    globalThis.__fishboardTestEnv = { ...credentials, OPENAI_API_KEY: 'test-only', DB: {
      prepare() { return { bind() { return { run: async () => { throw new Error('DB unavailable'); } }; } }; },
    } };
    const uploaded = [], removed = [];
    globalThis.fetch = async (url, options) => {
      if (url === 'https://api.openai.com/v1/images/edits') return Response.json({ data: [{ b64_json: 'AA==' }] });
      if (url.endsWith('/upload')) {
        assert.equal(options.body.get('type'), 'authenticated');
        assert.equal(options.body.get('overwrite'), 'false');
        const public_id = options.body.get('public_id');
        if (failure === 'badge upload' && public_id.endsWith('/badge')) return new Response('', { status: 503 });
        uploaded.push(public_id);
        return Response.json({ public_id, format: 'png', type: 'authenticated' });
      }
      if(url.startsWith('https://firestore.googleapis.com/')) return new Response('',{status:503});
      assert.ok(url.endsWith('/destroy'));
      assert.equal(options.body.get('type'), 'authenticated');
      removed.push(options.body.get('public_id'));
      return Response.json({ result: 'ok' });
    };
    const form = new FormData();
    form.set('image', new File(['test'], 'fish.png', { type: 'image/png' }));
    form.set('date', '2026-10-05');
    const result = await catchRoute.POST(new Request('https://fishboard.test/api/catches', { method: 'POST', headers:{Authorization:'Bearer test-token'}, body: form }));
    assert.equal(result.status, 503);
    assert.equal(uploaded.length, failure === 'badge upload' ? 1 : 2);
    assert.deepEqual(removed, uploaded);
  });
}

test('image proxy rejects a forged reference to another owner even in an owned document',async()=>{
 globalThis.__fishboardTestUser={userId:'owner'};globalThis.__fishboardTestEnv=credentials;
 globalThis.fetch=async url=>{assert.match(url,/firestore.googleapis.com/);return Response.json({fields:{image:{stringValue:'cloudinary:testcloud/fishboard/victim/other/badge.png'}}})};
 const response=await imageRoute.GET(new Request('https://fishboard.test/api/images/other',{headers:{Authorization:'Bearer test-token'}}),{params:Promise.resolve({id:'other'})});assert.equal(response.status,404);
});
