export type Identity = {uid:string;token:string};
export type CatchRow = {id:string;owner:string;name:string;date:string;x:number;y:number;source:string;image:string;created:string};
const root='https://firestore.googleapis.com/v1/projects/fishboard-36a96/databases/(default)/documents';
function path(user:Identity,id?:string) {
  if (!/^[\w-]{1,128}$/.test(user.uid) || (id && !/^[\w-]{1,128}$/.test(id))) throw new Error('Invalid document path');
  return `${root}/users/${user.uid}/catches${id?'/'+id:''}`;
}
async function call(user:Identity,url:string,options:RequestInit={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${user.token}`},signal:AbortSignal.timeout(15000)});
  if (response.status===404) return null;
  if (!response.ok) throw new Error('Firestore request failed');
  return response.json() as Promise<{fields?:Record<string,{stringValue?:string;doubleValue?:number;integerValue?:string}>;documents?:{fields:Record<string,{stringValue?:string;doubleValue?:number;integerValue?:string}>}[];nextPageToken?:string}>;
}
function decode(fields:Record<string,{stringValue?:string;doubleValue?:number;integerValue?:string}>) {
  return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.stringValue??v.doubleValue??Number(v.integerValue)])) as CatchRow;
}
function encode(row:Record<string,string|number>) {
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='number'?{doubleValue:v}:{stringValue:v}]));
}
export async function listCatches(user:Identity) {
  const rows:CatchRow[]=[]; let page='';
  do {const data=await call(user,path(user)+'?pageSize=1000'+(page?'&pageToken='+encodeURIComponent(page):''));
    rows.push(...(data?.documents||[]).map(doc=>decode(doc.fields)));page=data?.nextPageToken||'';
  } while(page);
  return rows.sort((a,b)=>a.created.localeCompare(b.created));
}
export async function getCatch(user:Identity,id:string) {const data=await call(user,path(user,id));return data?.fields?decode(data.fields):null;}
export async function createCatch(user:Identity,row:CatchRow) {
  const saved=await call(user,path(user,row.id)+'?currentDocument.exists=false',{method:'PATCH',body:JSON.stringify({fields:encode(row)})});
  if (!saved) throw new Error('Firestore could not save catch');
}
export async function placeCatch(user:Identity,id:string,x:number,y:number) {
  return !!await call(user,path(user,id)+'?updateMask.fieldPaths=x&updateMask.fieldPaths=y&currentDocument.exists=true',{method:'PATCH',body:JSON.stringify({fields:encode({x,y})})});
}
