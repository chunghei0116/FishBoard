'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {onAuthStateChanged,GoogleAuthProvider,signInWithPopup,type User} from 'firebase/auth';
import {firebaseAuth} from '@/lib/firebase-client';
export function FirebaseSession({children}:{children:ReactNode}) {
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>onAuthStateChanged(firebaseAuth(),u=>{setUser(u);setLoading(false)}),[]);
 async function login(){setBusy(true);setError('');try{await signInWithPopup(firebaseAuth(),new GoogleAuthProvider())}catch(e){const code=(e as {code?:string}).code;setError(code==='auth/popup-closed-by-user'?'登入視窗已關閉，可以再試。':code==='auth/unauthorized-domain'?'呢個網址未加入 Firebase 登入設定。':'暫時未能登入，請再試一次。')}finally{setBusy(false)}}
 if(loading)return <main className="login-page"><p>開啟收藏室中…</p></main>;
 if(user)return <div key={user.uid}>{children}</div>;
 return <main className="login-page"><div className="login-card"><span className="eyebrow">MY WATERS, MY CATCHES.</span><h1>FISH LOG<span className="brand-dot"> ·</span></h1><p>每一條釣到的魚，都成為你的個人收藏。</p><button className="primary" disabled={busy} onClick={login}>{busy?'登入中…':'用 Google 開啟收藏室'}</button><p className="login-note">漁獲紀錄只限自己的帳戶存取。</p>{error&&<p role="alert">{error}</p>}</div></main>;
}
