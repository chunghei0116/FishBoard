// Only connected exterior colors are removed, so a white belly stays opaque.
export function removeBackdrop(input:Uint8ClampedArray,width:number,height:number) {
  if(width<2||height<2||input.length!==width*height*4)throw new Error('圖片尺寸無效。');
  const data=new Uint8ClampedArray(input),count=width*height;
  const corners=[0,width-1,(height-1)*width,count-1];
  const matte=[0,1,2].map(c=>corners.map(i=>data[i*4+c]).sort((a,b)=>a-b)[1]);
  const magenta=matte[0]>150&&matte[2]>150&&matte[1]<150;
  const seen=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
  const visit=(i:number)=>{if(seen[i])return;seen[i]=1;const p=i*4;
    const distance=Math.hypot(data[p]-matte[0],data[p+1]-matte[1],data[p+2]-matte[2]);
    const key=magenta&&data[p]>140&&data[p+2]>140&&data[p+1]<160&&Math.min(data[p],data[p+2])-data[p+1]>55;
    if(data[p+3]===0||distance<85||key)queue[tail++]=i;
  };
  for(let x=0;x<width;x++){visit(x);visit((height-1)*width+x)}
  for(let y=0;y<height;y++){visit(y*width);visit(y*width+width-1)}
  while(head<tail){const i=queue[head++];data[i*4+3]=0;const x=i%width,y=Math.floor(i/width);if(x>0)visit(i-1);if(x<width-1)visit(i+1);if(y>0)visit(i-width);if(y<height-1)visit(i+width)}
  let minX=width,minY=height,maxX=-1,maxY=-1,foreground=0;
  for(let i=0;i<count;i++){const p=i*4;if(!data[p+3])continue;foreground++;const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    for(let c=0;c<3;c++)data[p+c]=Math.min(255,Math.round(data[p+c]/16)*16);
  }
  if(foreground<count*.01||tail<count*.05)throw new Error('呢張魚圖未能完整去背，請用清晰的單尾魚照片再試。');
  return {data,x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
}
