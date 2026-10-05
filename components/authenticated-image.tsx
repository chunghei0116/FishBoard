'use client';
import {useEffect,useState,type ImgHTMLAttributes} from 'react';
import {firebaseRequest} from '@/lib/firebase-client';
export function AuthenticatedImage({src,alt,...props}:ImgHTMLAttributes<HTMLImageElement>) {
 const [image,setImage]=useState({source:'',url:''});
 const url=image.source===src?image.url:'';
 useEffect(()=>{if(typeof src!=="string")return;const controller=new AbortController();let objectUrl='';
 firebaseRequest(src,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error('Image unavailable');return r.blob()}).then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setImage({source:src,url:objectUrl})}).catch(()=>{});
 return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[src]);
 return url?<img {...props} src={url} alt={alt}/>:<span className={props.className} role="img" aria-label={alt}/>;
}
