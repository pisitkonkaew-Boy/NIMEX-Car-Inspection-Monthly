/* NIMEX Car Inspection Monthly — mobile-first.
   Data: Google Sheet + Drive via Apps Script (config.js INSPECT_API).
   Photos are shrunk on the phone, queued in IndexedDB and sent when there is signal. */
(()=>{'use strict';
const API=window.INSPECT_API||'',MAXY=+window.TYRE_MAX_YEARS||5;
const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('th-TH');
const TYN={'040':'040 ปิกอัพ (AB)','042':'042 ควบคุมอุณหภูมิ (CC)'},GRP={A:'รถใช้งาน',S:'รถ Stock'};
const THM=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const monthNow=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const mLabel=m=>{const[y,x]=m.split('-');return THM[+x-1]+' '+(+y+543)};
const pad=n=>String(n).padStart(2,'0');
const dtLabel=s=>{if(!s)return'';const d=new Date(s);if(isNaN(d))return String(s);return d.getDate()+' '+THM[d.getMonth()]+' '+(d.getFullYear()+543)+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const IC={
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
 car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6h13v10H1zM14 9h4l4 4v3h-8z"/><circle cx="5.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/></svg>',
 chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
 chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>',
 edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
 file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'};

/* ---------- form definition (from the paper form) ---------- */
const PHOTO=[
 {k:'body',t:'ภาพรถเต็มคัน 4 ด้าน',c:'#f4c430',s:[['front','ด้านหน้า'],['back','ด้านหลัง'],['right','ด้านข้างขวา'],['left','ด้านข้างซ้าย']]},
 {k:'engine',t:'ห้องเครื่อง / แบตเตอรี่ / หน้าปัดเลขไมล์',c:'#f28b7d',s:[['engine','ห้องเครื่อง'],['battery','แบตเตอรี่'],['odo','หน้าปัดเลขไมล์']]},
 {k:'tyre',t:'ยางถ่ายเต็มวง 4 เส้น',c:'#a8d86e',s:[['tFL','ยางหน้าซ้าย'],['tFR','ยางหน้าขวา'],['tRL','ยางหลังซ้าย'],['tRR','ยางหลังขวา']]},
 {k:'dot',t:'ถ่ายเห็นปียาง',c:'#f7b23b',s:[['dFL','ปียาง หน้าซ้าย'],['dFR','ปียาง หน้าขวา'],['dRL','ปียาง หลังซ้าย'],['dRR','ปียาง หลังขวา']]},
 {k:'spare',t:'ยางอะไหล่',c:'#c58af0',s:[['spare','ยางอะไหล่']]},
 {k:'cabin',t:'ห้องโดยสาร',c:'#8cc8f5',s:[['cabin','ห้องโดยสาร']]},
 {k:'box',t:'ภาพภายในตู้ หน้า-หลัง',c:'#6fdcd0',s:[['boxF','ภายในตู้ ด้านหน้า'],['boxB','ภายในตู้ ด้านหลัง']]},
 {k:'curtain',t:'ม่านความเย็น',c:'#9fb8ff',only:'042',s:[['curtain','ม่านความเย็น']]},
 {k:'cam',t:'กล้องหน้ารถ',c:'#ffb38a',s:[['dashcam','กล้องหน้ารถ']]}];
/* dash camera status, stored as checks.dashcam = {v:'ok'|'bad'|'na', s:status, n:label} */
const CAM=[['ok','มี ใช้งานได้'],['none','ไม่มีกล้อง'],['broken','มี แต่กล้องเสีย'],['card','มี แต่เมมโมรี่การ์ดเสีย']];
const CAML=Object.fromEntries(CAM);
const camS=f=>((f.checks||{}).dashcam||{}).s||'';
const photoFor=t=>PHOTO.filter(s=>!s.only||s.only===t||!TYN[t]);
/* example photos shown inside empty slots (from the paper form sample) */
const GUIDE=new Set(['front','back','right','left','engine','tFL','tFR','tRL','tRR','dFL','dFR','dRL','dRR','spare','cabin','boxF','boxB','curtain']);
const LBL=Object.fromEntries(PHOTO.flatMap(x=>x.s));LBL.damage='จุดที่ผิดปกติ';LBL.claim='ใบเคลม / ประวัติรถ';
const TY=[['FL','หน้าซ้าย'],['FR','หน้าขวา'],['RL','หลังซ้าย'],['RR','หลังขวา']];
const CHECKS=[
 ['headlight','ไฟหน้า (ต่ำ / สูง)'],['taillight','ไฟท้าย / ไฟเบรก'],['signal','ไฟเลี้ยว / ไฟฉุกเฉิน'],
 ['brake','เบรก'],['handbrake','เบรกมือ'],['ac','แอร์ห้องโดยสาร'],['horn','แตร'],['wiper','ที่ปัดน้ำฝน'],
 ['mirror','กระจก / กระจกมองข้าง'],['belt','เข็มขัดนิรภัย'],['fluid','น้ำมันเครื่อง / น้ำหล่อเย็น'],
 ['dash','ไฟเตือนหน้าปัด','ไม่มีไฟเตือนค้าง'],['door','ประตูตู้ / ซีลยาง / กุญแจ'],
 ['reefer','ตู้เย็น (เครื่องทำความเย็น)','เฉพาะรถ 042 ควบคุมอุณหภูมิ',t=>t==='042'],
 ['curtain','ม่านความเย็น','ม่านครบ ไม่ขาด ไม่หลุดราง · เฉพาะรถ 042',t=>t==='042']];
const CKL=Object.fromEntries(CHECKS.map(c=>[c[0],c[1]]));CKL.dashcam='กล้องหน้ารถ';
const checksFor=t=>CHECKS.filter(c=>!c[3]||c[3](t)||!TYN[t]);
function tyreAge(s){s=String(s||'');if(!/^\d{4}$/.test(s))return null;const wk=+s.slice(0,2),yr=2000+(+s.slice(2));if(wk<1||wk>53)return null;const a=(Date.now()-new Date(yr,0,1+(wk-1)*7))/31557600000;return a<-0.05?null:Math.max(0,a)}
const ageTxt=a=>{const y=Math.floor(a),m=Math.floor((a-y)*12);return[y?y+' ปี':'',m||!y?m+' เดือน':''].filter(Boolean).join(' ')};
const tyreOld=t=>TY.some(([k])=>{const a=tyreAge((t||{})[k]);return a!=null&&a>=MAXY});
/* required / optional and notes come from the admin settings (Settings sheet, key "form") */
const rq0=(c,k,d)=>{const r=((c||{}).req||{})[k];return r===undefined?d:!!r};
const rq=(k,d)=>rq0(S.cfg,k,d),nt=k=>((S.cfg||{}).note||{})[k]||'';
function missing(f){const m=[];
 if(!(f.inspector||'').trim())m.push(['info','ชื่อผู้ตรวจ']);
 if(rq('mile',0)&&!String(f.mile||'').trim())m.push(['info','เลขไมล์']);
 if(rq('cam',1)&&!camS(f))m.push(['cam','สถานะกล้องหน้ารถ']);
 photoFor(f.type).forEach(sec=>sec.s.forEach(([k,l])=>{if(k==='dashcam'&&camS(f)==='none')return;if(rq(k,1)&&!f.photos[k])m.push([sec.k,'รูป'+l])}));
 if(rq('tyres',1))TY.forEach(([k,l])=>{if(tyreAge(f.tyres[k])==null)m.push(['dot','ปียาง'+l])});
 checksFor(f.type).forEach(([k,l])=>{if(rq('ck:'+k,1)&&!(f.checks[k]&&f.checks[k].v))m.push(['check',l])});
 if(rq('issue',1)){if(!f.issue.v)m.push(['issue','สรุปความผิดปกติ']);else if(f.issue.v==='has'&&!(f.issue.t||'').trim())m.push(['issue','รายละเอียดความผิดปกติ'])}
 else if(f.issue.v==='has'&&!(f.issue.t||'').trim())m.push(['issue','รายละเอียดความผิดปกติ']);
 return m}
const totalItems=f=>1+(rq('mile',0)?1:0)+(rq('cam',1)?1:0)+photoFor(f.type).reduce((a,s)=>a+s.s.filter(([k])=>rq(k,1)&&!(k==='dashcam'&&camS(f)==='none')).length,0)+(rq('tyres',1)?TY.length:0)+checksFor(f.type).filter(([k])=>rq('ck:'+k,1)).length+(rq('issue',1)?1:0);
const badList=f=>Object.keys(f.checks||{}).filter(k=>f.checks[k]&&f.checks[k].v==='bad');
const resultOf=f=>(f.issue&&f.issue.v==='has')||badList(f).length?'issue':'ok';

/* ---------- storage (IndexedDB, falls back to memory) ---------- */
const IDB=(()=>{let dbp=null;const mem={};const m=s=>mem[s]||(mem[s]=new Map());
 const open=()=>dbp||(dbp=new Promise((res,rej)=>{try{const r=indexedDB.open('nimex-insp',1);r.onupgradeneeded=()=>{['photos','map','outbox','drafts','cache'].forEach(n=>r.result.createObjectStore(n))};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}).catch(()=>null));
 const run=async(s,mode,fn,memfn)=>{const d=await open();if(!d)return memfn(m(s));return new Promise((res,rej)=>{const t=d.transaction(s,mode),q=fn(t.objectStore(s));t.oncomplete=()=>res(q&&'result'in q?q.result:undefined);t.onerror=t.onabort=()=>rej(t.error)})};
 return{get:(s,k)=>run(s,'readonly',o=>o.get(k),x=>x.get(k)),
  put:(s,k,v)=>run(s,'readwrite',o=>o.put(v,k),x=>{x.set(k,v)}),
  del:(s,k)=>run(s,'readwrite',o=>o.delete(k),x=>{x.delete(k)}),
  all:async s=>{const d=await open();if(!d)return[...m(s).entries()];return new Promise((res,rej)=>{const out=[],t=d.transaction(s),c=t.objectStore(s).openCursor();c.onsuccess=()=>{const x=c.result;if(x){out.push([x.key,x.value]);x.continue()}};t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)})}}})();
const LS={get:k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------- state ---------- */
const S={sess:LS.get('insp-sess'),pub:null,cars:[],carBy:{},dcs:{},zones:[],month:monthNow(),recs:{},pend:{},drafts:{},MAP:{},LOCAL:{},nPhotos:0,
 view:'cars',filt:'all',q:'',dcSel:null,form:null,online:navigator.onLine,loadedMonth:null};
const isStaff=()=>S.sess&&(S.sess.role==='insp'||S.sess.role==='admin');
const isAdmin=()=>S.sess&&S.sess.role==='admin';
const dcName=dc=>S.dcs[dc]?S.dcs[dc].name:'DC '+dc;

/* ---------- API ---------- */
async function api(body,key){const s=S.sess||{};const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,key:key||s.key,who:s.name||'',wdc:s.dc||''})});
 const j=await r.json();if(!j.ok){const e=new Error(j.error||'failed');e.code=j.error;throw e}return j}
async function loadPub(){try{const r=await fetch(API+(API.includes('?')?'&':'?')+'t='+Date.now());const j=await r.json();if(!j.cars)throw 0;await IDB.put('cache','pub',j);return j}catch(e){const c=await IDB.get('cache','pub');if(c){c.stale=1;return c}throw e}}
function setPub(p){S.pub=p;S.cfg=(p.cfg&&p.cfg.form)||{};S.cars=p.cars.map(c=>({pl:c[0],ty:c[1],yr:c[2],dc:String(c[3]),g:c[4]}));S.carBy=Object.fromEntries(S.cars.map(c=>[c.pl,c]));
 S.dcs={};S.zones=[];p.dcs.forEach(d=>{S.dcs[String(d[0])]={dc:String(d[0]),name:d[1],zone:d[2]};if(!S.zones.includes(d[2]))S.zones.push(d[2])});
 S.cars.forEach(c=>{if(!S.dcs[c.dc]){S.dcs[c.dc]={dc:c.dc,name:'DC '+c.dc,zone:'อื่นๆ'};if(!S.zones.includes('อื่นๆ'))S.zones.push('อื่นๆ')}})}
const norm=r=>{r.photos=r.photos||{};r.photos.damage=r.photos.damage||[];r.photos.claim=r.photos.claim||[];r.checks=r.checks||{};r.tyres=r.tyres||{};r.issue=r.issue&&typeof r.issue==='object'?r.issue:{v:'',t:''};return r};
async function loadRecs(month){S.recs={};if(!isStaff())return;
 try{const j=await api({a:'list',month});j.rows.forEach(r=>{S.recs[r.plate]=norm(r)});await IDB.put('cache','recs-'+month,j.rows)}
 catch(e){if(e.code==='denied'){logout('รหัสถูกเปลี่ยน กรุณาเข้าสู่ระบบใหม่');throw e}const c=await IDB.get('cache','recs-'+month);(c||[]).forEach(r=>{S.recs[r.plate]=norm(r)});toast('ออฟไลน์: แสดงข้อมูลล่าสุดที่มีในเครื่อง')}
 S.loadedMonth=month}

/* ---------- photo refs: "d:<driveId>[#pdf]" = uploaded, "l:<key>" = waiting on this phone ---------- */
const isPdf=r=>/#pdf$/.test(r||'');
const driveId=r=>{if(!r)return null;if(r.startsWith('l:')){const m=S.MAP[r.slice(2)];return m?m.slice(2).split('#')[0]:null}return r.slice(2).split('#')[0]};
const resolved=r=>r&&r.startsWith('l:')?(S.MAP[r.slice(2)]||null):r;
const thumb=window.DRIVE_THUMB||((id,sz)=>`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${sz}`);
function refUrl(r,sz=400){if(!r)return null;if(r.startsWith('l:')&&S.LOCAL[r.slice(2)])return S.LOCAL[r.slice(2)];const id=driveId(r);return id?thumb(id,sz):null}
const openUrl=r=>{const id=driveId(r);return id?`https://drive.google.com/file/d/${encodeURIComponent(id)}/view`:refUrl(r,1600)};
function bg(r,sz){if(isPdf(r))return'';const u=refUrl(r,sz);return u?`style="background-image:url('${u}')"`:`data-lref="${esc(r)}"`}
async function hydrate(root){for(const el of $$('[data-lref]',root)){const r=el.dataset.lref,k=r.slice(2);if(!S.LOCAL[k]){const p=await IDB.get('photos',k);if(p)S.LOCAL[k]=URL.createObjectURL(b64Blob(p.data,p.mime))}const u=refUrl(r,400);if(u){el.style.backgroundImage=`url('${u}')`;el.removeAttribute('data-lref')}}}
function b64Blob(b,mime){const s=atob(b),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return new Blob([a],{type:mime})}
const blobB64=b=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result).split(',')[1]);f.onerror=rej;f.readAsDataURL(b)});

/* shrink to 1600px JPEG and stamp plate / label / time on the photo */
async function shrink(file,plate,label){const url=URL.createObjectURL(file);try{
 const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('อ่านรูปไม่ได้'));i.src=url});
 const M=1600,s=Math.min(1,M/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*s),h=Math.round(img.naturalHeight*s);
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);
 const a=analyze(c),warn=[];let fixed=false;
 if(a.mean<100&&a.hi-a.lo>8){autoLight(c,a);fixed=true}
 if(a.mean<30)warn.push('รูปมืดมาก');if(a.sharp<15)warn.push('รูปเบลอหรือสั่น');
 try{await document.fonts.load('500 20px Prompt')}catch(e){}
 const fs=Math.max(14,Math.round(Math.min(w,h)*0.034)),bh=Math.round(fs*1.9),d=new Date();
 const txt=`${plate} · ${label} · ${d.getDate()} ${THM[d.getMonth()]} ${d.getFullYear()+543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
 x.fillStyle='rgba(6,26,61,.72)';x.fillRect(0,h-bh,w,bh);x.fillStyle='#d4af37';x.fillRect(0,h-bh,Math.max(4,fs*.3),bh);
 x.font=`500 ${fs}px Prompt, sans-serif`;x.fillStyle='#fff';x.textBaseline='middle';x.fillText(txt,fs*.9,h-bh/2,w-fs*1.4);
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.8));return{blob,warn,fixed}}finally{URL.revokeObjectURL(url)}}
/* brightness (0-255), 1%/99% levels and sharpness (variance of the Laplacian) on a small copy */
function analyze(src){const W=160,H=Math.max(2,Math.round(src.height*W/src.width)),s=document.createElement('canvas');s.width=W;s.height=H;const x=s.getContext('2d');x.drawImage(src,0,0,W,H);
 const d=x.getImageData(0,0,W,H).data,L=new Float32Array(W*H);let sum=0;for(let i=0,j=0;i<d.length;i+=4,j++){L[j]=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];sum+=L[j]}
 const sorted=Float32Array.from(L).sort(),lo=sorted[Math.floor(L.length*0.01)],hi=sorted[Math.floor(L.length*0.99)];
 let m=0,v=0,n=0;for(let y=1;y<H-1;y++)for(let q=1;q<W-1;q++){const k=y*W+q,t=4*L[k]-L[k-1]-L[k+1]-L[k-W]-L[k+W];m+=t;v+=t*t;n++}
 return{mean:sum/L.length,lo,hi,sharp:n?v/n-(m/n)*(m/n):0}}
/* stretch the levels and lift the mid-tones of a dark photo */
function autoLight(c,a){const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;
 const lo=a.lo,span=Math.max(1,a.hi-lo),m=Math.min(0.9,Math.max(0.02,(a.mean-lo)/span)),g=Math.min(1,Math.max(0.45,Math.log(0.45)/Math.log(m)));
 const lut=new Uint8ClampedArray(256);for(let i=0;i<256;i++){const t=Math.min(1,Math.max(0,(i-lo)/span));lut[i]=Math.round(255*Math.pow(t,g))}
 for(let i=0;i<d.length;i+=4){d[i]=lut[d[i]];d[i+1]=lut[d[i+1]];d[i+2]=lut[d[i+2]]}x.putImageData(im,0,0)}

/* ---------- sync queue ---------- */
let syncing=false,retryT=null;
async function countPending(){S.nPhotos=(await IDB.all('photos')).length;updSync()}
function updSync(){const el=$('#sync');if(!el)return;if(!isStaff()){el.textContent='';return}
 const n=S.nPhotos,r=Object.keys(S.pend).length;
 if(!n&&!r){el.className='sync ok';el.textContent=S.online?'✓ ส่งครบ':'ออฟไลน์';return}
 el.className='sync '+(S.online?'wait':'off');el.textContent=(S.online?(syncing?'กำลังส่ง ':'รอส่ง '):'ออฟไลน์ · รอส่ง ')+(n?n+' รูป':'')+(n&&r?' · ':'')+(r?r+' คัน':'')}
async function sync(){if(syncing||!isStaff()||!API)return;syncing=true;clearTimeout(retryT);updSync();let fail=false;
 try{
  for(const[k,p]of await IDB.all('photos')){const j=await api({a:'photo',month:p.month,dc:p.dc,plate:p.plate,slot:p.slot,data:p.data,mime:p.mime});
   const ref='d:'+j.id+(p.mime==='application/pdf'?'#pdf':'');S.MAP[k]=ref;await IDB.put('map',k,ref);await IDB.del('photos',k);S.nPhotos=Math.max(0,S.nPhotos-1);updSync();
   $$(`[data-view="l:${k}"] .st`).forEach(el=>{el.className='st';el.textContent='✓ ส่งแล้ว'})}
  for(const[id]of await IDB.all('outbox')){
   /* read both fresh: a record may have been saved while photos were being sent */
   const rec=await IDB.get('outbox',id);if(!rec)continue;const waiting=new Set((await IDB.all('photos')).map(x=>x[0]));
   const r=resolveRec(rec,waiting);if(!r)continue;
   const j=await api({a:'save',rec:r});const now=await IDB.get('outbox',id);if(now&&now.updated!==rec.updated)continue;/* edited again while sending: send the newer one next round */
   await IDB.del('outbox',id);delete S.pend[id];const nr=norm(j.rec);
   if(nr.month===S.month)S.recs[nr.plate]=nr;pubPatch(nr);await IDB.put('cache','recs-'+nr.month,Object.values(S.recs).filter(x=>x.month===nr.month));
   if((S.view==='detail'||S.view==='cars'||S.view==='sum')&&!$('#ov:not([hidden])'))render(history.state||{v:S.view},true)}
 }catch(e){fail=true;if(e.code==='denied'){logout('รหัสผู้ตรวจถูกเปลี่ยน กรุณาเข้าสู่ระบบใหม่')}}
 finally{syncing=false;await countPending();if(fail||S.nPhotos||Object.keys(S.pend).length)retryT=setTimeout(sync,fail?20000:3000)}}
/* swap local refs for Drive ids; wait while a photo is still queued; drop a ref whose photo is gone */
function resolveRec(rec,waiting){const out=JSON.parse(JSON.stringify(rec));let wait=false;
 const fix=r=>{if(!r||!r.startsWith('l:'))return r;const k=r.slice(2),m=S.MAP[k];if(m)return m;if(waiting.has(k)){wait=true;return r}return null};
 for(const k in out.photos){const v=out.photos[k];if(Array.isArray(v))out.photos[k]=v.map(fix).filter(Boolean);else{const x=fix(v);if(x)out.photos[k]=x;else delete out.photos[k]}}
 return wait?null:out}
function pubPatch(r){if(!S.pub)return;const st=S.pub.st,i=st.findIndex(x=>x[0]===r.month&&x[1]===r.plate),row=[r.month,r.plate,r.status,r.result,tyreOld(r.tyres)?1:0,badList(r).length];if(i>=0)st[i]=row;else st.push(row)}
window.addEventListener('online',()=>{S.online=true;updSync();sync()});window.addEventListener('offline',()=>{S.online=false;updSync()});

/* ---------- ui helpers ---------- */
let toastT;function toast(t,bad){const el=$('#toast');el.textContent=t;el.className='toast'+(bad?' bad':'');el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2800)}
function sheet(html,cls=''){const s=$('#sheet');s.className='sheet '+cls;s.innerHTML='<button class="close" data-x aria-label="ปิด">✕</button>'+html;$('#ov').hidden=false;s.scrollTop=0;s.querySelector('[data-x]').onclick=closeSheet;return s}
function closeSheet(){if(S.onClose){const f=S.onClose;S.onClose=null;f();return}$('#ov').hidden=true;$('#sheet').innerHTML=''}
$('#ov').addEventListener('click',e=>{if(e.target.id==='ov')closeSheet()});
async function shareText(t){if(navigator.share){try{await navigator.share({text:t});return}catch(e){if(e.name==='AbortError')return}}
 try{await navigator.clipboard.writeText(t);toast('คัดลอกแล้ว วางใน LINE ได้เลย')}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();toast('คัดลอกแล้ว')}}
const kpi=(l,v,d,bar,act)=>`<${act?`button type="button" class="kpi" data-kf="${act}" aria-pressed="${S.filt===act}"`:'div class="kpi"'} style="--bar:${bar||'var(--gold-l)'}"><span class="l">${l}</span><span class="v">${v}</span>${d?`<span class="d">${d}</span>`:''}</${act?'button':'div'}>`;
function monthOpts(){const ms=new Set([monthNow()]);(S.pub?S.pub.st:[]).forEach(r=>ms.add(r[0]));return[...ms].sort().reverse().map(m=>`<option value="${m}"${m===S.month?' selected':''}>${mLabel(m)}</option>`).join('')}
function dcOpts(sel,withAll){return(withAll?`<option value="all"${sel==='all'?' selected':''}>ทุก DC</option>`:'')+S.zones.map(z=>`<optgroup label="${esc(z)}">${Object.values(S.dcs).filter(d=>d.zone===z&&(d.dc===sel||S.cars.some(c=>c.dc===d.dc))).map(d=>`<option value="${d.dc}"${d.dc===sel?' selected':''}>${esc(d.name)} (${S.cars.filter(c=>c.dc===d.dc).length})</option>`).join('')}</optgroup>`).join('')}

/* ---------- navigation ---------- */
const NAV=[['cars','ตรวจรถ',IC.car],['sum','สรุป',IC.chart],['set','ตั้งค่า',IC.edit]];
function navHtml(){const items=NAV.filter(n=>n[0]==='sum'||(n[0]==='cars'&&isStaff())||(n[0]==='set'&&isAdmin()));const cur=S.view==='form'||S.view==='detail'?'cars':S.view;return items.map(([k,t,i])=>`<button type="button" data-nav="${k}"${cur===k?' aria-current="page"':''}>${i}<span>${t}</span></button>`).join('')}
function go(v,p={},replace){const st={v,...p};history[replace?'replaceState':'pushState'](st,'');render(st)}
window.addEventListener('popstate',e=>{closeSheet();render(e.state||{v:home()})});
const home=()=>isStaff()?'cars':'sum';
async function render(st,soft){const v=st.v||home();
 if(v==='form'&&!soft){const ok=await openForm(st.plate);if(!ok){go(home(),{},true);return}}
 S.view=v;document.body.classList.toggle('form',v==='form');
 $('#tab').innerHTML=navHtml();$('#rail-nav').innerHTML=navHtml();$('#back').hidden=!(v==='form'||v==='detail');
 $('#actbar').hidden=true;$('#actbar').innerHTML='';
 const keepY=soft?scrollY:0;
 if(v==='cars')viewCars();else if(v==='sum')viewSum();else if(v==='detail')viewDetail(st.plate);else if(v==='form')viewForm();else if(v==='set'&&isAdmin())viewSet();
 if(!soft)scrollTo(0,0);else scrollTo(0,keepY);updSync()}
document.addEventListener('click',e=>{const n=e.target.closest('[data-nav]');if(n){if(n.dataset.nav!==S.view)go(n.dataset.nav)}});
$('#back').onclick=()=>{if(history.state&&history.length>1)history.back();else go(home(),{},true)};

/* ---------- car list (inspector home) ---------- */
function stateOf(pl){const id=S.month+'|'+pl,r=S.pend[id]||S.recs[pl]||null,d=S.drafts[id]||null;
 if(!r)return{k:d?'local':'none',d};return{k:r.status==='done'?'done':'draft',r,d,issue:r.result==='issue',old:tyreOld(r.tyres),pend:!!S.pend[id]}}
function chipsOf(s){const c=[];if(s.k==='none')c.push('<span class="chip">ยังไม่ตรวจ</span>');if(s.k==='local')c.push('<span class="chip warn">ร่างในเครื่อง</span>');
 if(s.k==='draft')c.push('<span class="chip warn">ยังไม่ครบ</span>');if(s.k==='done')c.push('<span class="chip ok">ตรวจครบ</span>');
 if(s.issue)c.push('<span class="chip bad">ผิดปกติ</span>');if(s.old)c.push('<span class="chip warn">ยางเก่า</span>');if(s.pend)c.push('<span class="chip gold">รอส่ง</span>');return c.join('')}
function viewCars(){const dc=S.dcSel||(S.sess&&S.sess.dc)||'all';S.dcSel=dc;
 $('#ttl').textContent='ตรวจรถ';$('#sub').textContent=(dc==='all'?'ทุก DC':dcName(dc))+' · '+mLabel(S.month);
 const cars=S.cars.filter(c=>dc==='all'||c.dc===dc),st=cars.map(c=>[c,stateOf(c.pl)]);
 const n={all:cars.length,done:st.filter(x=>x[1].k==='done').length,draft:st.filter(x=>x[1].k==='draft'||x[1].k==='local').length,none:st.filter(x=>x[1].k==='none').length,issue:st.filter(x=>x[1].issue).length};
 const pass=s=>S.filt==='all'||(S.filt==='done'&&s.k==='done')||(S.filt==='draft'&&(s.k==='draft'||s.k==='local'))||(S.filt==='none'&&s.k==='none')||(S.filt==='issue'&&s.issue);
 const q=S.q.trim().replace(/\s/g,'');const ord={none:0,local:1,draft:2,done:3};
 const rows=st.filter(([c,s])=>pass(s)&&(!q||c.pl.replace(/\s/g,'').includes(q)||dcName(c.dc).includes(q))).sort((a,b)=>ord[a[1].k]-ord[b[1].k]||(+a[0].dc)-(+b[0].dc)||a[0].pl.localeCompare(b[0].pl,'th'));
 const past=S.month!==monthNow();
 $('#view').innerHTML=`<p class="eyebrow">ตรวจสภาพรถประจำเดือน</p><div class="page-h"><h1>${esc(dc==='all'?'ทุก DC':dcName(dc))}</h1><p class="say">${mLabel(S.month)} · แตะรถที่ต้องการตรวจ${past?' · <b class="badt">ดูข้อมูลเดือนก่อน</b>':''}</p></div>
 <div class="kpis">${kpi('รถทั้งหมด',fmt(n.all)+' <small>คัน</small>','',null,'all')}${kpi('ตรวจครบ',fmt(n.done),n.all?Math.round(n.done/n.all*100)+'%':'','#1d57b8','done')}${kpi('ยังไม่ครบ / ยังไม่ตรวจ',fmt(n.draft)+' / '+fmt(n.none),'','#d4af37','none')}${kpi('พบผิดปกติ',fmt(n.issue),'',n.issue?'#b8334a':'#6e93d6','issue')}</div>
 <div class="tools"><input type="search" id="q" placeholder="ค้นหาทะเบียน" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search">${isAdmin()?`<select id="dcsel" aria-label="DC">${dcOpts(dc,true)}</select>`:''}<select id="msel" aria-label="เดือน">${monthOpts()}</select></div>
 <div class="seg2" role="group" aria-label="กรองสถานะ">${[['all','ทั้งหมด',n.all],['none','ยังไม่ตรวจ',n.none],['draft','ยังไม่ครบ',n.draft],['done','ครบ',n.done],['issue','ผิดปกติ',n.issue]].map(([k,t,c])=>`<button type="button" data-f="${k}" aria-pressed="${S.filt===k}">${t}<b>${c}</b></button>`).join('')}</div>
 <div class="list">${rows.length?rows.map(([c,s])=>{const ph=s.r&&s.r.photos.front||s.d&&s.d.photos.front;return`<button type="button" class="item" data-car="${esc(c.pl)}"><span class="thumb" ${ph?bg(ph,200):''}>${ph?'':IC.car}</span><span class="meta"><span class="plate">${esc(c.pl)}</span><span class="sub" style="display:block">${esc(TYN[c.ty]||c.ty)} · ${esc(GRP[c.g]||c.g)}${dc==='all'?' · '+esc(dcName(c.dc)):''}</span><span class="chips">${chipsOf(s)}</span>${s.r&&s.r.updated?`<span class="sub">${esc(s.r.inspector||'')} · ${dtLabel(s.r.updated)}</span>`:''}</span><span class="go">${IC.chev}</span></button>`}).join(''):`<div class="empty">ไม่พบรถในรายการนี้</div>`}</div>`;
 hydrate($('#view'));
 const qi=$('#q');qi.oninput=()=>{S.q=qi.value;clearTimeout(qi._t);qi._t=setTimeout(()=>{const p=qi.selectionStart;viewCars();const n2=$('#q');n2.focus();try{n2.setSelectionRange(p,p)}catch(e){}},250)};
 $$('[data-f]').forEach(b=>b.onclick=()=>{S.filt=b.dataset.f;viewCars()});$$('[data-kf]').forEach(b=>b.onclick=()=>{S.filt=b.dataset.kf;viewCars()});
 if($('#dcsel'))$('#dcsel').onchange=e=>{S.dcSel=e.target.value;viewCars()};
 $('#msel').onchange=async e=>{S.month=e.target.value;$('#view').innerHTML='<p class="empty">กำลังโหลด…</p>';try{await loadRecs(S.month)}catch(x){}viewCars()};
 $$('[data-car]').forEach(b=>b.onclick=()=>{const s=stateOf(b.dataset.car);if(s.k==='none'||s.k==='local'){if(!canEdit())return toast('ดูได้อย่างเดียว: ตรวจได้เฉพาะเดือนปัจจุบัน',true);go('form',{plate:b.dataset.car})}else go('detail',{plate:b.dataset.car})})}
const canEdit=()=>isStaff()&&(S.month===monthNow()||isAdmin());

/* ---------- form ---------- */
let draftT=null;
function blankForm(c){return norm({id:S.month+'|'+c.pl,month:S.month,plate:c.pl,dc:c.dc,type:c.ty,grp:c.g,inspector:S.sess.name||'',mile:'',checks:{},tyres:{},issue:{v:'',t:''},photos:{}})}
async function openForm(pl){const c=S.carBy[pl];if(!c||!canEdit())return false;const id=S.month+'|'+pl;
 if(S.form&&S.form.id===id)return true;
 const d=S.drafts[id],r=S.pend[id]||S.recs[pl];S.form=norm(JSON.parse(JSON.stringify(d||r||blankForm(c))));
 if(!S.form.inspector)S.form.inspector=S.sess.name||'';return true}
function saveDraft(){clearTimeout(draftT);draftT=setTimeout(()=>{if(!S.form)return;S.drafts[S.form.id]=JSON.parse(JSON.stringify(S.form));IDB.put('drafts',S.form.id,S.drafts[S.form.id])},300)}
function slotHtml(k,label,ref,multiKey,idx){
 const opt=k==='dashcam'&&S.form&&camS(S.form)==='none'?' · ไม่ต้องถ่าย (ไม่มีกล้อง)':!multiKey&&LBL[k]&&!['damage','claim'].includes(k)&&!rq(k,1)?' · ไม่บังคับ':'';
 if(!ref)return GUIDE.has(k)&&!multiKey?`<div class="slot ex" data-slot="${k}" role="button" tabindex="0" aria-label="ถ่าย${esc(label)}" style="background-image:url('guide/${k}.jpg')"><span class="exb">ตัวอย่าง</span><button type="button" class="exv" data-ex="${k}" aria-label="ดูตัวอย่าง ${esc(label)}">⤢</button>${IC.cam}<span class="exl">แตะเพื่อถ่าย · ${esc(label)}${opt}</span></div>`:`<button type="button" class="slot" data-slot="${k}">${IC.cam}<span>${esc(label)}${opt}</span></button>`;
 const wait=ref.startsWith('l:')&&!S.MAP[ref.slice(2)];
 return`<div class="slot has${isPdf(ref)?' pdf':''}" ${bg(ref,400)} data-view="${esc(ref)}" data-lbl="${esc(label)}">${isPdf(ref)?IC.file+'<span>PDF</span>':''}<span class="st${wait?' wait':''}">${wait?'รอส่ง':'✓ ส่งแล้ว'}</span><button type="button" class="x" data-rm="${k}"${multiKey?` data-i="${idx}"`:''} aria-label="ลบรูป ${esc(label)}">✕</button><span class="cap">${esc(label)}</span></div>`}
function multiHtml(k){const arr=S.form.photos[k]||[];return arr.map((r,i)=>slotHtml(k,LBL[k]+' '+(i+1),r,k,i)).join('')+`<button type="button" class="slot" data-slot="${k}" data-multi="1">${IC.plus}<span>เพิ่ม${k==='claim'?'รูป / PDF':'รูป'}</span></button>`}
function secDone(f,key){const m=missing(f);return!m.some(x=>x[0]===key)}
function viewForm(){const f=S.form,c=S.carBy[f.plate];
 $('#ttl').textContent=f.plate;$('#sub').textContent='ตรวจประจำเดือน '+mLabel(f.month)+' · '+dcName(f.dc);
 let n=1;const H=(key,t,cnt)=>`<h2><span class="n${secDone(f,key)?' done':''}" data-sec="${key}">${n++}</span>${t}${cnt?`<span class="cnt">${cnt}</span>`:''}</h2>`;
 $('#view').innerHTML=`<div class="prog"><div class="bar2"><i id="pbar"></i></div><div class="t"><span id="ptxt"></span><button type="button" id="pmiss" class="lnk" style="border:0;background:none;color:var(--navy2);text-decoration:underline;padding:0;font-size:12.5px"></button></div></div>
 ${(S.cfg||{}).general?`<div class="gnote">${IC.file.replace('<svg','<svg width="18" height="18"')}<span>${esc(S.cfg.general).replace(/\n/g,'<br>')}</span></div>`:''}
 <section class="sec" id="sec-info">${H('info','ข้อมูลรถ')}<div class="body"><div class="row2"><div class="field"><label class="l">ทะเบียน</label><input readonly value="${esc(f.plate)}"></div><div class="field"><label class="l">DC</label><input readonly value="${esc(dcName(f.dc))}"></div></div>
  <div class="row2"><div class="field"><label class="l">ชนิดรถ</label><input readonly value="${esc(TYN[f.type]||f.type)}"></div><div class="field"><label class="l">กลุ่ม / ปีรถ</label><input readonly value="${esc((GRP[f.grp]||f.grp)+(c&&c.yr?' · '+c.yr:''))}"></div></div>
  <div class="row2"><div class="field"><label class="l" for="f-insp">ผู้ตรวจ <span class="req">*</span></label><input id="f-insp" data-f="inspector" value="${esc(f.inspector)}" autocomplete="name"></div><div class="field"><label class="l" for="f-mile">เลขไมล์ (กม.) ${rq('mile',0)?'<span class="req">*</span>':''}</label><input id="f-mile" data-f="mile" inputmode="numeric" pattern="[0-9]*" value="${esc(f.mile)}" placeholder="${rq('mile',0)?'':'ไม่บังคับ'}"></div></div>${noteHtml('mile')}</div></section>
 ${photoFor(f.type).map(sec=>`<section class="sec" id="sec-${sec.k}" style="--sc:${sec.c}">${H(sec.k,sec.t,sec.k==='dot'?'ใส่เลข 4 หลัก สัปดาห์+ปี เช่น 4523':sec.only?'เฉพาะรถ 042 CC':'')}<div class="body">${noteHtml('sec:'+sec.k)}${sec.k==='cam'?camHtml(f):''}<div class="slots">${sec.s.map(([k,l])=>slotHtml(k,l,f.photos[k])).join('')}</div>${sec.s.map(([k,l])=>nt(k)?`<p class="hint"><b>${esc(l)}:</b> ${esc(nt(k))}</p>`:'').join('')}${sec.k==='dot'?noteHtml('tyres')+`<div class="tyre">${TY.map(([k,l])=>`<div class="field"><label class="l" for="ty-${k}">ปียาง ${l} ${rq('tyres',1)?'<span class="req">*</span>':'<small>(ไม่บังคับ)</small>'}</label><input id="ty-${k}" data-ty="${k}" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="WWYY" value="${esc(f.tyres[k]||'')}"><div class="age" id="age-${k}"></div></div>`).join('')}</div>`:''}</div></section>`).join('')}
 <section class="sec" id="sec-check">${H('check','รายการตรวจ ปกติ / ผิดปกติ',checksFor(f.type).length+' รายการ')}<div class="body">${noteHtml('sec:check')}<button type="button" class="allok" id="allok">${IC.check.replace('<svg','<svg width="16" height="16" style="vertical-align:-3px"')} ที่เหลือปกติทั้งหมด</button><div class="ck">${checksFor(f.type).map(([k,l,h])=>ckRow(k,l,h)).join('')}</div></div></section>
 <section class="sec" id="sec-issue">${H('issue','สรุปความผิดปกติ / สิ่งที่ต้องดำเนินการ')}<div class="body">${noteHtml('issue')}<div class="seg3"><button type="button" data-iss="none" data-v="none" aria-pressed="${f.issue.v==='none'}">ปกติ ไม่พบปัญหา</button><button type="button" data-iss="has" data-v="has" aria-pressed="${f.issue.v==='has'}">พบความผิดปกติ</button></div>
  <div class="field" id="iss-wrap"${f.issue.v==='has'?'':' hidden'}><label class="l" for="f-iss">รายละเอียด <span class="req">*</span></label><textarea id="f-iss" data-iss-t placeholder="เช่น กันชนหลังแตก ไฟเบรกซ้ายไม่ติด">${esc(f.issue.t||'')}</textarea></div>
  <div class="field"><label class="l">ภาพจุดที่ผิดปกติ</label><div class="slots" id="multi-damage">${multiHtml('damage')}</div></div></div></section>
 <section class="sec" id="sec-claim">${H('claim','แนบใบเคลม / ประวัติรถ','ถ้ามี')}<div class="body"><div class="sub">ถ่ายภาพเต็มใบ หรือแนบไฟล์ PDF</div><div class="slots" id="multi-claim">${multiHtml('claim')}</div></div></section>`;
 TY.forEach(([k])=>ageShow(k));hydrate($('#view'));updProg();
 const ab=$('#actbar');ab.hidden=false;ab.innerHTML=`<button type="button" class="btn alt" id="f-cancel">ไว้ทีหลัง</button><button type="button" class="btn gold" id="f-save">${IC.check}บันทึกและส่ง</button>`;
 $('#f-cancel').onclick=()=>{saveDraft();toast('เก็บร่างไว้ในเครื่องแล้ว');$('#back').click()};$('#f-save').onclick=trySave}
function camHtml(f){const s=camS(f);return`<div class="camseg" role="group" aria-label="สถานะกล้องหน้ารถ">${CAM.map(([v,l])=>`<button type="button" data-cam="${v}" class="c-${v}" aria-pressed="${s===v}">${l}</button>`).join('')}</div>`}
const noteHtml=k=>nt(k)?`<p class="hint">${esc(nt(k)).replace(/\n/g,'<br>')}</p>`:'';
function ckRow(k,l,h){const v=S.form.checks[k]||{},n=nt('ck:'+k),opt=!rq('ck:'+k,1);return`<div class="ckr${v.v==='bad'?' isbad':''}" id="ck-${k}"><span class="nm">${esc(l)}${opt?' <small style="display:inline">(ไม่บังคับ)</small>':''}${h?`<small>${esc(h)}</small>`:''}${n?`<small class="hn">${esc(n)}</small>`:''}</span><span class="tg"><button type="button" class="ok" data-ck="${k}" data-v="ok" aria-pressed="${v.v==='ok'}">ปกติ</button><button type="button" class="bad" data-ck="${k}" data-v="bad" aria-pressed="${v.v==='bad'}">ผิดปกติ</button></span>${v.v==='bad'?`<input data-ckn="${k}" placeholder="ระบุอาการ เช่น ไฟเบรกซ้ายไม่ติด" value="${esc(v.n||'')}" aria-label="อาการ ${esc(l)}">`:''}</div>`}
function ageShow(k){const el=$('#age-'+k);if(!el)return;const s=S.form.tyres[k]||'';if(!s){el.innerHTML='';return}const a=tyreAge(s);
 el.innerHTML=a==null?(s.length<4?'':'<span class="badt">รูปแบบไม่ถูกต้อง</span>'):(a>=MAXY?`<span class="badt">อายุ ${ageTxt(a)} · ยางเก่า</span>`:`<span class="good">อายุ ${ageTxt(a)}</span>`)}
function updProg(){if(!$('#pbar')||!S.form)return;const f=S.form,m=missing(f),t=totalItems(f),p=Math.round((t-m.length)/t*100);
 $('#pbar').style.width=p+'%';$('#ptxt').textContent=`ครบ ${p}%`;$('#pmiss').textContent=m.length?`ยังขาด ${m.length} รายการ ›`:'ครบทุกรายการ ✓';
 $$('[data-sec]').forEach(el=>el.classList.toggle('done',!m.some(x=>x[0]===el.dataset.sec)))}
function changed(){updProg();saveDraft()}
function showMissing(){const m=missing(S.form);if(!m.length)return;const by={};m.forEach(([s,l])=>(by[s]=by[s]||[]).push(l));
 const names={info:'ข้อมูลรถ',check:'รายการตรวจ',issue:'สรุปความผิดปกติ',...Object.fromEntries(PHOTO.map(p=>[p.k,p.t]))};
 const sh=sheet(`<h2>ยังขาด ${m.length} รายการ</h2>${Object.keys(by).map(s=>`<button type="button" class="btn alt" data-jump="${s}" style="justify-content:space-between;text-align:left"><span><b>${esc(names[s])}</b><br><small style="color:var(--muted)">${by[s].map(esc).join(', ')}</small></span>${IC.chev}</button>`).join('')}`);
 $$('[data-jump]',sh).forEach(b=>b.onclick=()=>{closeSheet();jump(b.dataset.jump)})}
function jump(s){const el=$('#sec-'+s);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}
$('#view').addEventListener('click',e=>{if(S.view!=='form')return;const t=e.target;
 const rm=t.closest('[data-rm]');if(rm){e.stopPropagation();if(!confirm('ลบรูปนี้?'))return;const k=rm.dataset.rm;if(rm.dataset.i!=null){S.form.photos[k].splice(+rm.dataset.i,1);$('#multi-'+k).innerHTML=multiHtml(k);hydrate($('#multi-'+k))}else{delete S.form.photos[k];const sl=rm.closest('.slot');sl.outerHTML=slotHtml(k,LBL[k],null)}changed();return}
 const ex=t.closest('[data-ex]');if(ex){e.stopPropagation();sheet(`<h2>ตัวอย่าง · ${esc(LBL[ex.dataset.ex])}</h2><img src="guide/${ex.dataset.ex}.jpg" alt="ตัวอย่าง ${esc(LBL[ex.dataset.ex])}"><button type="button" class="btn gold" id="ex-go">${IC.cam} ถ่ายรูปนี้</button>`,'pic');$('#ex-go').onclick=()=>{closeSheet();pick(ex.dataset.ex,false)};return}
 const sl=t.closest('[data-slot]');if(sl){pick(sl.dataset.slot,!!sl.dataset.multi);return}
 const vw=t.closest('[data-view]');if(vw){viewPic(vw.dataset.view,vw.dataset.lbl);return}
 const ck=t.closest('[data-ck]');if(ck){const k=ck.dataset.ck,v=ck.dataset.v,cur=S.form.checks[k]||{};S.form.checks[k]={v:cur.v===v?'':v,n:cur.n||''};$('#ck-'+k).outerHTML=ckRow(k,CKL[k],(CHECKS.find(c=>c[0]===k)||[])[2]);
  if(S.form.checks[k].v==='bad'){const i=$(`[data-ckn="${k}"]`);if(i)i.focus();if(!S.form.issue.v)setIssue('has')}changed();return}
 if(t.closest('#allok')){checksFor(S.form.type).forEach(([k,l,h])=>{if(!(S.form.checks[k]&&S.form.checks[k].v)){S.form.checks[k]={v:'ok',n:''};$('#ck-'+k).outerHTML=ckRow(k,l,h)}});changed();return}
 if(t.closest('[data-ck]'))return;
 const is=t.closest('[data-iss]');if(is){setIssue(is.dataset.iss);changed();return}
 const cm=t.closest('[data-cam]');if(cm){const v=cm.dataset.cam;S.form.checks.dashcam={v:v==='ok'?'ok':v==='none'?'na':'bad',s:v,n:CAML[v]};
  $$('[data-cam]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cam===v));const sl=$('#sec-cam .slots');if(sl){sl.innerHTML=slotHtml('dashcam',LBL.dashcam,S.form.photos.dashcam);hydrate(sl)}
  if(v==='broken'||v==='card'){if(!S.form.issue.v)setIssue('has')}changed();return}
 if(t.closest('#pmiss'))showMissing()});
function setIssue(v){S.form.issue.v=v;$$('[data-iss]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.iss===v));$('#iss-wrap').hidden=v!=='has';if(v==='has'&&!S.form.issue.t){const bad=badList(S.form).map(k=>CKL[k]+(S.form.checks[k].n?' ('+S.form.checks[k].n+')':''));if(bad.length){S.form.issue.t=bad.join(', ');$('#f-iss').value=S.form.issue.t}}}
$('#view').addEventListener('input',e=>{if(S.view!=='form')return;const t=e.target;
 if(t.dataset.f){let v=t.value;if(t.dataset.f==='mile'){v=v.replace(/\D/g,'');if(v!==t.value)t.value=v}S.form[t.dataset.f]=v;changed()}
 else if(t.dataset.ty){const v=t.value.replace(/\D/g,'').slice(0,4);if(v!==t.value)t.value=v;S.form.tyres[t.dataset.ty]=v;ageShow(t.dataset.ty);changed();if(v.length===4){const nx=$$('[data-ty]')[TY.findIndex(x=>x[0]===t.dataset.ty)+1];if(nx&&!nx.value)nx.focus()}}
 else if(t.dataset.ckn){S.form.checks[t.dataset.ckn].n=t.value;changed()}
 else if('issT'in t.dataset){S.form.issue.t=t.value;changed()}});

/* photo picking */
let picking=null;
function pick(slot,multi){picking={slot,multi};const inp=slot==='claim'?$('#file-any'):$('#file-img');inp.multiple=!!multi;inp.value='';inp.click()}
/* a dark or blurry photo: show it and let the inspector retake or keep it */
function askKeep(blob,warn,slot,multi){return new Promise(res=>{const u=URL.createObjectURL(blob);
 sheet(`<h2>${warn.map(esc).join(' และ ')}</h2><img src="${u}" alt="รูปที่เพิ่งถ่าย"><p class="say" style="color:#e6d79c">ถ่ายใหม่จะได้รูปที่ชัดกว่า หรือใช้รูปนี้ก็ได้</p><div class="btns"><button type="button" class="btn alt" id="k-use">ใช้รูปนี้</button><button type="button" class="btn gold" id="k-again">${IC.cam} ถ่ายใหม่</button></div>`,'pic');
 const done=v=>{S.onClose=null;URL.revokeObjectURL(u);closeSheet();res(v)};S.onClose=()=>done(true);
 $('#k-use').onclick=()=>done(true);$('#k-again').onclick=()=>{done(false);pick(slot,multi)}})}
let shrinking=0;
async function onFiles(e){const files=[...e.target.files];if(!files.length||!picking||!S.form)return;const{slot,multi}=picking;picking=null;const f=S.form;shrinking++;try{await addFiles(files,slot,multi,f)}finally{shrinking--}}
async function addFiles(files,slot,multi,f){
 for(const file of files){let el=multi?null:$(`[data-slot="${slot}"]`);if(el)el.classList.add('busy');
  try{let blob,mime;if(file.type==='application/pdf'){if(file.size>10*1024*1024){toast('ไฟล์ PDF ใหญ่เกิน 10 MB',true);continue}blob=file;mime='application/pdf'}
   else{const r=await shrink(file,f.plate,LBL[slot]||slot);blob=r.blob;mime='image/jpeg';
    if(r.warn.length&&files.length===1){if(el)el.classList.remove('busy');if(!await askKeep(blob,r.warn,slot,multi))continue}
    else if(r.fixed)toast('ปรับแสงให้อัตโนมัติแล้ว')}
   const k=Date.now().toString(36)+Math.random().toString(36).slice(2,7);
   await IDB.put('photos',k,{month:f.month,dc:f.dc,plate:f.plate,slot,data:await blobB64(blob),mime,t:Date.now()});S.LOCAL[k]=URL.createObjectURL(blob);S.nPhotos++;
   const ref='l:'+k;if(multi){(f.photos[slot]=f.photos[slot]||[]).push(ref)}else f.photos[slot]=ref;
  }catch(x){toast('ใช้รูปนี้ไม่ได้ ลองถ่ายใหม่',true)}finally{if(el)el.classList.remove('busy')}}
 if(S.form!==f||S.view!=='form'){}else if(multi){$('#multi-'+slot).innerHTML=multiHtml(slot);hydrate($('#multi-'+slot))}else{const el=$(`[data-slot="${slot}"]`)||$(`.slot[data-view] [data-rm="${slot}"]`)?.closest('.slot');if(el)el.outerHTML=slotHtml(slot,LBL[slot],f.photos[slot])}
 changed();updSync();
 /* save the draft at once so a photo is never lost, then start sending in the background */
 clearTimeout(draftT);S.drafts[f.id]=JSON.parse(JSON.stringify(f));await IDB.put('drafts',f.id,S.drafts[f.id]);sync()}
$('#file-img').addEventListener('change',onFiles);$('#file-any').addEventListener('change',onFiles);

async function trySave(){if(shrinking)return toast('กำลังเตรียมรูป รอสักครู่แล้วกดบันทึกอีกครั้ง');const f=S.form,m=missing(f);
 if(m.length){/* every photo and item is required before sending; the draft stays on this phone */
  const sh=sheet(`<h2>ต้องกรอกให้ครบก่อนส่ง</h2><p class="say">ยังขาด ${m.length} รายการ: ${m.slice(0,6).map(x=>esc(x[1])).join(', ')}${m.length>6?' …':''}</p><p class="say">งานที่ทำไว้เก็บในเครื่องแล้ว ออกไปแล้วกลับมาทำต่อได้</p><button type="button" class="btn gold" id="m-go">ไปกรอกรายการแรกที่ขาด</button>`);
  $('#m-go').onclick=()=>{closeSheet();jump(m[0][0])};return}
 commit()}
async function commit(){const f=S.form;clearTimeout(draftT);f.status=missing(f).length?'draft':'done';f.result=resultOf(f);f.updated=new Date().toISOString();f.inspector=(f.inspector||'').trim();
 if(f.inspector&&S.sess.name!==f.inspector){S.sess.name=f.inspector;LS.set('insp-sess',S.sess)}
 const rec=JSON.parse(JSON.stringify(f));S.pend[f.id]=rec;await IDB.put('outbox',f.id,rec);delete S.drafts[f.id];await IDB.del('drafts',f.id);pubPatch(rec);
 S.form=null;toast(S.online?'บันทึกแล้ว กำลังส่งข้อมูล…':'บันทึกในเครื่องแล้ว จะส่งเมื่อมีสัญญาณ');go('detail',{plate:f.plate},true);sync()}

/* ---------- detail ---------- */
function viewPic(ref,lbl){const u=isPdf(ref)?null:refUrl(ref,1600),o=openUrl(ref);sheet(`<h2>${esc(lbl||'')}</h2>${u?`<img src="${u}" alt="${esc(lbl||'')}">`:`<p>ไฟล์ PDF</p>`}${driveId(ref)?`<a href="${o}" target="_blank" rel="noopener">เปิดไฟล์ต้นฉบับใน Google Drive ›</a>`:'<span class="say" style="color:#e6d79c">ยังไม่ได้ส่งขึ้นระบบ (รอสัญญาณ)</span>'}`,'pic')}
function viewDetail(pl){const id=S.month+'|'+pl,r=S.pend[id]||S.recs[pl],c=S.carBy[pl]||{pl,ty:'',g:'',dc:''};
 $('#ttl').textContent=pl;$('#sub').textContent=dcName(c.dc)+' · '+mLabel(S.month);
 if(!r){$('#view').innerHTML='<div class="empty">ยังไม่มีผลตรวจของรถคันนี้ในเดือนนี้</div>';return}
 const bad=badList(r),cks=checksFor(r.type),m=missing(r),old=tyreOld(r.tyres);
 const pic=(k,l,ref)=>ref?`<button type="button" ${bg(ref,400)} data-pv="${esc(ref)}" data-lbl="${esc(l)}"${isPdf(ref)?' class="pdfb" style="background:var(--navy2);color:#fff"':''}>${isPdf(ref)?'PDF':''}<span>${esc(l)}</span></button>`:`<button type="button" class="miss" disabled><span>ไม่มีรูป · ${esc(l)}</span></button>`;
 $('#view').innerHTML=`<p class="eyebrow">ผลตรวจประจำเดือน ${mLabel(r.month)}</p><div class="page-h"><h1>${esc(pl)}</h1><div class="chips">${chipsOf(stateOf(pl))}</div></div>
 <div class="rep-wrap">${repHtml(r)}</div>
 <div class="card"><dl class="dl"><dt>DC</dt><dd>${esc(dcName(r.dc))}</dd><dt>ชนิดรถ</dt><dd>${esc(TYN[r.type]||r.type)} · ${esc(GRP[r.grp]||r.grp)}</dd><dt>ผู้ตรวจ</dt><dd>${esc(r.inspector)}</dd><dt>เลขไมล์</dt><dd>${r.mile?fmt(r.mile)+' กม.':'-'}</dd><dt>กล้องหน้ารถ</dt><dd${['broken','card'].includes(camS(r))?' class="badt"':''}>${esc(CAML[camS(r)]||'-')}</dd><dt>บันทึกล่าสุด</dt><dd>${dtLabel(r.updated)}${r.by&&r.by.split(' @')[0]!==r.inspector?' · '+esc(r.by):''}</dd></dl>
 ${m.length?`<p class="say" style="margin-top:8px"><b class="badt">ยังขาด ${m.length} รายการ:</b> ${m.slice(0,8).map(x=>esc(x[1])).join(', ')}${m.length>8?' …':''}</p>`:''}</div>
 <div class="card"><h2>ผลการตรวจ</h2><div class="res">${bad.length?bad.map(k=>`<div><span class="b">✕ ${esc(CKL[k]||k)}</span><span>${esc(r.checks[k].n||'')}</span></div>`).join(''):''}<div><span class="g">✓ ปกติ ${cks.filter(([k])=>r.checks[k]&&r.checks[k].v==='ok').length} รายการ</span>${cks.length-bad.length-cks.filter(([k])=>r.checks[k]&&r.checks[k].v==='ok').length>0?`<span class="sub">ยังไม่ได้ตรวจ ${cks.length-bad.length-cks.filter(([k])=>r.checks[k]&&r.checks[k].v==='ok').length} รายการ</span>`:''}</div></div>
  <h2 style="margin-top:14px">ปียาง</h2><div class="res">${TY.map(([k,l])=>{const a=tyreAge(r.tyres[k]);return`<div><span style="min-width:72px">${l}</span><b>${esc(r.tyres[k]||'-')}</b>${a!=null?`<span class="${a>=MAXY?'badt':'good'}">อายุ ${ageTxt(a)}${a>=MAXY?' · ยางเก่า':''}</span>`:''}</div>`}).join('')}</div>
  <h2 style="margin-top:14px">สรุปความผิดปกติ</h2><p style="margin:4px 0 0">${r.issue.v==='has'?`<b class="badt">พบความผิดปกติ:</b> ${esc(r.issue.t)}`:r.issue.v==='none'?'<span class="good">ปกติ ไม่พบปัญหา</span>':'-'}</p></div>
 ${r.photos.damage.length?`<div class="card"><h2>ภาพจุดที่ผิดปกติ</h2><div class="pg">${r.photos.damage.map((x,i)=>pic('damage','จุดที่ผิดปกติ '+(i+1),x)).join('')}</div></div>`:''}
 ${r.photos.claim.length?`<div class="card"><h2>ใบเคลม / ประวัติรถ</h2><div class="pg">${r.photos.claim.map((x,i)=>pic('claim','ไฟล์ '+(i+1),x)).join('')}</div></div>`:''}`;
 hydrate($('#view'));$$('[data-pv]').forEach(b=>b.onclick=()=>viewPic(b.dataset.pv,b.dataset.lbl));
 const ab=$('#actbar');ab.hidden=false;ab.innerHTML=`${isAdmin()?`<button type="button" class="btn bad" id="d-del" style="flex:0 0 auto">ลบ</button>`:''}<button type="button" class="btn alt" id="d-img">${IC.share}รูปสรุป</button><button type="button" class="btn alt" id="d-share">ข้อความ</button>${canEdit()?`<button type="button" class="btn" id="d-edit">${IC.edit}แก้ไข</button>`:''}`;
 $$('[data-rv]').forEach(b=>b.onclick=()=>viewPic(b.dataset.rv,b.dataset.lbl));
 $('#d-img').onclick=()=>exportSheet(r);
 $('#d-share').onclick=()=>shareText(carText(r));if($('#d-edit'))$('#d-edit').onclick=()=>{S.form=null;go('form',{plate:pl},true)};
 if($('#d-del'))$('#d-del').onclick=()=>{const sh=sheet(`<h2>ลบผลตรวจ ${esc(pl)}?</h2><p class="say">ข้อมูลเดือน ${mLabel(r.month)} จะถูกลบจาก Google Sheet และรูปจะถูกย้ายไปถังขยะของ Google Drive (กู้คืนได้ภายใน 30 วัน)</p><div class="btns"><button type="button" class="btn alt" data-x2>ยกเลิก</button><button type="button" class="btn" id="dd-ok" style="background:var(--bad)">ลบ</button></div>`);
  sh.querySelector('[data-x2]').onclick=closeSheet;$('#dd-ok').onclick=async()=>{$('#dd-ok').disabled=true;try{await api({a:'del',id});delete S.recs[pl];delete S.pend[id];await IDB.del('outbox',id);if(S.pub)S.pub.st=S.pub.st.filter(x=>!(x[0]===r.month&&x[1]===pl));closeSheet();toast('ลบแล้ว');go('cars',{},true)}catch(e){toast('ลบไม่สำเร็จ: '+e.message,true);$('#dd-ok').disabled=false}}}}
/* ---------- sheet layout (like the paper-form sample) ---------- */
function repHtml(r){const secs=photoFor(r.type),car=S.carBy[r.plate]||{};
 const ph=(k,l,cap)=>{const ref=r.photos[k];return ref?`<button type="button" class="rph" ${bg(ref,600)} data-rv="${esc(ref)}" data-lbl="${esc(l)}"><span>${esc(cap||l)}</span></button>`:`<div class="rph none"><span>ไม่มีรูป · ${esc(cap||l)}</span></div>`};
 return`<div class="rep"><div class="rh"><div class="rl"><img src="logo.png" alt="NIM Express และ SEAL Gold Chain"></div><div class="rt"><b>สำรวจรถบริษัท<em>ทั่วประเทศ</em></b><div class="rp"><span>DC : <b>${esc(dcName(r.dc).replace(/^C?DC\s*/,''))}</b></span><span>ประเภท : <b>${esc(TYN[r.type]||r.type)}</b></span><span>ทะเบียน : <b>${esc(r.plate)}</b></span></div></div>
  <div class="rhero" ${r.photos.front?bg(r.photos.front,800):''}><span>ตรวจ ${dtLabel(r.updated).replace(/\s\d+:\d+$/,'')} · ${esc(r.inspector)}${r.mile?' · '+fmt(r.mile)+' กม.':''}</span></div></div>
 ${secs.map((s,i)=>`<div class="rs rs-${s.k}"><div class="rn" style="--c:${s.c}"><i>${i+1}</i>${esc(s.t)}</div><div class="rg n${s.s.length}">${s.s.map(([k,l])=>ph(k,l,s.k==='dot'?(r.tyres[k.slice(1)]||l):s.k==='tyre'?l.replace('ยาง',''):l)).join('')}</div></div>`).join('')}</div>`}
async function imgFor(ref){if(!ref||isPdf(ref))return null;let src=null;
 if(ref.startsWith('l:')&&S.LOCAL[ref.slice(2)])src=S.LOCAL[ref.slice(2)];
 else{const id=driveId(ref);if(!id)return null;S.IMG=S.IMG||{};if(!S.IMG[id]){const j=await api({a:'img',id});S.IMG[id]=URL.createObjectURL(b64Blob(j.data,j.mime))}src=S.IMG[id]}
 return await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src})}
/* 2000x1125 PNG of the sheet, drawn on a canvas (Prompt font, no html2canvas) */
async function exportSheet(r){toast('กำลังสร้างรูปสรุป…');try{await document.fonts.load('600 40px Prompt');await document.fonts.load('500 20px Prompt')}catch(e){}
 const W=2000,H=1125,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const rr=(X,Y,w,h,rad)=>{x.beginPath();x.roundRect(X,Y,w,h,rad)};const F=(w,s)=>`${w} ${s}px Prompt, sans-serif`;
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#cfe0f7');g.addColorStop(1,'#eef4fc');x.fillStyle=g;x.fillRect(0,0,W,H);
 const keys=['front','back','right','left','engine','battery','odo','tFL','tFR','tRL','tRR','dFL','dFR','dRL','dRR','spare','cabin','boxF','boxB','curtain','dashcam'];
 const I={};let fail=0;await Promise.all(keys.map(async k=>{try{I[k]=await imgFor(r.photos[k])}catch(e){fail++}}));
 const logo=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src='logo.png'});
 const cover=(img,X,Y,w,h,rad=10)=>{x.save();rr(X,Y,w,h,rad);x.clip();if(img){const s=Math.max(w/img.width,h/img.height),iw=img.width*s,ih=img.height*s;x.drawImage(img,X+(w-iw)/2,Y+(h-ih)/2,iw,ih)}else{x.fillStyle='#d9e2ef';x.fillRect(X,Y,w,h);x.fillStyle='#7a8aa5';x.font=F(500,20);x.textAlign='center';x.textBaseline='middle';x.fillText('ไม่มีรูป',X+w/2,Y+h/2)}x.restore()};
 const panel=(X,Y,w,h)=>{x.fillStyle='rgba(255,255,255,.92)';rr(X,Y,w,h,18);x.fill()};
 const cap=(t,X,Y,w,dark)=>{x.font=F(600,24);const tw=Math.min(w-20,x.measureText(t).width+60);x.fillStyle=dark?'#0a2a5e':'#f2f4f8';rr(X+(w-tw)/2,Y,tw,36,18);x.fill();x.fillStyle=dark?'#fff':'#0a2a5e';x.textAlign='center';x.textBaseline='middle';x.fillText(t,X+w/2,Y+19,w-30)};
 const label=(n,t,X,Y,w,h,col)=>{x.fillStyle=col;rr(X,Y,w,h,h/2);x.fill();x.fillStyle='#0a2a5e';x.beginPath();x.arc(X+h/2+4,Y+h/2,h/2-4,0,7);x.fill();x.fillStyle='#fff';x.font=F(600,h*0.55);x.textAlign='center';x.textBaseline='middle';x.fillText(String(n),X+h/2+4,Y+h/2+2);x.fillStyle='#0a2a5e';x.textAlign='left';x.font=F(600,Math.min(34,h*0.5));const lines=t.split('\n');lines.forEach((ln,i)=>x.fillText(ln,X+h+18,Y+h/2+2+(i-(lines.length-1)/2)*h*0.42,w-h-30))};
 /* header */
 x.fillStyle='#fff';rr(24,12,370,144,22);x.fill();if(logo){const s=Math.min(330/logo.width,120/logo.height);x.drawImage(logo,24+(370-logo.width*s)/2,12+(144-logo.height*s)/2,logo.width*s,logo.height*s)}
 x.fillStyle='#0a2a5e';rr(400,14,1000,96,48);x.fill();x.font=F(600,66);x.textBaseline='middle';x.textAlign='left';x.fillStyle='#fff';x.fillText('สำรวจรถบริษัท',440,64);const tw=x.measureText('สำรวจรถบริษัท').width;x.fillStyle='#f4c430';x.fillText('ทั่วประเทศ',440+tw,64);
 x.fillStyle='#f6c945';rr(420,112,980,50,25);x.fill();x.fillStyle='#0a2a5e';x.font=F(600,30);const info=[`DC : ${dcName(r.dc).replace(/^C?DC\s*/,'')}`,`ประเภท : ${TYN[r.type]||r.type}`,`ทะเบียน : ${r.plate}`];info.forEach((t,i)=>{x.textAlign='center';x.fillText(t,420+980/6*(2*i+1),139,310)});
 x.strokeStyle='rgba(10,42,94,.5)';x.lineWidth=2;[1,2].forEach(i=>{x.beginPath();x.moveTo(420+980/3*i,120);x.lineTo(420+980/3*i,154);x.stroke()});
 cover(I.front,1420,12,560,188,16);x.fillStyle='rgba(6,26,61,.75)';rr(1420,160,560,40,0);x.fill();x.fillStyle='#fff';x.font=F(500,20);x.textAlign='center';x.fillText(`ตรวจ ${dtLabel(r.updated).replace(/\s\d+:\d+$/,'')} · ${r.inspector}${r.mile?' · '+fmt(r.mile)+' กม.':''}`,1700,181,540);
 /* 1 four sides */
 panel(16,172,1968,326);label(1,'ภาพรถ เต็มคัน 4 ด้าน',30,206,480,58,'#f4c430');
 [['front','ด้านหน้า'],['back','ด้านหลัง'],['right','ด้านข้างขวา'],['left','ด้านข้างซ้าย']].forEach(([k,l],i)=>{const X=530+i*362,w=350;cover(I[k],X,206,w,248);cap(l,X,436,w,true)});
 x.globalAlpha=1;
 /* 2 engine */
 panel(16,506,572,220);label(2,'ห้องเครื่อง / แบต / ไมล์',30,514,544,52,'#f28b7d');cover(I.engine,32,574,300,142);cover(I.battery,340,574,116,142);cover(I.odo,462,574,116,142);
 /* 3 tyres */
 panel(596,506,1388,220);label(3,'ยางถ่ายเต็มวง 4 เส้น',610,514,470,52,'#a8d86e');
 [['tFL','หน้าซ้าย'],['tFR','หน้าขวา'],['tRL','หลังซ้าย'],['tRR','หลังขวา']].forEach(([k,l],i)=>{const X=612+i*342,w=330;cover(I[k],X,572,w,112);cap(l,X,684,w)});
 /* 4 dot */
 panel(16,734,1968,112);label(4,'ถ่ายเห็นปียาง',30,754,560,62,'#f7b23b');
 TY.forEach(([k],i)=>{const X=612+i*342,w=330,a=tyreAge(r.tyres[k]),old=a!=null&&a>=MAXY;cover(I['d'+k],X,742,w,62,8);cap((r.tyres[k]||'-')+(old?' · ยางเก่า':''),X,806,w);if(old){x.strokeStyle='#b8334a';x.lineWidth=4;rr(X,742,w,62,8);x.stroke()}});
 /* 5 spare + curtain */
 panel(16,854,1968,92);label(5,'ยางอะไหล่',30,866,560,62,'#c58af0');cover(I.spare,612,860,360,80,8);
 const cc=r.type==='042'||r.photos.curtain,cs=camS(r),camBad=cs==='broken'||cs==='card';
 label(cc?9:8,'กล้องหน้า · '+(CAML[cs]||'-'),990,866,cc?470:560,62,camBad?'#f28b7d':'#ffb38a');if(cs!=='none')cover(I.dashcam,cc?1470:1560,860,cc?150:410,80,8);
 if(cc){label(8,'ม่านความเย็น',1630,866,190,62,'#9fb8ff');cover(I.curtain,1830,860,140,80,8)}
 /* 6 cabin, 7 box */
 panel(16,954,984,160);label(6,'ห้องโดยสาร',30,970,370,58,'#8cc8f5');cover(I.cabin,412,962,576,144);
 panel(1008,954,976,160);label(7,'ภาพภายในตู้\nหน้า-หลัง',1018,966,350,82,'#6fdcd0');cover(I.boxF,1380,962,290,144);cover(I.boxB,1680,962,292,144);
 const blob=await new Promise(res=>c.toBlob(res,'image/png'));const name=`NIMEX-Inspection-${r.plate}-${r.month}.png`;
 if(fail)toast('บางรูปโหลดไม่ได้ ลองใหม่เมื่อมีสัญญาณ',true);
 const file=new File([blob],name,{type:'image/png'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e.name==='AbortError')return}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('บันทึกรูปสรุปแล้ว')}
function carText(r){const bad=badList(r),cks=checksFor(r.type),ok=cks.filter(([k])=>r.checks[k]&&r.checks[k].v==='ok').length;
 return[`🚚 ผลตรวจสภาพรถ ${r.plate}`,`📍 ${dcName(r.dc)} · ${TYN[r.type]||r.type}`,`🗓️ ${mLabel(r.month)} · ผู้ตรวจ ${r.inspector}`,r.mile?`🛣️ เลขไมล์ ${fmt(r.mile)} กม.`:'',camS(r)?`📹 กล้องหน้ารถ: ${CAML[camS(r)]}`:'',
  r.result==='issue'?`⚠️ พบความผิดปกติ ${bad.length} รายการ`:'✅ ปกติ ไม่พบปัญหา',...bad.map((k,i)=>`  ${i+1}. ${CKL[k]}${r.checks[k].n?' — '+r.checks[k].n:''}`),
  r.issue.v==='has'&&r.issue.t?`📝 ${r.issue.t}`:'',`✔️ ปกติ ${ok}/${cks.length} รายการ`,
  '🛞 ปียาง '+TY.map(([k,l])=>{const a=tyreAge(r.tyres[k]);return`${l} ${r.tyres[k]||'-'}${a!=null&&a>=MAXY?' ⚠️':''}`}).join(' · '),
  r.status!=='done'?'⏳ ยังกรอกไม่ครบ':''].filter(Boolean).join('\n')}

/* ---------- summary ---------- */
function viewSum(){$('#ttl').textContent='สรุปการตรวจ';$('#sub').textContent=mLabel(S.month)+(S.pub&&S.pub.stale?' · ข้อมูลในเครื่อง':'');
 const st={};(S.pub?S.pub.st:[]).filter(x=>x[0]===S.month).forEach(x=>st[x[1]]=x);
 const agg=list=>{const a={n:list.length,done:0,draft:0,issue:0,old:0};list.forEach(c=>{const x=st[c.pl];if(!x)return;x[2]==='done'?a.done++:a.draft++;if(x[3]==='issue')a.issue++;if(+x[4])a.old++});a.none=a.n-a.done-a.draft;a.p=a.n?a.done/a.n:0;return a};
 const T=agg(S.cars);const pct=p=>Math.round(p*100)+'%';
 const row=(lbl,a,attr,cls)=>`<tr${attr||''}${cls?` class="${cls}"`:''}><td>${lbl}</td><td>${fmt(a.n)}</td><td>${fmt(a.done)}<span class="pbar"><i style="width:${pct(a.p)}"></i></span></td><td>${a.draft?fmt(a.draft):'-'}</td><td>${a.none?fmt(a.none):'-'}</td><td${a.issue?' class="badt"':''}>${a.issue?fmt(a.issue):'-'}</td><td${a.old?' class="badt"':''}>${a.old?fmt(a.old):'-'}</td></tr>`;
 const body=S.zones.map(z=>{const dcs=Object.values(S.dcs).filter(d=>d.zone===z).map(d=>[d,S.cars.filter(c=>c.dc===d.dc)]).filter(x=>x[1].length);if(!dcs.length)return'';
  return row(esc(z),agg(dcs.flatMap(x=>x[1])),'','zone')+dcs.map(([d,cs])=>row(esc(d.name),agg(cs),isStaff()?` data-dc="${d.dc}"`:'')).join('')}).join('');
 $('#view').innerHTML=`<p class="eyebrow">ตรวจสภาพรถประจำเดือน</p><div class="page-h"><h1>สรุปทั่วประเทศ · ${mLabel(S.month)}</h1><p class="say">รถทั้งหมด ${fmt(T.n)} คัน จาก NIMEX Car Performance Dashboard</p></div>
 <div class="kpis">${kpi('ตรวจครบแล้ว',fmt(T.done)+' <small>/ '+fmt(T.n)+'</small>',pct(T.p),'#1d57b8')}${kpi('ยังไม่ครบ / ยังไม่ตรวจ',fmt(T.draft)+' / '+fmt(T.none),'','#d4af37')}${kpi('พบผิดปกติ',fmt(T.issue)+' <small>คัน</small>','',T.issue?'#b8334a':'#6e93d6')}${kpi('ยางอายุ '+MAXY+' ปีขึ้นไป',fmt(T.old)+' <small>คัน</small>','',T.old?'#b8334a':'#6e93d6')}</div>
 <div class="tools"><select id="msel" aria-label="เดือน">${monthOpts()}</select>${isStaff()?`<button type="button" class="btn alt" id="s-xl">${IC.share}Excel</button>`:''}<button type="button" class="btn alt" id="s-txt">${IC.share}แชร์สรุป</button></div>
 <div class="card"><h2>ความคืบหน้าแยกภาค / DC</h2>${isStaff()?'<p class="note">แตะชื่อ DC เพื่อดูรายการรถ</p>':''}<div class="tw"><table class="t"><thead><tr><th>ภาค / DC</th><th>รถ</th><th>ตรวจครบ</th><th>ไม่ครบ</th><th>ยังไม่ตรวจ</th><th>ผิดปกติ</th><th>ยางเก่า</th></tr></thead><tbody>${body}${row('รวม',T,'','sum')}</tbody></table></div></div>`;
 $('#msel').onchange=async e=>{S.month=e.target.value;if(isStaff()){try{await loadRecs(S.month)}catch(x){}}viewSum()};
 $$('tr[data-dc]').forEach(tr=>tr.onclick=()=>{S.dcSel=tr.dataset.dc;S.filt='all';go('cars')});
 $('#s-txt').onclick=()=>{const z=S.zones.map(zn=>{const a=agg(S.cars.filter(c=>S.dcs[c.dc]&&S.dcs[c.dc].zone===zn));return a.n?`• ${zn} ${a.done}/${a.n} (${pct(a.p)})${a.issue?' ⚠️ ผิดปกติ '+a.issue:''}`:''}).filter(Boolean);
  shareText([`📋 สรุปตรวจสภาพรถ ${mLabel(S.month)}`,`✅ ตรวจครบ ${T.done}/${T.n} คัน (${pct(T.p)})`,`⏳ ยังไม่ครบ ${T.draft} · ยังไม่ตรวจ ${T.none}`,`⚠️ พบผิดปกติ ${T.issue} คัน · ยางเก่า ${T.old} คัน`,'',...z].join('\n'))};
 if($('#s-xl'))$('#s-xl').onclick=exportXlsx}
async function exportXlsx(){if(!window.XLSX)return toast('กำลังโหลดตัวสร้าง Excel ลองอีกครั้ง',true);if(S.loadedMonth!==S.month){try{await loadRecs(S.month)}catch(e){}}
 const recs=S.cars.map(c=>[c,S.pend[S.month+'|'+c.pl]||S.recs[c.pl]]);const link=r=>{const id=driveId(r);return id?`https://drive.google.com/file/d/${id}/view`:''};
 const head=['เดือน','ภาค','DC','ทะเบียน','ชนิด','กลุ่ม','ผู้ตรวจ','เลขไมล์','สถานะ','ผล','รายการผิดปกติ','รายละเอียดความผิดปกติ',...TY.map(t=>'ปียาง '+t[1]),'ยางเก่า',...CHECKS.map(c=>c[1]),'กล้องหน้ารถ','บันทึกล่าสุด',...PHOTO.flatMap(p=>p.s.map(s=>'รูป '+s[1])),'รูปจุดผิดปกติ','ใบเคลม'];
 const rows=recs.filter(x=>x[1]).map(([c,r])=>[mLabel(r.month),(S.dcs[c.dc]||{}).zone||'',dcName(c.dc),c.pl,TYN[c.ty]||c.ty,GRP[c.g]||c.g,r.inspector,r.mile?+r.mile:'',r.status==='done'?'ครบ':'ยังไม่ครบ',r.result==='issue'?'ผิดปกติ':'ปกติ',
  badList(r).map(k=>CKL[k]+(r.checks[k].n?' ('+r.checks[k].n+')':'')).join(', '),r.issue.v==='has'?r.issue.t:'',...TY.map(([k])=>r.tyres[k]||''),tyreOld(r.tyres)?'ใช่':'',
  ...CHECKS.map(([k])=>!r.checks[k]||!r.checks[k].v?'':r.checks[k].v==='ok'?'ปกติ':'ผิดปกติ'+(r.checks[k].n?': '+r.checks[k].n:'')),CAML[camS(r)]||'',dtLabel(r.updated),...PHOTO.flatMap(p=>p.s.map(([k])=>link(r.photos[k]))),r.photos.damage.map(link).join(' '),r.photos.claim.map(link).join(' ')]);
 const none=recs.filter(x=>!x[1]).map(([c])=>[(S.dcs[c.dc]||{}).zone||'',dcName(c.dc),c.pl,TYN[c.ty]||c.ty,GRP[c.g]||c.g]);
 const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([head,...rows]);ws['!cols']=head.map((h,i)=>({wch:i<12?Math.max(10,h.length+2):14}));XLSX.utils.book_append_sheet(wb,ws,'ผลตรวจ');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['ภาค','DC','ทะเบียน','ชนิด','กลุ่ม'],...none]),'ยังไม่ตรวจ');
 XLSX.writeFile(wb,`NIMEX-Car-Inspection-Monthly-${S.month}.xlsx`)}

/* ---------- admin: required / optional + notes for inspectors ---------- */
function viewSet(){$('#ttl').textContent='ตั้งค่าฟอร์มตรวจ';$('#sub').textContent='เฉพาะผู้ดูแล · มีผลกับผู้ตรวจทุกคน';
 const c=JSON.parse(JSON.stringify(S.cfg||{}));c.req=c.req||{};c.note=c.note||{};
 const row=(k,l,d,hint)=>`<div class="srow"><div class="snm">${esc(l)}${hint?`<small>${esc(hint)}</small>`:''}</div><div class="seg2 sreq" data-k="${k}"><button type="button" data-v="1" aria-pressed="${rq0(c,k,d)}">บังคับ</button><button type="button" data-v="0" aria-pressed="${!rq0(c,k,d)}">ไม่บังคับ</button></div><input class="snote" data-n="${k}" placeholder="หมายเหตุถึงผู้ตรวจ (ถ้ามี)" value="${esc(c.note[k]||'')}" aria-label="หมายเหตุ ${esc(l)}"></div>`;
 const secNote=k=>`<input class="snote sec" data-n="${k}" placeholder="หมายเหตุของหมวดนี้ (แสดงบนสุดของหมวด)" value="${esc(c.note[k]||'')}" aria-label="หมายเหตุหมวด">`;
 $('#view').innerHTML=`<p class="eyebrow">เฉพาะผู้ดูแล</p><div class="page-h"><h1>บังคับหรือไม่บังคับ และหมายเหตุ</h1><p class="say">รายการที่ "บังคับ" ต้องมีครบก่อนกดส่ง หมายเหตุจะแสดงให้ผู้ตรวจเห็นใต้รายการนั้น</p></div>
 <div class="card"><h2>ประกาศถึงผู้ตรวจทุกคน</h2><div class="field"><textarea id="s-gen" placeholder="แสดงบนสุดของฟอร์มตรวจ เช่น เดือนนี้เน้นถ่ายม่านความเย็นให้เห็นรางด้านบน">${esc(c.general||'')}</textarea></div></div>
 <div class="card"><h2>ข้อมูลรถ</h2>${row('mile','เลขไมล์',0)}</div>
 ${PHOTO.map(s=>`<div class="card"><h2>${esc(s.t)}${s.only?' <small>(เฉพาะรถ 042)</small>':''}</h2>${secNote('sec:'+s.k)}${s.s.map(([k,l])=>row(k,'รูป'+l,1)).join('')}${s.k==='dot'?row('tyres','ใส่เลขปียาง 4 เส้น',1):''}</div>`).join('')}
 <div class="card"><h2>รายการตรวจ ปกติ / ผิดปกติ</h2>${secNote('sec:check')}${CHECKS.map(([k,l,h])=>row('ck:'+k,l,1,h)).join('')}</div>
 <div class="card"><h2>กล้องหน้ารถ</h2>${row('cam','เลือกสถานะกล้อง (มี / ไม่มี / กล้องเสีย / การ์ดเสีย)',1,'ถ้าเลือก "ไม่มีกล้อง" ไม่ต้องถ่ายรูป')}</div>
 <div class="card"><h2>สรุปความผิดปกติ</h2>${row('issue','เลือก "ปกติ" หรือ "พบความผิดปกติ"',1)}</div>`;
 $$('.sreq button').forEach(b=>b.onclick=()=>{const p=b.parentElement;c.req[p.dataset.k]=+b.dataset.v;p.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
 $$('.snote').forEach(i=>i.oninput=()=>{const v=i.value.trim();if(v)c.note[i.dataset.n]=v;else delete c.note[i.dataset.n]});
 $('#s-gen').oninput=e=>{c.general=e.target.value.trim()};
 const ab=$('#actbar');ab.hidden=false;ab.innerHTML=`<button type="button" class="btn gold" id="s-save">${IC.check}บันทึกการตั้งค่า</button>`;
 $('#s-save').onclick=async()=>{const b=$('#s-save');b.disabled=true;try{const j=await api({a:'set',k:'form',v:c});S.cfg=j.v;if(S.pub){S.pub.cfg={form:j.v};IDB.put('cache','pub',S.pub)}toast('บันทึกแล้ว ผู้ตรวจจะเห็นเมื่อเปิดแอปครั้งถัดไป')}catch(e){toast('บันทึกไม่สำเร็จ: '+e.message,true)}b.disabled=false}}

/* ---------- account / sync sheets ---------- */
function meSheet(){if(!isStaff()){const sh=sheet(`<h2>เข้าสู่ระบบ</h2><p class="say">ผู้ตรวจรถเข้าสู่ระบบเพื่อบันทึกผลตรวจ</p><button type="button" class="btn" id="me-login">เข้าสู่ระบบผู้ตรวจ</button>`);$('#me-login').onclick=()=>{closeSheet();showLogin()};return}
 const s=S.sess;const sh=sheet(`<h2>บัญชีผู้ใช้</h2><dl class="dl"><dt>ชื่อ</dt><dd>${esc(s.name)}</dd><dt>สิทธิ์</dt><dd>${s.role==='admin'?'ผู้ดูแล':'ผู้ตรวจ'}</dd><dt>DC</dt><dd>${s.dc==='all'?'ทุก DC':esc(dcName(s.dc))}</dd></dl>
 <div class="field"><label class="l" for="me-dc">เปลี่ยน DC</label><select id="me-dc">${dcOpts(s.dc,isAdmin())}</select></div>
 <div class="field"><label class="l" for="me-name">ชื่อผู้ตรวจ</label><input id="me-name" value="${esc(s.name)}"></div>
 <div class="btns"><button type="button" class="btn" id="me-save">บันทึก</button>${isAdmin()?'<button type="button" class="btn alt" id="me-cars">ดึงรายชื่อรถล่าสุด</button>':''}<button type="button" class="btn bad" id="me-out">ออกจากระบบ</button></div><p class="msg" id="me-msg"></p>`);
 $('#me-save').onclick=()=>{s.dc=$('#me-dc').value;s.name=$('#me-name').value.trim()||s.name;LS.set('insp-sess',s);S.dcSel=s.dc;closeSheet();go(home(),{},true)};
 $('#me-out').onclick=async()=>{const n=(await IDB.all('photos')).length+Object.keys(S.pend).length;if(n&&!confirm(`ยังมีข้อมูลรอส่ง ${n} รายการ ถ้าออกจากระบบตอนนี้ ข้อมูลจะยังอยู่ในเครื่องและส่งต่อเมื่อเข้าสู่ระบบอีกครั้ง ออกจากระบบไหม?`))return;closeSheet();logout()};
 if($('#me-cars'))$('#me-cars').onclick=async()=>{$('#me-msg').textContent='กำลังดึงข้อมูล…';try{const j=await api({a:'cars'});S.pub.cars=j.cars;S.pub.dcs=j.dcs;setPub(S.pub);$('#me-msg').textContent=`ได้รถ ${j.cars.length} คัน, DC ${j.dcs.length} แห่ง`}catch(e){$('#me-msg').textContent='ไม่สำเร็จ: '+e.message}}}
$('[data-act="me"]').onclick=meSheet;
$('#sync').onclick=()=>{const n=S.nPhotos,r=Object.keys(S.pend).length;sheet(`<h2>การส่งข้อมูล</h2><p class="say">${n||r?`รอส่ง ${n} รูป และผลตรวจ ${r} คัน · ข้อมูลเก็บในเครื่องนี้อย่างปลอดภัย ระบบจะส่งให้อัตโนมัติเมื่อมีสัญญาณ`:'ส่งข้อมูลครบแล้ว'}</p><p class="say">สถานะ: ${S.online?'ออนไลน์':'ออฟไลน์'}</p>${n||r?'<button type="button" class="btn" id="sy-go">ส่งตอนนี้</button>':''}`);if($('#sy-go'))$('#sy-go').onclick=()=>{closeSheet();sync()}};
$('[data-act="theme"]').onclick=()=>{const cur=document.documentElement.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'),nx=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',nx);try{localStorage.setItem('insp-theme',nx)}catch(e){}};

/* ---------- boot / login ---------- */
const bootMsg=h=>{const b=$('#boot');b.hidden=false;$('#app').hidden=true;b.innerHTML=h};
function logout(msg){LS.set('insp-sess',null);S.sess=null;S.recs={};showLogin(msg)}
function showLogin(err){const admin=location.hash==='#admin';
 bootMsg(`<div class="lgw"><img src="logo.png" alt="NIM Express และ SEAL Gold Chain"></div><h1>${admin?'ผู้ดูแลระบบ':'เข้าสู่ระบบผู้ตรวจรถ'}</h1>${err?`<p class="badt">${esc(err)}</p>`:''}
 <form id="lg" autocomplete="on">${admin?'':`<div class="field"><label class="l" for="lg-dc">1. เลือก DC ของคุณ</label><select id="lg-dc" required><option value="">— เลือก DC —</option>${dcOpts('',false)}</select></div>`}
 <div class="field"><label class="l" for="lg-name">${admin?'ชื่อ':'2. ชื่อผู้ตรวจ'}</label><input id="lg-name" autocomplete="name" required placeholder="ชื่อ-นามสกุล"></div>
 <div class="field"><label class="l" for="lg-key">${admin?'รหัสผู้ดูแล':'3. รหัสผู้ตรวจ'}</label><input id="lg-key" type="password" ${admin?'':'inputmode="numeric"'} autocomplete="current-password" required></div>
 <button class="btn gold" id="lg-go">เข้าสู่ระบบ</button><p class="msg" id="lg-msg"></p></form>${admin?'':'<button type="button" class="lnk" id="lg-view">ดูสรุปอย่างเดียว ไม่ต้องเข้าสู่ระบบ</button>'}`);
 const last=LS.get('insp-last')||{};if($('#lg-dc')&&last.dc)$('#lg-dc').value=last.dc;if(last.name)$('#lg-name').value=last.name;
 if($('#lg-view'))$('#lg-view').onclick=()=>startApp();
 $('#lg').onsubmit=async e=>{e.preventDefault();const dc=admin?'all':$('#lg-dc').value,name=$('#lg-name').value.trim(),key=$('#lg-key').value.trim();if(!dc||!name||!key)return;
  $('#lg-go').disabled=true;$('#lg-msg').textContent='กำลังตรวจสอบรหัส…';
  try{const j=await api({a:'auth'},key);if(admin&&j.role!=='admin'){const er=new Error('denied');er.code='denied';throw er}S.sess={key,role:j.role,dc:j.role==='admin'&&admin?'all':dc,name};LS.set('insp-sess',S.sess);LS.set('insp-last',{dc:admin?last.dc:dc,name});
   try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(x){}if(admin)history.replaceState(null,'',location.pathname);startApp()}
  catch(x){$('#lg-go').disabled=false;$('#lg-msg').innerHTML=x.code==='denied'?'<span class="badt">รหัสไม่ถูกต้อง</span>':'<span class="badt">เชื่อมต่อไม่ได้ ตรวจสอบสัญญาณแล้วลองอีกครั้ง</span>'}}}
async function startApp(){S.dcSel=S.sess&&S.sess.dc||null;S.filt='all';
 if(isStaff()){bootMsg('<p>กำลังโหลดผลตรวจ…</p>');try{await loadRecs(S.month)}catch(e){return}}
 $('#boot').hidden=true;$('#app').hidden=false;history.replaceState({v:home()},'');render({v:home()});countPending();sync()}
async function boot(){
 const cv=$('#cover');if(cv){const close=()=>cv.remove();cv.querySelector('button').onclick=close;cv.querySelector('.fg').onclick=close;cv.querySelector('button').focus()}
 if(!API){bootMsg('<h1>ยังไม่ได้ตั้งค่า</h1><p>ยังไม่ได้ใส่ที่อยู่ระบบข้อมูลใน config.js</p>');return}
 for(const[k,v]of await IDB.all('map'))S.MAP[k]=v;for(const[k,v]of await IDB.all('outbox'))S.pend[k]=norm(v);for(const[k,v]of await IDB.all('drafts'))S.drafts[k]=norm(v);
 try{setPub(await loadPub())}catch(e){bootMsg('<h1>โหลดข้อมูลไม่สำเร็จ</h1><p>ตรวจสอบสัญญาณอินเทอร์เน็ต แล้วเปิดหน้านี้ใหม่</p><button class="btn" onclick="location.reload()">ลองใหม่</button>');return}
 if(location.hash==='#admin'&&!isAdmin()){showLogin();return}
 if(!S.sess){showLogin();return}
 startApp()}
boot();
})();
