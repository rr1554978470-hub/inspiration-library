const VERSION='inspiration-offline-v2';
const SCOPE=new URL(self.registration.scope);
const ROOT=SCOPE.pathname;
const CORE=['./','./manifest.webmanifest','./favicon.svg','./icon-192.png','./icon-512.png'].map(path=>new URL(path,SCOPE).pathname);

async function cacheShell(){
 const cache=await caches.open(VERSION),response=await fetch(ROOT,{cache:'reload'});
 if(response.ok){
  await cache.put(ROOT,response.clone());
  const html=await response.text(),urls=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>new URL(match[1],SCOPE)).filter(url=>url.origin===SCOPE.origin&&url.pathname.startsWith(ROOT)).map(url=>url.pathname+url.search);
  await Promise.allSettled([...new Set([...CORE,...urls])].map(url=>cache.add(url)));
 }else await cache.addAll(CORE);
}
self.addEventListener('install',event=>{event.waitUntil(cacheShell());self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok)(await caches.open(VERSION)).put(ROOT,response.clone());return response;}catch{return (await caches.match(ROOT))||Response.error();}})());return;
 }
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok)(await caches.open(VERSION)).put(request,response.clone());return response;}catch{return Response.error();}})());
});
