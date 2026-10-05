'use client';
import {removeBackdrop} from './pixel-cutout';
async function imageFrom(blob:Blob){return createImageBitmap(blob)}
function canvas(width:number,height:number){const c=document.createElement('canvas');c.width=width;c.height=height;const context=c.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('瀏覽器未能處理圖片。');return {c,context}}
function toBlob(c:HTMLCanvasElement,type='image/png',quality?:number){return new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('未能匯出魚圖。')),type,quality))}
export async function fishReference(file:File) {
 const image=await imageFrom(file);try{const scale=Math.min(1,500/Math.max(image.width,image.height)),{c,context}=canvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));context.fillStyle='#fff';context.fillRect(0,0,c.width,c.height);context.drawImage(image,0,0,c.width,c.height);return toBlob(c,'image/jpeg',.9)}finally{image.close()}
}
export async function transparentPixelFish(blob:Blob) {
 const image=await imageFrom(blob);try{
  const {c,context}=canvas(128,128);context.drawImage(image,0,0,128,128);
  const cutout=removeBackdrop(context.getImageData(0,0,128,128).data,128,128);
  context.putImageData(new ImageData(cutout.data,128,128),0,0);
  const pad=5,output=canvas((cutout.width+pad*2)*3,(cutout.height+pad*2)*3);output.context.imageSmoothingEnabled=false;
  output.context.drawImage(c,cutout.x,cutout.y,cutout.width,cutout.height,pad*3,pad*3,cutout.width*3,cutout.height*3);
  return toBlob(output.c);
 }finally{image.close()}
}
