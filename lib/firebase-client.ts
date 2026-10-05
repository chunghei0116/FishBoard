'use client';
import {initializeApp,getApps,getApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
const config={apiKey:'AIzaSyC6e9JlzD6z-Vm2NhRCC6Jla-1TEABxWX0',authDomain:'fishboard-36a96.firebaseapp.com',projectId:'fishboard-36a96',storageBucket:'fishboard-36a96.firebasestorage.app',messagingSenderId:'505835202125',appId:'1:505835202125:web:97d4d09c4acac5a63d1e04'};
export function firebaseAuth(){return getAuth(getApps().length?getApp():initializeApp(config));}
export async function firebaseRequest(url:string,options:RequestInit={}) {
 const user=firebaseAuth().currentUser;
 if (!user) throw new Error('請先用 Google 登入。');
 const headers=new Headers(options.headers);headers.set('Authorization',`Bearer ${await user.getIdToken()}`);
 return fetch(url,{...options,headers,cache:'no-store'});
}
