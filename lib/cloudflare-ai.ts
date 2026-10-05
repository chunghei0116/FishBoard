export type CloudflareAIEnv = {CLOUDFLARE_ACCOUNT_ID?:string;CLOUDFLARE_AI_TOKEN?:string};
export function cloudflareAIConfigured(env:CloudflareAIEnv) {
  return !!env.CLOUDFLARE_AI_TOKEN && /^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID||'');
}
export class GenerationError extends Error {constructor(message:string,public status=502){super(message)}}
export async function generatePixelFish(env:CloudflareAIEnv,reference:Blob) {
  if(!cloudflareAIConfigured(env))throw new GenerationError('Cloudflare 生圖連線尚未設定。',503);
  const form=new FormData();
  form.set('input_image_0',reference,'fish.jpg');form.set('width','512');form.set('height','512');
  form.set('prompt',"Transform ONLY the fish in input image 0 into a single charming 16-bit pixel-art game sprite. Preserve this exact fish's species, silhouette, markings, stripes, fin shapes and colors. Full body side profile facing left, centered, all fins and tail visible with generous empty margins. Crisp square pixel clusters, limited 16-color palette, dark charcoal 1-pixel outline, no smooth gradients, no realistic texture. Remove hands, people, hooks, rods and all scenery. Put the single fish on a perfectly uniform flat bright magenta (#FF00FF) background for chroma key extraction. No shadows, floor, water, bubbles, lettering, border, frame or checkerboard. The entire image perimeter must be plain magenta. Do not use magenta on the fish.");
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`,{method:'POST',headers:{Authorization:`Bearer ${env.CLOUDFLARE_AI_TOKEN}`},body:form,signal:AbortSignal.timeout(180000)});
  if(response.status===429||response.status===402)throw new GenerationError('Cloudflare 免費額度已用完或服務繁忙，請稍後再試。',429);
  if(!response.ok)throw new GenerationError('暫時未能生成像素魚，請稍後再試。');
  const data=await response.json() as {success?:boolean;result?:{image?:string}};
  const encoded=data.result?.image;
  if(data.success===false||!encoded||encoded.length>12*1024*1024)throw new GenerationError('生圖服務未有傳回有效圖片。');
  let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}catch{throw new GenerationError('生圖服務傳回的圖片無法讀取。')}
  const type=bytes[0]===137&&bytes[1]===80?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':null;
  if(!type)throw new GenerationError('生圖服務傳回的圖片格式無效。');
  return new Blob([bytes],{type});
}
