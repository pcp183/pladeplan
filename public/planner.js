'use strict';
const DEFAULT_PARTS=[['Side',580,720,2],['Bund',564,580,1],['Hylde',564,560,3]];
const MAX_PIECES=2000,DEFAULT_NAME='Ny skæreseddel';
/* Indeks fra gemte skæresedler før pladetyperne blev udvidet. */
const LEGACY_MATERIAL=['mdf-19-1220x2440','span-16-1220x2440','birk-19-1250x2500','mdf-12-1220x2440','custom'];
const $=s=>document.querySelector(s),P=$('#parts'),EMPTY_BOARDS=$('#boards').innerHTML;
let result=null,draft=[],toastTimer,activeProjectId=null,undoAction=null,prefMaterial=-1;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(n,d=1){return Number(n).toLocaleString('da-DK',{maximumFractionDigits:d})}function dim(n){return Number(n).toLocaleString('da-DK',{maximumFractionDigits:1,useGrouping:false})}
function toast(s,undo){let e=$('#toast');undoAction=typeof undo==='function'?undo:null;if(undoAction){e.innerHTML=`<span>${esc(s)}</span><button type="button" class="toastundo" id="toastUndo">Fortryd</button>`;$('#toastUndo').onclick=()=>{if(undoAction){let fn=undoAction;undoAction=null;fn()}e.classList.remove('show')}}else{e.textContent=s}e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{e.classList.remove('show');undoAction=null},undoAction?6000:2600)}
function setExportEnabled(on){[['#csv','Hent snitliste som CSV'],['#print','Udskriv skæreplan med snitliste'],['#copyCut','Kopiér snitliste til udklipsholder']].forEach(([id,ok])=>{let b=$(id);if(!b)return;b.disabled=!on;b.setAttribute('aria-disabled',on?'false':'true');b.title=on?ok:'Beregn planen først'})}
function syncCalcLabel(){let label,needs;if($('.result').classList.contains('stale')&&result){label='Opdater skæreplan →';needs=true}else{label='Beregn skæreplan →';needs=false}['#optimize','#optimizeSticky'].forEach(id=>{let b=$(id);if(!b)return;if(!b.classList.contains('busy'))b.textContent=label;b.classList.toggle('needs-update',needs)})}
function coachDone(){try{return localStorage.getItem('pladeplan-coach')==='1'}catch{return false}}
function dismissCoach(){try{localStorage.setItem('pladeplan-coach','1')}catch{}let c=$('#coach');if(c)c.classList.remove('show')}
function maybeShowCoach(){let c=$('#coach');if(!c)return;c.classList.toggle('show',!coachDone())}
function syncExampleChip(){let chip=$('#exampleChip');if(!chip)return;let hide=false;try{hide=localStorage.getItem('pladeplan-example-tip')==='1'}catch{}let rows=dataPartRows();let isDefault=rows.length===3&&rows.every((r,i)=>{let v=[...r.querySelectorAll('input')].map(x=>x.value.trim());let d=DEFAULT_PARTS[i];return v[0]===String(d[0])&&+v[1]===+d[1]&&+v[2]===+d[2]&&+v[3]===+d[3]});chip.classList.toggle('show',!hide&&isDefault&&!result)}
function syncFlow(){
  let f1=$('#flow1'),f2=$('#flow2'),f3=$('#flow3'),hint=$('#flowHint');if(!f1)return;
  let hasSheet=+$('#sheetW').value>0&&+$('#sheetH').value>0;
  let nParts=dataPartRows().filter(r=>{let v=[...r.querySelectorAll('input')].map(x=>x.value.trim());return +v[1]>0&&+v[2]>0&&+v[3]>=1}).length;
  let stale=!!result&&$('.result').classList.contains('stale');
  let hasPlan=!!result&&!stale;
  let ready=!hasPlan&&!stale&&hasSheet&&nParts>0;
  f1.className='flowstep'+(!hasSheet?' on':' done');
  f2.className='flowstep'+(nParts?' done':hasSheet?' on':'');
  f3.className='flowstep'+(hasPlan?' done':(ready||stale)?' on':'');
  [f1,f2,f3].forEach(el=>el.removeAttribute('aria-current'));
  let current=hasPlan||stale||ready?f3:(nParts||hasSheet?f2:f1);
  if(current)current.setAttribute('aria-current','step');
  if(hint){if(hasPlan)hint.textContent='Plan klar — se resultatet';else if(stale)hint.textContent='Emnerne er ændret — opdater planen';else if(ready)hint.textContent='Trin 3: tryk Beregn';else if(hasSheet)hint.textContent='Trin 2: tilføj emner';else hint.textContent='Trin 1: vælg lagerplade'}
  let tag=$('#appTagline');if(tag)tag.hidden=!!hasPlan;
  let sheet=$('#sheetCard'),parts=$('#partsCard'),wrap=$('.calcwrap');
  if(sheet)sheet.classList.toggle('stepfocus',!hasPlan&&!hasSheet);
  if(parts)parts.classList.toggle('stepfocus',!hasPlan&&hasSheet&&!nParts);
  if(wrap)wrap.classList.toggle('ready',ready);
}
function showOkBar(msg){let bar=$('#okBar'),t=$('#okBarText');if(!bar)return;if(t)t.textContent=msg;bar.classList.add('show');clearTimeout(showOkBar._t);showOkBar._t=setTimeout(()=>bar.classList.remove('show'),5000)}
function hideOkBar(){let bar=$('#okBar');if(bar)bar.classList.remove('show')}
function focusFirstInvalid(){let inv=P.querySelector('input.invalid');if(inv){inv.focus();inv.scrollIntoView({behavior:'smooth',block:'center'});return true}return false}
function enrichError(msg){
  let fix='';
  if(/for stort/i.test(msg)){fix='<span class="errfix">Tip: slå «Tillad rotation» til, eller vælg en større plade. <button type="button" id="errOpenAdv">Gå til savspor</button></span>'}
  else if(/kantfraskær/i.test(msg)){fix='<span class="errfix"><button type="button" id="errOpenAdv">Gå til kantfraskær</button></span>'}
  else if(/bredde og længde|mangler navn|Antal for/i.test(msg)){fix='<span class="errfix">Ret de markerede felter i emnelisten.</span>'}
  else if(/mindst ét emne/i.test(msg)){fix='<span class="errfix"><button type="button" id="errAddPart">Tilføj emne</button></span>'}
  return esc(msg)+fix;
}
function bindErrorFixes(){let a=$('#errOpenAdv');if(a)a.onclick=()=>{let d=$('#advancedPanel');d?.scrollIntoView({behavior:'smooth',block:'center'});(d&&d.querySelector('#kerf,#trim,#rotate')||$('#kerf'))?.focus()};let b=$('#errAddPart');if(b)b.onclick=()=>{$('#addPart').click()}}
function syncStaleBar(){let bar=$('#staleBar');if(!bar)return;if($('.result').classList.contains('stale')&&result){bar.classList.add('show');bar.hidden=false}else{bar.classList.remove('show');bar.hidden=true}}
function dataPartRows(){return [...P.rows].filter(r=>!r.classList.contains('partempty-row'))}
function ensurePartsEmpty(){let empty=P.querySelector('.partempty-row');if(dataPartRows().length){if(empty)empty.remove();return}if(empty)return;let tr=document.createElement('tr');tr.className='partempty-row';tr.innerHTML='<td colspan="5"><div class="partempty"><strong>Ingen emner endnu</strong>Tilføj den første del, der skal skæres — eller indsæt fra en note.<br><button type="button" class="btn small" id="emptyAddPart">＋ Tilføj første emne</button> <button type="button" class="btn small ai" id="emptyOpenAI" style="margin-left:6px">✦ Smart import</button></div></td>';P.append(tr);let btn=tr.querySelector('#emptyAddPart');if(btn)btn.onclick=()=>{add();P.querySelector('tr:not(.partempty-row):last-child input')?.select()};let bi=tr.querySelector('#emptyOpenAI');if(bi)bi.onclick=()=>{$('#openAI').click()}}


/* ---------- Emneliste ---------- */
function validatePartRow(tr){
  let [name,w,h,q]=[...tr.querySelectorAll('input')];
  let blank=!w.value&&!h.value&&(!name.value||name.value==='Nyt emne');
  name.classList.toggle('invalid',!blank&&!name.value.trim());
  w.classList.toggle('invalid',!blank&&!(+w.value>0));
  h.classList.toggle('invalid',!blank&&!(+h.value>0));
  q.classList.toggle('invalid',!blank&&(!(+q.value>=1)||!Number.isInteger(+q.value)));
}
function syncMoveButtons(){dataPartRows().forEach((tr,i,arr)=>{let up=tr.querySelector('.moveup'),dn=tr.querySelector('.movedown');if(up)up.disabled=i===0;if(dn)dn.disabled=i===arr.length-1})}
function movePart(tr,dir){let list=dataPartRows(),i=list.indexOf(tr);if(i<0)return;let j=i+dir;if(j<0||j>=list.length)return;if(dir<0)P.insertBefore(tr,list[j]);else P.insertBefore(list[j],tr);syncMoveButtons();change()}
function insertPartAt(data,idx){add(data,false);let rowsNow=dataPartRows(),tr=rowsNow[rowsNow.length-1];if(idx<rowsNow.length-1){let ref=rowsNow[idx];P.insertBefore(tr,ref)}count();syncClearParts();syncMoveButtons();change()}
function add(r=['Nyt emne','','',1],save=true){
  let tr=document.createElement('tr');
  tr.innerHTML=`<td><input class="input" aria-label="Navn" maxlength="80" value="${esc(r[0])}"></td><td><input class="input" aria-label="Bredde i mm" type="number" min="1" step="any" inputmode="decimal" value="${esc(r[1])}"></td><td><input class="input" aria-label="Længde i mm" type="number" min="1" step="any" inputmode="decimal" value="${esc(r[2])}"></td><td><input class="input" aria-label="Antal" type="number" min="1" step="1" inputmode="numeric" value="${esc(r[3])}"></td><td><div class="partacts"><button class="move moveup" type="button" aria-label="Flyt op" title="Flyt op">↑</button><button class="move movedown" type="button" aria-label="Flyt ned" title="Flyt ned">↓</button><button class="dup" type="button" aria-label="Kopiér emne" title="Kopiér">⧉</button><button class="del" type="button" aria-label="Fjern emne" title="Fjern">×</button></div></td>`;
  tr.querySelector('.del').onclick=()=>{let idx=[...dataPartRows()].indexOf(tr),data=[...tr.querySelectorAll('input')].map(x=>x.value.trim());tr.remove();ensurePartsEmpty();change();syncClearParts();syncMoveButtons();toast('Emne fjernet',()=>insertPartAt([data[0]||'Nyt emne',data[1],data[2],data[3]||1],Math.max(0,idx)))};
  tr.querySelector('.dup').onclick=()=>{let v=[...tr.querySelectorAll('input')].map(x=>x.value.trim());add([v[0]||'Nyt emne',v[1],v[2],v[3]||1]);let last=dataPartRows().pop();last?.querySelector('input')?.select();toast('Emne kopieret')};
  tr.querySelector('.moveup').onclick=()=>movePart(tr,-1);
  tr.querySelector('.movedown').onclick=()=>movePart(tr,1);
  tr.querySelectorAll('input').forEach(x=>{x.oninput=()=>{x.classList.remove('invalid');change()};x.onblur=()=>validatePartRow(tr)});
  let er=P.querySelector('.partempty-row');if(er)er.remove();P.append(tr);count();syncClearParts();syncMoveButtons();if(save)change();
}
function rows(){return dataPartRows().map(r=>[...r.querySelectorAll('input')].map(x=>x.value.trim()))}
function count(){let {bad,area,n}=softFitCheck();let m2=(area/1e6).toFixed(2).replace('.',',');let base=n?`${n} ${n===1?'emne':'emner'} · ${m2} m²`:`0 emner`;$('#partCount').innerHTML=bad?`${esc(base)} <span class="fitnote">· ${bad} for store</span>`:esc(base);syncClearParts();syncCalcSub()}
function syncClearParts(){let b=$('#clearParts');if(!b)return;b.disabled=!dataPartRows().length}
function materialOption(){return $('#material')?.selectedOptions[0]||null}
function materialLabel(opt){
  if(opt===undefined)opt=materialOption();
  if(!opt)return '';
  if(opt.dataset.thick&&opt.dataset.mat)return `${String(opt.dataset.thick).replace('.',',')} mm ${opt.dataset.mat}`;
  if(opt.value==='custom')return 'Tilpasset mål';
  return '';
}
function selectMaterialById(id){
  if(!id)return false;
  let idx=[...$('#material').options].findIndex(o=>o.value===id);
  if(idx<0)return false;
  $('#material').selectedIndex=idx;
  return true;
}
function loadMaterialPrefId(){
  try{
    let id=localStorage.getItem('pladeplan-pref-material-id');
    if(id&&[...$('#material').options].some(o=>o.value===id))return id;
    let v=+localStorage.getItem('pladeplan-pref-material');
    if(Number.isInteger(v)&&LEGACY_MATERIAL[v])return LEGACY_MATERIAL[v];
  }catch{}
  return '';
}
function saveMaterialPref(id){
  try{
    if(id)localStorage.setItem('pladeplan-pref-material-id',id);
    let idx=[...$('#material').options].findIndex(o=>o.value===id);
    if(idx>=0)localStorage.setItem('pladeplan-pref-material',String(idx));
  }catch{}
}
function materialIdFromState(x){
  if(x&&typeof x.mid==='string'&&x.mid)return x.mid;
  if(x&&x.m!=null){
    let i=+x.m;
    if(Number.isInteger(i)&&LEGACY_MATERIAL[i])return LEGACY_MATERIAL[i];
  }
  return loadMaterialPrefId()||'mdf-19-1220x2440';
}
function syncCustomHint(){let o=materialOption(),h=$('#customHint');if(!h||!o)return;h.classList.toggle('show',!o.dataset.w)}
function syncUsable(){let el=$('#usableSize');if(!el)return;let W=+$('#sheetW').value,H=+$('#sheetH').value,t=+$('#trim').value;if(!(W>0&&H>0)||!(t>=0)){el.textContent='—';return}let uw=W-2*t,uh=H-2*t;el.textContent=(uw>0&&uh>0)?(`${dim(uw)} × ${dim(uh)} mm`):'kantfraskær for stort'}
function loadSawPref(){try{let raw=localStorage.getItem('pladeplan-pref-saw');if(!raw)return null;let o=JSON.parse(raw);if(!o||typeof o!=='object')return null;return o}catch{return null}}
function saveSawPref(){try{localStorage.setItem('pladeplan-pref-saw',JSON.stringify({k:$('#kerf').value,t:$('#trim').value,r:$('#rotate').checked}))}catch{}}
function announce(msg){let el=$('#srLive');if(!el)return;el.textContent='';requestAnimationFrame(()=>{el.textContent=msg})}
function usableWH(){let W=+$('#sheetW').value,H=+$('#sheetH').value,t=+$('#trim').value;if(!(W>0&&H>0)||!(t>=0))return null;let uw=W-2*t,uh=H-2*t;return(uw>0&&uh>0)?{uw,uh}:null}
function softFitCheck(){
  let u=usableWH(),rot=$('#rotate').checked,bad=0,area=0,n=0;
  dataPartRows().forEach(tr=>{
    let [name,wEl,hEl,qEl]=[...tr.querySelectorAll('input')];
    let w=+wEl.value,h=+hEl.value,q=Math.floor(+qEl.value)||0;
    wEl.classList.remove('oversize');hEl.classList.remove('oversize');
    if(!(w>0&&h>0))return;
    n+=q;area+=w*h*q;
    if(!u)return;
    let fits=(w<=u.uw&&h<=u.uh)||(rot&&h<=u.uw&&w<=u.uh);
    if(!fits){wEl.classList.add('oversize');hEl.classList.add('oversize');bad+=Math.max(1,q)}
  });
  return{bad,area,n,u};
}
function syncCalcSub(){
  let sub=$('#calcSub');if(!sub)return;
  let {bad,area,n}=softFitCheck();
  if($('.result').classList.contains('stale')&&result){sub.textContent='Emner er ændret — opdater planen';return}
  if(result){sub.textContent='Planen er beregnet. Ret emnerne, hvis du vil lave den om.';return}
  if(bad){sub.textContent=`${bad} ${bad===1?'emne':'emner'} passer ikke på pladen — ret mål eller tillad rotation`;return}
  if(n>0){let m2=(area/1e6).toFixed(2).replace('.',',');sub.textContent=`Trin 3 · ${n} ${n===1?'emne':'emner'} · ${m2} m² — tryk Beregn`;return}
  sub.textContent='Trin 2: tilføj emner, og tryk derefter Beregn';
}
function syncBoardJump(){
  let el=$('#boardJump');if(!el)return;
  if(!result||!result.s||result.s.length<2||$('.result').classList.contains('stale')){el.classList.remove('show');el.innerHTML='';return}
  el.innerHTML='<span>Hop til</span>'+result.s.map((_,i)=>`<button type="button" class="jbtn" data-bi="${i}" aria-label="Hop til plade ${i+1}">${i+1}</button>`).join('');
  el.classList.add('show');
  el.querySelectorAll('.jbtn').forEach(b=>b.onclick=()=>{let board=$('#boards')?.querySelector(`.board[data-board="${b.dataset.bi}"]`);board?.scrollIntoView({behavior:'smooth',block:'start'})});
}
function copyCutlist(){
  if(!result||$('.result').classList.contains('stale'))return toast('Beregn planen først.');
  let name=$('#projectName').value.trim()||'Skæreseddel';
  let mat=materialLabel();
  let lines=[name,`${mat?mat+' · ':''}${dim(result.W)} × ${dim(result.H)} mm · savspor ${dim(+$('#kerf').value)} mm · kantfraskær ${dim(+$('#trim').value)} mm`,`${result.s.length} ${result.s.length===1?'plade':'plader'} · ${result.ps.length} emner · brugt ${(result.ps.reduce((n,a)=>n+a.w*a.h,0)/1e6).toFixed(2).replace('.',',')} m² · udnyttelse ${fmt(result.y)}% · spild ${fmt(100-result.y)}%`,''];
  result.s.forEach((s,i)=>{
    lines.push(`Plade ${i+1} (${s.pieces.length} stk.)`);
    s.pieces.forEach((p,j)=>lines.push(`  ${j+1}. ${p.name}: ${dim(p.w)} × ${dim(p.h)} mm${p.turn?' (roteret)':''}`));
    lines.push('');
  });
  let text=lines.join('\n').trim();
  const done=()=>toast('Snitliste kopieret');
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done))}
  else fallbackCopy(text,done);
}
function copyText(text,done){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done))}else fallbackCopy(text,done)}
function fallbackCopy(text,done){let ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.left='-9999px';document.body.append(ta);ta.select();try{document.execCommand('copy');done()}catch{toast('Kunne ikke kopiere — brug CSV i stedet')}ta.remove()}
function updatePrintHeader(){let t=$('#printTitle'),m=$('#printMeta'),d=$('#printDate');if(!t)return;t.textContent=$('#projectName').value.trim()||'Skæreseddel';if(d)d.textContent='Udskrevet '+new Date().toLocaleString('da-DK',{dateStyle:'medium',timeStyle:'short'});if(!result){m.textContent='';return}let mat=materialLabel(),unit=manualSheetPrice(),price=unit?` · pris ${kr(unit*result.s.length)}`:'';m.textContent=`${mat?mat+' · ':''}${result.s.length} ${result.s.length===1?'plade':'plader'} · ${result.ps.length} emner · ${dim(result.W)} × ${dim(result.H)} mm · savspor ${dim(+$('#kerf').value)} mm · kantfraskær ${dim(+$('#trim').value)} mm · udnyttelse ${fmt(result.y)}% · spild ${fmt(100-result.y)}%${price}`}
function state(){let o=materialOption();return{id:activeProjectId,n:$('#projectName').value,m:$('#material').selectedIndex,mid:o?o.value:'',w:$('#sheetW').value,h:$('#sheetH').value,k:$('#kerf').value,t:$('#trim').value,r:$('#rotate').checked,pr:$('#sheetPrice')?$('#sheetPrice').value:'',p:rows()}}
function store(){try{localStorage.setItem('pladeplan',JSON.stringify(state()))}catch{}}
function markStale(){if(result){$('#resultSubtitle').textContent='Ændret – tryk “Opdater skæreplan” for at opdatere';$('.result').classList.add('stale');syncStaleBar();syncCalcLabel();setExportEnabled(false);syncPriceStat()}}
function change(){count();ensurePartsEmpty();store();$('#saveState').textContent='Kladde gemt lokalt';markStale();syncUsable();syncFlow();syncExampleChip();syncCalcSub();syncBoardJump();hideOkBar();if(result)updatePrintHeader()}
function resetStats(){['#statSheets','#statUsed','#statWaste'].forEach(id=>{let el=$(id);if(el)el.textContent='—'});let wa=$('#statWasteArea');if(wa)wa.textContent=''}
function clearResult(){result=null;resetStats();$('#resultSubtitle').textContent='Tryk «Beregn skæreplan» for at se plader, spild og tegning';$('#boardCount').textContent='Ingen plan endnu';$('#boards').innerHTML=EMPTY_BOARDS;$('#error').classList.remove('show');$('.result').classList.remove('stale');syncStaleBar();syncCalcLabel();setExportEnabled(false);renderPrices();updatePrintHeader();hideOkBar();syncFlow();syncExampleChip();syncCalcSub();syncBoardJump()}
function applyState(x){
  x=x||{};activeProjectId=x.id||null;
  $('#projectName').value=x.n||DEFAULT_NAME;
  let matId=materialIdFromState(x);
  if(!selectMaterialById(matId))selectMaterialById(x.mid?'custom':'mdf-19-1220x2440');
  let opt=materialOption();
  if(x.w!=null||x.h!=null){$('#sheetW').value=x.w||1220;$('#sheetH').value=x.h||2440}
  else if(opt&&opt.dataset.w){$('#sheetW').value=opt.dataset.w;$('#sheetH').value=opt.dataset.h}
  else{$('#sheetW').value=1220;$('#sheetH').value=2440}
  if($('#sheetPrice'))$('#sheetPrice').value=x.pr!=null?x.pr:'';
  let saw=loadSawPref();
  let kDef=saw&&saw.k!=null?saw.k:3.2,tDef=saw&&saw.t!=null?saw.t:10,rDef=saw&&typeof saw.r==='boolean'?saw.r:true;
  $('#kerf').value=x.k!=null?x.k:kDef;$('#trim').value=x.t!=null?x.t:tDef;$('#rotate').checked=x.r!=null?!!x.r:rDef;
  P.innerHTML='';(Array.isArray(x.p)&&x.p.length?x.p:DEFAULT_PARTS).forEach(r=>add(r,false));
  count();clearResult();store();syncCustomHint();syncMoveButtons();syncUsable();syncFlow();syncExampleChip();syncCalcSub();}
function load(){try{let x=JSON.parse(localStorage.getItem('pladeplan'));if(!x||typeof x!=='object')return false;applyState(x);return true}catch{return false}}

/* ---------- Validering ---------- */
function pieces(){
  let out=[];
  for(let [name,w,h,q] of rows()){
    if(!w&&!h&&(!name||name==='Nyt emne'))continue;
    if(!name)throw Error('Et emne mangler navn.');
    if(!(+w>0)||!(+h>0))throw Error(`Udfyld bredde og længde (større end 0) for “${name}”.`);
    if(!(+q>=1)||!Number.isInteger(+q))throw Error(`Antal for “${name}” skal være et helt tal på mindst 1.`);
    if(out.length+ +q>MAX_PIECES)throw Error(`Planen kan højst indeholde ${MAX_PIECES} emner ad gangen.`);
    for(let i=0;i<+q;i++)out.push({name,w:+w,h:+h});
  }
  return out;
}

/* ---------- Pakning (guillotine – kan skæres med pladesav) ---------- */
const SORTS=[
  (a,b)=>b.w*b.h-a.w*a.h||Math.max(b.w,b.h)-Math.max(a.w,a.h),
  (a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h,
  (a,b)=>b.h-a.h||b.w-a.w,
  (a,b)=>b.w-a.w||b.h-a.h,
  (a,b)=>(b.w+b.h)-(a.w+a.h)
];
function packOnce(parts,uw,uh,k,t,rot,sort,split){
  let sheets=[];
  const orients=p=>rot&&p.w!==p.h?[[p.w,p.h,false],[p.h,p.w,true]]:[[p.w,p.h,false]];
  const findIn=(p,list)=>{let best=null;for(let si of list){let fr=sheets[si].free;for(let fi=0;fi<fr.length;fi++){let f=fr[fi];for(let [w,h,turn] of orients(p)){if(w<=f.w&&h<=f.h){let score=f.w*f.h-w*h,side=Math.min(f.w-w,f.h-h);if(!best||score<best.score||(score===best.score&&side<best.side))best={si,fi,w,h,turn,score,side}}}}}return best};
  for(let p of [...parts].sort(sort)){
    let best=findIn(p,sheets.map((_,i)=>i));
    if(!best){sheets.push({free:[{x:t,y:t,w:uw,h:uh}],pieces:[]});best=findIn(p,[sheets.length-1])}
    let sh=sheets[best.si],f=sh.free.splice(best.fi,1)[0],{w,h}=best;
    sh.pieces.push({name:p.name,x:f.x,y:f.y,w,h,turn:best.turn});
    let rw=f.w-w-k,bh=f.h-h-k,horiz=split==='h'||(split==='auto'&&rw<bh);
    if(horiz){if(rw>0)sh.free.push({x:f.x+w+k,y:f.y,w:rw,h});if(bh>0)sh.free.push({x:f.x,y:f.y+h+k,w:f.w,h:bh})}
    else{if(rw>0)sh.free.push({x:f.x+w+k,y:f.y,w:rw,h:f.h});if(bh>0)sh.free.push({x:f.x,y:f.y+h+k,w,h:bh})}
  }
  return sheets;
}
function pack(parts,W,H,k,t,rot){
  let uw=W-2*t,uh=H-2*t;
  if(uw<=0||uh<=0)throw Error('Kantfraskæret er større end pladen.');
  for(let p of parts)if(!((p.w<=uw&&p.h<=uh)||(rot&&p.h<=uw&&p.w<=uh)))throw Error(`“${p.name}” (${dim(p.w)} × ${dim(p.h)} mm) er for stort til pladens brugbare mål (${dim(uw)} × ${dim(uh)} mm)${rot?'':' – prøv evt. at tillade rotation'}.`);
  let best=null,bestLast=0;
  for(let sort of SORTS)for(let split of ['h','v','auto']){
    let s=packOnce(parts,uw,uh,k,t,rot,sort,split),last=s[s.length-1].pieces.reduce((n,a)=>n+a.w*a.h,0);
    if(!best||s.length<best.length||(s.length===best.length&&last<bestLast)){best=s;bestLast=last}
  }
  return best;
}

/* ---------- Tegning ---------- */
function fitText(s,maxW,size){let max=Math.floor(maxW/(size*.6));if(max<2)return '';return s.length>max?s.slice(0,Math.max(1,max-1))+'…':s}
function draw(s,i,W,H){
  const sw=700,p=28,sc=(sw-2*p)/W,sh=H*sc+2*p,C=['#b9d7c2','#f2d99b','#a9cbd2','#dbc2ad','#c5c5df','#d8d6ac'];
  let r=s.pieces.map((a,j)=>{let x=p+a.x*sc,y=p+a.y*sc,w=a.w*sc,h=a.h*sc,f=Math.max(8,Math.min(13,Math.min(w,h)*.17)),label=h>=f*2.4?fitText(a.name,w-6,f):'',dims=h>=f*2.4?fitText(`${dim(a.w)} × ${dim(a.h)}${a.turn?' ↻':''}`,w-6,Math.max(8,f*.78)):'';
    return `<g class="piece" data-pi="${i}" data-pj="${j}"><title>${esc(a.name)}: ${dim(a.w)} × ${dim(a.h)} mm${a.turn?' (roteret)':''}</title><rect class="piecerect" data-pi="${i}" data-pj="${j}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${C[j%C.length]}" stroke="#506b5b"/>${label?`<text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" fill="#21372a" font-size="${f}" font-weight="700">${esc(label)}</text>`:''}${dims?`<text x="${x+w/2}" y="${y+h/2+f}" text-anchor="middle" fill="#3d5747" font-size="${Math.max(8,f*.78)}">${esc(dims)}</text>`:''}</g>`}).join('');
  let pct=Math.round(s.pieces.reduce((n,a)=>n+a.w*a.h,0)/(W*H)*100);
  let legend=s.pieces.map((a,j)=>`<li data-pi="${i}" data-pj="${j}"><span class="swatch" style="background:${C[j%C.length]}"></span><span><b>${esc(a.name)}</b><br><span class="dims">${dim(a.w)} × ${dim(a.h)} mm${a.turn?' · roteret ↻':''}</span></span></li>`).join('');
  let mat=materialLabel();
  return `<div class="board" data-board="${i}"><div class="boardhead"><b>Plade ${i+1}${mat?` · ${esc(mat)}`:''}</b><span>${s.pieces.length} ${s.pieces.length===1?'emne':'emner'} · ${pct}% udnyttet</span><div class="boardtools" role="group" aria-label="Zoom tegning"><button type="button" class="zbtn" data-z="out" aria-label="Zoom ud" title="Zoom ud">−</button><button type="button" class="zbtn fit" data-z="fit" aria-label="Tilpas" title="Tilpas">Tilpas</button><button type="button" class="zbtn" data-z="in" aria-label="Zoom ind" title="Zoom ind">+</button></div></div><div class="boardbody"><div class="svgwrap"><svg class="boardsvg" viewBox="0 0 ${sw} ${sh}" role="img" aria-label="Skæretegning for plade ${i+1}"><rect x="${p}" y="${p}" width="${W*sc}" height="${H*sc}" fill="#f6f7f3" stroke="#7f9186"/>${r}<text x="${sw/2}" y="${sh-8}" text-anchor="middle" font-size="11" fill="#526159">${dim(W)} mm</text><text x="12" y="${sh/2}" text-anchor="middle" font-size="11" fill="#526159" transform="rotate(-90 12 ${sh/2})">${dim(H)} mm</text></svg></div><ul class="cutlist" aria-label="Snitliste for plade ${i+1}"><li class="cutmeta"><span>Snitliste</span><span>${s.pieces.length} stk.</span></li>${legend}</ul></div></div>`;
}

function bindBoardUI(root){
  if(!root)return;
  root.querySelectorAll('.board').forEach(board=>{
    let wrap=board.querySelector('.svgwrap'),svg=board.querySelector('.boardsvg');
    if(!wrap||!svg)return;
    let z=+(wrap.dataset.z||1);
    const apply=()=>{wrap.dataset.z=String(z);svg.style.width=(z*100)+'%';svg.style.maxWidth='none';svg.style.transform='none';};
    apply();
    board.querySelectorAll('.zbtn').forEach(b=>b.onclick=()=>{
      let act=b.dataset.z;
      if(act==='in')z=Math.min(2.5,Math.round((z+.25)*100)/100);
      else if(act==='out')z=Math.max(.5,Math.round((z-.25)*100)/100);
      else z=1;
      apply();
    });
    const clear=()=>{board.querySelectorAll('.hot').forEach(el=>el.classList.remove('hot'))};
    const light=(pi,pj)=>{clear();board.querySelectorAll(`[data-pi="${pi}"][data-pj="${pj}"]`).forEach(el=>el.classList.add('hot'))};
    board.querySelectorAll('.cutlist li[data-pj]').forEach(li=>{
      li.onmouseenter=()=>light(li.dataset.pi,li.dataset.pj);
      li.onmouseleave=clear;
      li.onfocus=()=>light(li.dataset.pi,li.dataset.pj);
      li.onblur=clear;
      li.tabIndex=0;
    });
    board.querySelectorAll('.piecerect').forEach(r=>{
      r.style.cursor='pointer';
      r.onmouseenter=()=>light(r.dataset.pi,r.dataset.pj);
      r.onmouseleave=clear;
      r.onclick=()=>{light(r.dataset.pi,r.dataset.pj);let li=board.querySelector(`.cutlist li[data-pi="${r.dataset.pi}"][data-pj="${r.dataset.pj}"]`);li?.scrollIntoView({behavior:'smooth',block:'nearest'});li?.focus()};
    });
  });
}

/* ---------- Priser (manuelt vedligeholdt øjebliksbillede) ---------- */
const OFFERS=[
  {store:'Silvan',w:1220,h:2440,price:275,stock:'Levering eller Click & Collect',url:'https://www.silvan.dk/produkt/dlh-mdf-plade-19x1220x2440-mm-4220-2052823'},
  {store:'XL-BYG',w:1220,h:2440,price:299,stock:'Levering eller Click & Collect',url:'https://www.xl-byg.dk/produkt/xl-byg-mdf-19-x-1220-x-2440-mm-9253490'},
  {store:'10-4',w:1220,h:2440,price:306,stock:'Mængdepris ved 20+ stk.',url:'https://www.10-4.dk/varer/byggematerialer/byggeplader/mdf-plader/dlh-mdf-e1-plade-2100703'},
  {store:'Davidsen',w:1220,h:2440,price:520.94,stock:'Afhentning i udvalgte butikker',url:'https://www.davidsen.dk/dlh-duratex-mdf-plade-e1-19x1220x2440-mm-c-id525412-p-38102052823'},
  {store:'jem & fix',w:800,h:1200,price:279,stock:'Mindre hobbyplade',url:'https://www.jemogfix.dk/mdf-plade-19-mm-80-x-120-cm/4138/9018806/'},
  {store:'BAUHAUS',w:2070,h:2800,priceM2:259.95,stock:'Pris pr. m² · tilskæres i varehus',url:'https://www.bauhaus.dk/dlh-mdf-plade-19-mm-savvaerk-pris-pr-m'},
  {store:'STARK',w:1220,h:2440,price:562.61,stock:'Lavere medlemspris',url:'https://www.stark.dk/raw-standard-mdf-plade-19-mm-1220-mm-2440-mm?id=4220-9583465'},
  {store:'Bygma',w:1220,h:2440,price:485.07,stock:'Bygmaster-rabat 10 %',url:'https://www.bygma.dk/byggematerialer/byggeplader/mdf-plader/mdf-plader-19mm---122x244cm---klasse-e1100p102414/'},
  {store:'Johannes Fog',w:1220,h:2440,price:651.91,stock:'Lagerstatus på produktsiden',url:'https://www.johannesfog.dk/byggematerialer/byggeplader/traeplader/mdf/19mm-mdf-e05-indvendig-2082687'}
];
function kr(n){return n.toLocaleString('da-DK',{minimumFractionDigits:Math.round(n*100)%100?2:0,maximumFractionDigits:2})+' kr.'}
let lastRetailTotal=null;
function manualSheetPrice(){
  let el=$('#sheetPrice');if(!el)return null;
  let raw=String(el.value||'').trim().replace(/\s/g,'').replace(',','.');
  if(!raw)return null;
  let n=+raw;
  return Number.isFinite(n)&&n>0?n:null;
}
function syncPriceStat(){
  let box=$('#statPriceBox'),stats=document.querySelector('.stats');
  if(!box)return;
  let show=false,label='',value='',title='';
  if(result&&!$('.result').classList.contains('stale')){
    let unit=manualSheetPrice();
    if(unit){show=true;label='Pris i alt';value=kr(unit*result.s.length);title='Din pris pr. plade ganget med antal plader'}
    else if(lastRetailTotal!=null){show=true;label='Pris fra';value=kr(lastRetailTotal);title='Billigste 19 mm MDF i prissammenligningen'}
  }
  box.hidden=!show;box.title=title;
  if(stats)stats.classList.toggle('has-price',show);
  if(show){let lab=$('#statPriceLabel'),val=$('#statPrice');if(lab)lab.textContent=label;if(val)val.textContent=value}
}
function priceRows(){
  lastRetailTotal=null;
  if(!materialOption()||materialOption().dataset.price!=='mdf19')return '<div class="noprice">Prissammenligning findes kun for 19 mm MDF. Skriv en pris pr. plade, hvis totalen skal med i resultatet.</div>';
  let ps=result?result.ps:null,k=+$('#kerf').value||0,t=+$('#trim').value||0,rot=$('#rotate').checked;
  let list=OFFERS.map(o=>{let m2=o.w*o.h/1e6,per=o.price?o.price/m2:o.priceM2,total=null,note=o.price?'pr. plade':'pr. m²',possible=true;
    if(ps&&o.price){try{let qty=pack(ps,o.w,o.h,k,t,rot).length;total=qty*o.price;note=`${qty} ${qty===1?'plade':'plader'} à ${kr(o.price)}`}catch{possible=false;note='Emnerne passer ikke'}}
    else if(ps&&o.priceM2){total=ps.reduce((n,p)=>n+p.w*p.h,0)/1e6*o.priceM2;note='kun emnernes areal · tilskæring kan koste ekstra'}
    return {...o,per,total,note,possible}});
  let best=null;
  if(ps){let c=list.filter(x=>x.price&&x.possible&&x.total!==null);if(c.length)best=c.reduce((a,b)=>b.total<a.total?b:a);list.sort((a,b)=>(b.possible-a.possible)||(!!b.price-!!a.price)||((a.total??1e12)-(b.total??1e12)))}
  else{let c=list.filter(x=>x.price);if(c.length)best=c.reduce((a,b)=>b.per<a.per?b:a);list.sort((a,b)=>a.per-b.per)}
  if(ps&&best&&best.price&&best.total!=null)lastRetailTotal=best.total;
  return list.map(o=>`<a class="pricerow ${o===best?'best':''} ${o.possible?'':'impossible'}" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer"><div class="store">${esc(o.store)}<small>${esc(o.stock)}</small></div><div class="format">${o.w} × ${o.h} mm</div><div class="unitprice">${kr(o.per)}/m²</div><div class="total">${o.total!==null?kr(o.total):o.price?kr(o.price):kr(o.priceM2)+'/m²'}<small>${esc(o.note)}</small></div><div class="arrow">›</div></a>`).join('');
}
function renderPrices(){let list=$('#priceList');if(list)list.innerHTML=priceRows();let sum=$('#priceSummary');if(sum){if(materialOption()?.dataset.price==='mdf19')sum.textContent='9 forhandlere · 19 mm MDF';else sum.textContent='Kun for 19 mm MDF'}syncPriceStat()}

/* ---------- Beregning ---------- */
function render(){
  let btns=['#optimize','#optimizeSticky'].map(id=>$(id)).filter(Boolean);
  if(btns.some(b=>b.disabled&&b.classList.contains('busy')))return;
  let e=$('#error');e.classList.remove('show');e.innerHTML='';hideOkBar();
  btns.forEach(btn=>{btn.classList.add('busy');btn.disabled=true;btn.innerHTML='<span class="calcspin" aria-hidden="true"></span>Beregner…'});
  const finishBusy=()=>{btns.forEach(btn=>{btn.classList.remove('busy');btn.disabled=false});syncCalcLabel()};
  // Yield a frame so the busy state paints before (sync) packing
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
  try{
    let ps=pieces();if(!ps.length)throw Error('Tilføj mindst ét emne med mål.');
    let W=+$('#sheetW').value,H=+$('#sheetH').value,k=+$('#kerf').value,t=+$('#trim').value;
    if(!(W>0&&H>0))throw Error('Pladens bredde og længde skal være større end 0.');
    if(!(k>=0)||!(t>=0))throw Error('Savspor og kantfraskær skal være 0 eller mere.');
    let s=pack(ps,W,H,k,t,$('#rotate').checked),used=ps.reduce((n,a)=>n+a.w*a.h,0),area=W*H*s.length,y=used/area*100,waste=area-used;
    result={s,ps,W,H,y,waste};
    $('.result').classList.remove('stale');syncStaleBar();
    $('#statSheets').textContent=s.length;
    $('#statUsed').textContent=(used/1e6).toFixed(2).replace('.',',')+' m²';
    $('#statWaste').textContent=fmt(waste/area*100)+'%';
    let wa=$('#statWasteArea');if(wa)wa.textContent=(waste/1e6).toFixed(2).replace('.',',')+' m²';
    let mat=materialLabel();
    $('#resultSubtitle').textContent=[($('#projectName').value.trim()||'Skæreseddel'),mat,`${dim(W)} × ${dim(H)} mm`,`savspor ${dim(k)} mm`].filter(Boolean).join(' · ');
    $('#boardCount').textContent=`${s.length} ${s.length===1?'plade':'plader'} · ${ps.length} ${ps.length===1?'emne':'emner'}`;
    $('#boards').innerHTML=s.map((x,i)=>draw(x,i,W,H)).join('');
    bindBoardUI($('#boards'));setExportEnabled(true);syncCalcLabel();renderPrices();store();$('#saveState').textContent='Plan beregnet · kladde gemt';updatePrintHeader();
    dataPartRows().forEach(validatePartRow);
    syncFlow();syncExampleChip();dismissCoach();
    let okMsg=`Plan klar · ${s.length} ${s.length===1?'plade':'plader'} · ${fmt(y)}% udnyttelse`;
    showOkBar(okMsg);toast(okMsg);announce(okMsg);syncBoardJump();syncCalcSub();
    let statsEl=document.querySelector('.stats');if(statsEl){statsEl.classList.remove('flash');void statsEl.offsetWidth;statsEl.classList.add('flash')}
    if(innerWidth<781)$('.result').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(x){if(!(x instanceof Error)||x instanceof TypeError||x instanceof ReferenceError)console.error(x);let msg=x instanceof Error&&!(x instanceof TypeError||x instanceof ReferenceError)?x.message:'Der opstod en uventet fejl. Kontrollér målene og prøv igen.';e.innerHTML=enrichError(msg);e.classList.add('show');bindErrorFixes();dataPartRows().forEach(validatePartRow);focusFirstInvalid();syncFlow();if(result){$('.result').classList.add('stale');$('#boardCount').textContent='Tegningen er ikke opdateret';syncStaleBar();syncCalcLabel();setExportEnabled(false);syncPriceStat()}else{resetStats();$('#boardCount').textContent='Ingen plan endnu';$('#boards').innerHTML=EMPTY_BOARDS;setExportEnabled(false);updatePrintHeader();syncPriceStat()}e.scrollIntoView({behavior:'smooth',block:'nearest'})}
  finally{finishBusy()}
  }));
}
function csvCell(v){v=String(v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function exportCSV(){
  if(!result)return toast('Beregn planen først.');
  let name=$('#projectName').value.trim()||'Skæreseddel';
  let when=new Date().toLocaleString('da-DK',{dateStyle:'medium',timeStyle:'short'});
  let l=[
    ['Felt','Værdi'].map(csvCell).join(';'),
    ['Skæreseddel',name].map(csvCell).join(';'),
    ['Dato',when].map(csvCell).join(';'),
    ['Pladetype',materialLabel()||'Tilpasset mål'].map(csvCell).join(';'),
    ['Plademål',`${dim(result.W)} × ${dim(result.H)} mm`].map(csvCell).join(';'),
    ['Savspor',`${dim(+$('#kerf').value)} mm`].map(csvCell).join(';'),
    ['Kantfraskær',`${dim(+$('#trim').value)} mm`].map(csvCell).join(';'),
    ['Plader',String(result.s.length)].map(csvCell).join(';'),
    ['Emner',String(result.ps.length)].map(csvCell).join(';'),
    ['Brugt areal',`${(result.ps.reduce((n,a)=>n+a.w*a.h,0)/1e6).toFixed(2).replace('.',',')} m²`].map(csvCell).join(';'),
    ['Udnyttelse',`${fmt(result.y)} %`].map(csvCell).join(';'),
    ['Spild',`${fmt(100-result.y)} %`].map(csvCell).join(';'),
    ...(manualSheetPrice()?[['Pris i alt',kr(manualSheetPrice()*result.s.length)].map(csvCell).join(';')]:[]),
    '',
    ['Plade','Emne','Bredde (mm)','Længde (mm)','X (mm)','Y (mm)','Roteret'].map(csvCell).join(';')
  ];
  result.s.forEach((s,i)=>s.pieces.forEach(p=>l.push([i+1,p.name,p.w,p.h,p.x,p.y,p.turn?'Ja':'Nej'].map(v=>csvCell(typeof v==='number'?String(v).replace('.',','):v)).join(';'))));
  let url=URL.createObjectURL(new Blob(['﻿'+l.join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a'),n=(name).replace(/[^\wæøåÆØÅ -]+/g,'').trim()||'skaereseddel';
  a.href=url;a.download=n+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('CSV hentet · '+result.ps.length+' emner');
}

/* ---------- Skæresedler ---------- */
function cloudBridge(){return window.__pladeplanCloud||null}
function cloudOn(){let b=cloudBridge();return !!(b&&b.signedIn&&b.ready&&!b.degraded)}
function library(){
  if(cloudOn())return Array.isArray(cloudBridge().cache)?cloudBridge().cache:[];
  try{let x=JSON.parse(localStorage.getItem('pladeplan-projects'));return Array.isArray(x)?x:[]}catch{return[]}
}
function saveLibrary(){
  let name=$('#projectName').value.trim();
  if(!name||name===DEFAULT_NAME||name==='Nyt skæreprojekt'||name==='Nyt projekt'){name='Skæreseddel '+new Date().toLocaleDateString('da-DK');$('#projectName').value=name}
  let id=activeProjectId||('p-'+Date.now()),item={...state(),id,n:name,updatedAt:new Date().toISOString()},all=library().filter(x=>x.id!==id);all.unshift(item);
  if(!persistLibrary(all))return;
  activeProjectId=id;store();
  $('#saveState').textContent=cloudOn()?'Skæreseddel gemt på din konto':'Skæreseddel gemt';
  toast(cloudOn()?'Skæresedlen er gemt på din konto.':'Skæresedlen er gemt på denne enhed.');
}
function persistLibrary(all){
  let b=cloudBridge();
  if(b&&b.signedIn&&!b.degraded){
    if(!b.ready){toast('Dine skæresedler hentes stadig. Prøv igen om et øjeblik.');return false}
    b.cache=all.slice();
    if(typeof b.push==='function')b.push(all);
    return true;
  }
  try{localStorage.setItem('pladeplan-projects',JSON.stringify(all));return true}catch{toast('Kunne ikke gemme biblioteket.');return false}
}
function authAvailable(){let b=cloudBridge();return !!(b&&b.authAvailable)}
function storageDegraded(){let b=cloudBridge();return !!(b&&b.signedIn&&b.degraded)}
function syncLibraryChrome(){
  let intro=document.querySelector('.libraryintro');
  if(intro)intro.textContent=cloudOn()
    ?'Skæresedlerne gemmes på din konto og kan åbnes, når du er logget ind på en anden enhed. «Del» sender stadig et link.'
    :storageDegraded()
      ?'Du er logget ind, men konto-lagring er ikke sat op endnu. Skæresedlerne gemmes på denne enhed, indtil databasen er konfigureret.'
      :authAvailable()
        ?'Skæresedlerne gemmes kun på denne enhed. Log ind for at gemme dem på din konto. Brug «Del» for at sende et link til andre.'
        :'Skæresedlerne gemmes kun på denne enhed. Brug «Del» for at sende et link til andre — uden konto eller server.';
  let privacy=$('.privacy');
  if(privacy)privacy.textContent=cloudOn()?'Kladde lokalt · gemte skæresedler på din konto':storageDegraded()?'Kladde lokalt · konto-lagring ikke sat op':'Gemmes lokalt · del via link';
}
function deleteCurrentPlan(){
  let name=$('#projectName').value.trim()||'skæreseddel';
  if(activeProjectId){
    let x=library().find(p=>p.id===activeProjectId);
    if(!x||!confirm(cloudOn()?`Slet den gemte skæreseddel “${x.n||name}” fra din konto?`:`Slet den gemte skæreseddel “${x.n||name}” fra denne enhed?`))return;
    let all=library(),idx=all.findIndex(p=>p.id===x.id),next=all.filter(p=>p.id!==x.id);
    if(!persistLibrary(next))return;
    activeProjectId=null;
    applyState({});$('#saveState').textContent='Skæreseddel slettet';
    toast('Skæresedlen er slettet',()=>{let cur=library();cur.splice(Math.min(idx,cur.length),0,x);persistLibrary(cur);applyState(x);$('#saveState').textContent='Skæreseddel gendannet';toast('Skæresedlen er gendannet')});
    return;
  }
  if(!confirm(`Slet den aktuelle skæreseddel “${name}”? Emner og indstillinger nulstilles.`))return;
  let snap=state();
  applyState({});$('#saveState').textContent='Skæreseddel slettet';
  toast('Skæresedlen er slettet',()=>{applyState(snap);$('#saveState').textContent='Skæreseddel gendannet';toast('Skæresedlen er gendannet')});
}
function duplicateProject(id){
  let x=library().find(p=>p.id===id);if(!x)return;
  let copy={...x,id:'p-'+Date.now(),n:(x.n||'Skæreseddel')+' (kopi)',updatedAt:new Date().toISOString()};
  let all=library();all.unshift(copy);if(!persistLibrary(all))return;
  renderLibrary();toast('Kopi oprettet: “'+copy.n+'”');
}
function renameProject(id,h3){
  let all=library(),x=all.find(p=>p.id===id);if(!x||!h3)return;
  let inp=document.createElement('input');inp.type='text';inp.className='renameinput';inp.value=x.n||'';inp.setAttribute('aria-label','Nyt navn på skæreseddel');inp.maxLength=80;
  h3.replaceWith(inp);inp.focus();inp.select();
  let done=false;
  const commit=()=>{if(done)return;done=true;let name=inp.value.trim()||x.n||'Skæreseddel';x.n=name;x.updatedAt=new Date().toISOString();persistLibrary(all);if(activeProjectId===id)$('#projectName').value=name;renderLibrary();toast('Skæreseddel omdøbt')};
  const cancel=()=>{if(done)return;done=true;renderLibrary()};
  inp.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();commit()}else if(ev.key==='Escape'){ev.preventDefault();cancel()}};
  inp.onblur=()=>commit();
}
function renderLibrary(){
  let all=library(),el=$('#projectList');
  syncLibraryChrome();
  if(!all.length){el.innerHTML=cloudOn()
    ?'<div class="projectempty"><div class="emptyicon">▣</div><strong>Ingen gemte skæresedler endnu</strong>Tryk «Gem» for at gemme den aktuelle skæreseddel på din konto.</div>'
    :'<div class="projectempty"><div class="emptyicon">▣</div><strong>Ingen gemte skæresedler endnu</strong>'+(storageDegraded()?'Tryk «Gem» for at gemme den aktuelle skæreseddel på denne enhed. Konto-lagring er ikke sat op endnu.':authAvailable()?'Tryk «Gem» for at gemme den aktuelle skæreseddel på denne enhed. Log ind for at gemme den på din konto. Brug «Del» for at sende et link til andre.':'Tryk «Gem» for at gemme den aktuelle skæreseddel på denne enhed. Brug «Del» for at sende et link til andre.')+'</div>';return}
  el.innerHTML=all.map(x=>{let qty=(x.p||[]).reduce((n,r)=>n+(+r[3]||0),0),dt=new Date(x.updatedAt),d=isNaN(dt)?'':' · gemt '+dt.toLocaleString('da-DK',{dateStyle:'medium',timeStyle:'short'});
    let opt=x.mid?[...$('#material').options].find(o=>o.value===x.mid):null,mat=opt?materialLabel(opt):'';
    return `<div class="projectitem" data-id="${esc(x.id)}"><div><h3 title="Dobbeltklik for at omdøbe">${esc(x.n||'Skæreseddel')}</h3><p>${qty} emner${mat?` · ${esc(mat)}`:''} · ${esc(x.w)} × ${esc(x.h)} mm${d}</p></div><div class="actions"><button class="btn small openproject" type="button" data-id="${esc(x.id)}">Åbn</button><button class="btn small dupproject" type="button" data-id="${esc(x.id)}" aria-label="Duplikér ${esc(x.n||'skæreseddel')}">Duplikér</button><button class="btn small renproject" type="button" data-id="${esc(x.id)}" aria-label="Omdøb ${esc(x.n||'skæreseddel')}">Omdøb</button><button class="btn small delproject" type="button" data-id="${esc(x.id)}" aria-label="Slet ${esc(x.n||'skæreseddel')}">Slet</button></div></div>`}).join('');
  el.querySelectorAll('.openproject').forEach(b=>b.onclick=()=>{let x=library().find(p=>p.id===b.dataset.id);if(x){applyState(x);$('#saveState').textContent='Skæreseddel åbnet';projectsDialog.close();toast('Skæresedlen er åbnet.')}});
  el.querySelectorAll('.dupproject').forEach(b=>b.onclick=()=>duplicateProject(b.dataset.id));
  el.querySelectorAll('.renproject').forEach(b=>b.onclick=()=>{let item=b.closest('.projectitem');renameProject(b.dataset.id,item&&item.querySelector('h3'))});
  el.querySelectorAll('.projectitem h3').forEach(h=>h.ondblclick=()=>{let item=h.closest('.projectitem');renameProject(item.dataset.id,h)});
  el.querySelectorAll('.delproject').forEach(b=>b.onclick=()=>{let x=library().find(p=>p.id===b.dataset.id);if(!x||!confirm(`Slet “${x.n||'skæreseddel'}”?`))return;let all=library(),idx=all.findIndex(p=>p.id===x.id),next=all.filter(p=>p.id!==x.id);if(!persistLibrary(next))return;if(activeProjectId===x.id){activeProjectId=null;store()}renderLibrary();toast('Skæresedlen er slettet',()=>{let cur=library();cur.splice(Math.min(idx,cur.length),0,x);persistLibrary(cur);renderLibrary();toast('Skæresedlen er gendannet')})});
}

/* ---------- Del / share (komprimeret URL, uden backend) ---------- */
function sharePayload(){
  let s=state();
  return{n:s.n,m:s.m,mid:s.mid||'',w:s.w,h:s.h,k:s.k,t:s.t,r:!!s.r,pr:s.pr||'',p:(s.p||[]).map(r=>[String(r[0]||'').slice(0,80),+r[1]||r[1],+r[2]||r[2],+r[3]||1])};
}
function bytesToB64url(bytes){
  let bin='',chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode(...bytes.subarray(i,i+chunk));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlToBytes(str){
  let s=str.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  let bin=atob(s),out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
async function encodeShare(obj){
  let json=JSON.stringify(obj),enc=new TextEncoder().encode(json);
  if(typeof CompressionStream!=='undefined'){
    try{
      let stream=new Blob([enc]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      let buf=new Uint8Array(await new Response(stream).arrayBuffer());
      return 'd'+bytesToB64url(buf);
    }catch{}
  }
  return 'u'+bytesToB64url(enc);
}
async function decodeShare(token){
  if(!token||token.length<2)throw Error('Tomt link');
  let kind=token[0],data=token.slice(1),bytes=b64urlToBytes(data),json;
  if(kind==='d'){
    if(typeof DecompressionStream==='undefined')throw Error('Browseren kan ikke åbne komprimerede links');
    let stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    json=await new Response(stream).text();
  }else if(kind==='u'){json=new TextDecoder().decode(bytes)}
  else throw Error('Ukendt linkformat');
  let obj=JSON.parse(json);
  if(!obj||typeof obj!=='object'||!Array.isArray(obj.p))throw Error('Ugyldigt linkindhold');
  return obj;
}
function shareBaseUrl(){
  let u=new URL(location.href);
  u.hash='';u.search='';
  return u.origin+u.pathname;
}
async function buildShareUrl(){
  let token=await encodeShare(sharePayload());
  return shareBaseUrl().replace(/#.*$/,'')+'#p='+token;
}
let lastShareUrl='';
async function openShareDialog(){
  let dlg=$('#shareDialog');if(!dlg)return;
  let url='',meta=$('#shareMeta'),ta=$('#shareUrl');
  try{
    url=await buildShareUrl();lastShareUrl=url;
    if(ta){ta.value=url}
    let len=url.length,parts=(sharePayload().p||[]).length;
    if(meta)meta.textContent=`${parts} emnetyper · link ${len.toLocaleString('da-DK')} tegn`+(len>3500?' · langt link — overvej JSON/udskrift ved meget store lister':'');
  }catch(e){
    if(ta)ta.value='';
    if(meta)meta.textContent='Kunne ikke bygge link.';
    toast('Kunne ikke oprette dellink.');
    return;
  }
  let ns=$('#nativeShare');if(ns)ns.hidden=!(navigator.share);
  dlg.showModal();$('#copyShareLink')?.focus();
}
function copyShareLink(){
  let url=($('#shareUrl')?.value||lastShareUrl||'').trim();
  if(!url)return toast('Intet link at kopiere.');
  copyText(url,()=>toast('Link kopieret — klar til at sende.'));
}
async function nativeSharePlan(){
  let url=($('#shareUrl')?.value||lastShareUrl||'').trim();
  if(!url)return toast('Intet link at dele.');
  let name=$('#projectName').value.trim()||'Skæreseddel';
  if(!navigator.share)return copyShareLink();
  try{await navigator.share({title:name+' — Pladeplan',text:'Skæreseddel fra Pladeplan',url});toast('Delt.')}catch(e){if(e&&e.name==='AbortError')return;copyShareLink()}
}
function exportShareJson(){
  let data=sharePayload(),name=($('#projectName').value.trim()||'skaereseddel').replace(/[^\wæøåÆØÅ\- ]+/gi,'').trim().replace(/\s+/g,'-')||'skaereseddel';
  let blob=new Blob([JSON.stringify({v:1,app:'pladeplan',...data},null,2)],{type:'application/json'});
  let a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name+'.pladeplan.json';a.click();URL.revokeObjectURL(a.href);
  toast('JSON-fil hentet.');
}
async function tryLoadShared(){
  let token='';
  try{
    let h=location.hash||'';
    if(h.startsWith('#p='))token=decodeURIComponent(h.slice(3));
    else{
      let q=new URLSearchParams(location.search).get('p');
      if(q)token=q;
    }
  }catch{return false}
  if(!token)return false;
  try{
    let obj=await decodeShare(token);
    applyState({...obj,id:null});
    $('#saveState').textContent='Delt skæreseddel åbnet';
    toast('Delt skæreseddel er indlæst. Gem den lokalt hvis du vil beholde den.');
    // Keep hash so the link stays bookmarkable; strip query ?p= if used
    if(location.search.includes('p=')){
      let u=new URL(location.href);u.searchParams.delete('p');
      history.replaceState(null,'',u.pathname+u.search+(location.hash||''));
    }
    return true;
  }catch(e){
    console.warn(e);
    toast('Dellinket kunne ikke åbnes. Tjek at det er komplet.');
    return false;
  }
}

/* ---------- Smart import (lokal tekstfortolker; bruger /api/ai-import hvis den findes) ---------- */
const NUMW={en:1,et:1,'ét':1,to:2,tre:3,fire:4,fem:5,seks:6,syv:7,otte:8,ni:9,ti:10,elleve:11,tolv:12};
const QW='(\\d+|en|et|ét|to|tre|fire|fem|seks|syv|otte|ni|ti|elleve|tolv)';
const LEAD=new Set(['jeg','vi','skal','bruge','have','der','er','så','også','og','plus','samt','+','-','–']);
const TRAIL=new Set(['på','af','med','til','i','á','à','a','og','mål','størrelse','-','–']);
const UNIT=u=>({cm:10,m:1000}[(u||'').toLowerCase()]||1);
function smart(text){
  let t=text.replace(/(\d),(\d)/g,'$1.$2').replace(/\bstk\./gi,'stk').replace(/\bca\./gi,'ca');
  const dimRe=/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?(?:\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?)?(?!\d|\.\d)/gi;
  let ms=[...t.matchAll(dimRe)],out=[],last=0;
  ms.forEach((m,i)=>{
    if(m.index<last)return;
    let a=+m[1],b=+m[3],c=m[5]!==undefined?+m[5]:null,u=UNIT(m[6]||m[4]||m[2]),q=null,w,h;
    if(c!==null&&Number.isInteger(a)&&a<=50&&c>50){q=a;w=b*u;h=c*u}else{w=a*u;h=b*u}
    let clause=t.slice(last,m.index).split(/[\n;•]|[.,!?](?=\s|$)|\s+og\s+|\s+samt\s+/i).pop()||'';
    let end=m.index+m[0].length,next=i+1<ms.length?ms[i+1].index:t.length,after=t.slice(end,next),am=after.match(/^\s*[,:(–-]?\s*(\d+)\s*(?:stk|stykker|styk|pcs)\b\)?/i);
    if(am){if(q===null)q=+am[1];end+=am[0].length}
    last=end;
    let qm=clause.match(/(\d+)\s*(?:stk|stykker|styk|x|×)(?=\s|$|:)/i)||clause.match(new RegExp('(?:^|[\\s(:])'+QW+'(?=[\\s):]|$)','i'));
    if(qm){if(q===null)q=NUMW[qm[1].toLowerCase()]||+qm[1];clause=clause.slice(0,qm.index)+' '+clause.slice(qm.index+qm[0].length)}
    let words=clause.replace(/[():"“”]/g,' ').split(/\s+/).filter(Boolean);
    while(words.length&&LEAD.has(words[0].toLowerCase()))words.shift();
    while(words.length&&TRAIL.has(words[words.length-1].toLowerCase()))words.pop();
    let name=words.join(' ').replace(/^[\s,.:-]+|[\s,.:-]+$/g,'').slice(0,60)||'Emne';
    name=name[0].toUpperCase()+name.slice(1);
    w=Math.round(w*10)/10;h=Math.round(h*10)/10;q=Math.max(1,Math.min(999,Math.round(q||1)));
    if(w>0&&h>0)out.push({name,w,h,q});
  });
  return out;
}
function cleanParts(list){return (Array.isArray(list)?list:[]).map(p=>({name:String(p?.name??'Emne').trim().slice(0,80)||'Emne',w:+p?.w,h:+p?.h,q:Math.round(+(p?.q??p?.qty??1))})).filter(p=>p.w>0&&p.h>0&&p.q>=1&&p.q<=999)}
async function analyze(){
  let text=$('#aiText').value.trim();if(!text)return toast('Indsæt tekst med mål først.');
  $('#aiReview').classList.remove('show');$('#aiStatus').classList.add('show');$('#analyzeAI').disabled=true;
  let data=null,fromApi=false;
  if(location.protocol.startsWith('http')){try{let ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),15000),r=await fetch('/api/ai-import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text}),signal:ctl.signal});clearTimeout(tm);if(r.ok&&r.headers.get('content-type')?.includes('json')){let j=await r.json();if(Array.isArray(j?.parts)){data=cleanParts(j.parts);fromApi=!!data.length}}}catch{}}
  if(!data||!data.length){data=cleanParts(smart(text));fromApi=false}
  $('#aiStatus').classList.remove('show');$('#analyzeAI').disabled=false;
  if(!data.length)return toast('Ingen tydelige mål fundet. Prøv fx “2 sider 580 x 720 mm”.');
  draft=data;
  let pcs=data.reduce((n,p)=>n+p.q,0);
  $('#aiReviewTitle').textContent=`${data.length} ${data.length===1?'emnetype':'emnetyper'} fundet — kontrollér målene`;
  $('#aiImportMeta').textContent=`${pcs} stk. i alt · ${fromApi?'fortolket via import-tjeneste':'fortolket lokalt i browseren'} · Intet er tilføjet endnu`;
  $('#aiReviewList').innerHTML=data.map(p=>`<div class="reviewrow"><span>${esc(p.name)}</span><span>${fmt(p.w)} × ${fmt(p.h)} mm · ${p.q} stk.</span></div>`).join('');
  $('#aiReview').classList.add('show');
}
function applyDraft(replace){
  if(!draft.length)return;
  if(replace&&dataPartRows().length&&!confirm('Erstat den nuværende emneliste med de importerede emner?'))return;
  if(replace)P.innerHTML='';
  else dataPartRows().forEach(r=>{let v=[...r.querySelectorAll('input')].map(x=>x.value.trim());if(!v[1]&&!v[2])r.remove()});
  draft.forEach(p=>add([p.name,p.w,p.h,p.q],false));change();dlg.close();
  toast(`${draft.length} ${draft.length===1?'emnetype':'emnetyper'} ${replace?'indsat':'tilføjet'}. Kontrollér målene.`);
}

/* ---------- Opstart og hændelser ---------- */
(async()=>{if(!(await tryLoadShared())&&!load()){let id=loadMaterialPrefId();if(id&&selectMaterialById(id)){let o=materialOption();if(o&&o.dataset.w){$('#sheetW').value=o.dataset.w;$('#sheetH').value=o.dataset.h}}let saw=loadSawPref();if(saw){if(saw.k!=null)$('#kerf').value=saw.k;if(saw.t!=null)$('#trim').value=saw.t;if(typeof saw.r==='boolean')$('#rotate').checked=saw.r}DEFAULT_PARTS.forEach(r=>add(r,false));count();syncCustomHint();syncUsable()}syncFlow();syncExampleChip();syncCalcSub();syncClearParts()})()
renderPrices();
$('#addPart').onclick=()=>{add();P.lastElementChild.querySelector('input').select()};
$('#clearParts').onclick=()=>{if(!dataPartRows().length)return;if(!confirm('Ryd hele emnelisten?'))return;let snap=rows();P.innerHTML='';ensurePartsEmpty();change();toast('Emnelisten er ryddet',()=>{P.innerHTML='';snap.forEach(r=>add(r,false));change();toast('Emnelisten er gendannet')})};
['sheetW','sheetH','projectName'].forEach(id=>$('#'+id).oninput=change);
['kerf','trim'].forEach(id=>$('#'+id).oninput=()=>{saveSawPref();change()});
$('#rotate').onchange=()=>{saveSawPref();change()};
$('#material').onchange=e=>{let o=e.target.selectedOptions[0];saveMaterialPref(o.value);if(o.dataset.w){$('#sheetW').value=o.dataset.w;$('#sheetH').value=o.dataset.h}else{$('#sheetW').focus();$('#sheetW').select()}syncCustomHint();change();renderPrices()};
let priceInput=$('#sheetPrice');if(priceInput)priceInput.oninput=()=>{store();$('#saveState').textContent='Kladde gemt lokalt';syncPriceStat();if(result)updatePrintHeader()};
$('#optimize').onclick=render;
let restale=$('#restaleOptimize');if(restale)restale.onclick=render;
$('#print').onclick=()=>{if(!result||$('.result').classList.contains('stale'))return toast('Beregn planen først.');print()};
$('#csv').onclick=()=>{if(!result||$('.result').classList.contains('stale'))return toast('Beregn planen først.');exportCSV()};
let copyBtn=$('#copyCut');if(copyBtn)copyBtn.onclick=()=>copyCutlist();
let swapBtn=$('#swapSheet');if(swapBtn)swapBtn.onclick=()=>{let w=$('#sheetW').value,h=$('#sheetH').value;$('#sheetW').value=h;$('#sheetH').value=w;change();toast('Bredde og længde byttet')};
document.addEventListener('keydown',ev=>{if(ev.key!=='Enter')return;let t=ev.target;if(!t)return;if((ev.ctrlKey||ev.metaKey)&&t.id!=='aiText'){ev.preventDefault();if(!document.querySelector('dialog[open]'))render();return}if(ev.shiftKey||ev.ctrlKey||ev.metaKey||ev.altKey)return;if(t.id==='aiText'||t.tagName==='TEXTAREA')return;if(t.closest&&t.closest('dialog[open]'))return;if(t.matches&&(t.matches('#parts input')||t.matches('#sheetW,#sheetH,#kerf,#trim,#sheetPrice,#projectName'))){ev.preventDefault();render()}});
ensurePartsEmpty();setExportEnabled(false);syncCalcLabel();syncCustomHint();syncClearParts();syncMoveButtons();syncUsable();updatePrintHeader();maybeShowCoach();syncFlow();syncExampleChip();syncCalcSub();syncBoardJump();document.body.classList.add('has-stickycalc');
let coachBtn=$('#coachDismiss');if(coachBtn)coachBtn.onclick=dismissCoach;
function closeMenus(e){document.querySelectorAll('.moremenu[open],.exportmenu[open]').forEach(d=>{if(e&&d.contains(e.target))return;d.open=false})}
document.addEventListener('click',e=>{if(!e.target.closest('.moremenu,.exportmenu'))closeMenus()});
['projectsBtn','sharePlan','newProject','deleteProject','copyCut','csv','print','sharePlanResult'].forEach(id=>{let el=$('#'+id);if(!el)return;el.addEventListener('click',()=>setTimeout(closeMenus,0))});

let exBtn=$('#dismissExample');if(exBtn)exBtn.onclick=()=>{try{localStorage.setItem('pladeplan-example-tip','1')}catch{}syncExampleChip()};
let sticky=$('#optimizeSticky');if(sticky)sticky.onclick=render;

const projectsDialog=$('#projectsDialog'),dlg=$('#aiDialog'),shareDialog=$('#shareDialog');
[projectsDialog,dlg,shareDialog].forEach(d=>d&&d.addEventListener('click',e=>{if(e.target===d)d.close()}));
[['#flow1','#sheetCard'],['#flow2','#partsCard'],['#flow3','#optimize']].forEach(([id,target])=>{let b=$(id);if(!b)return;b.onclick=()=>{let el=$(target);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});if(target==='#optimize')el.focus();else{let focus=el.querySelector('select,input,button');if(focus)focus.focus()}}});
$('#saveProject').onclick=saveLibrary;
$('#projectsBtn').onclick=()=>{renderLibrary();projectsDialog.showModal();$('#closeProjects').focus()};
$('#closeProjects').onclick=()=>projectsDialog.close();
$('#deleteProject').onclick=deleteCurrentPlan;
$('#sharePlan').onclick=()=>openShareDialog();
let shareRes=$('#sharePlanResult');if(shareRes)shareRes.onclick=()=>openShareDialog();
$('#closeShare').onclick=()=>shareDialog&&shareDialog.close();
$('#copyShareLink').onclick=copyShareLink;
$('#nativeShare').onclick=()=>nativeSharePlan();
$('#exportShareJson').onclick=exportShareJson;
$('#printFromShare').onclick=()=>{if(shareDialog)shareDialog.close();if(!result||$('.result').classList.contains('stale')){toast('Beregn planen først — derefter kan du udskrive som PDF.');return}print()};
$('#newProject').onclick=()=>{if(!confirm('Vil du starte en ny skæreseddel? Ikke-gemte ændringer går tabt.'))return;applyState({});$('#saveState').textContent='Ny skæreseddel';$('#projectName').focus()};
$('#openAI').onclick=()=>{dlg.showModal();$('#aiText').focus()};
$('#closeAI').onclick=()=>dlg.close();
$('#retryAI').onclick=()=>{$('#aiReview').classList.remove('show');$('#aiText').focus()};
$('#analyzeAI').onclick=analyze;
$('#applyAI').onclick=()=>applyDraft(false);
$('#replaceAI').onclick=()=>applyDraft(true);
/* ---------- Konto / skysynk ---------- */
function localLibraryRaw(){try{let x=JSON.parse(localStorage.getItem('pladeplan-projects'));return Array.isArray(x)?x:[]}catch{return[]}}
function showMigrateBar(extra){
  let bar=$('#migrateBar');if(!bar||!extra.length)return;
  if(sessionStorage.getItem('pladeplan-migrate-asked')==='1')return;
  sessionStorage.setItem('pladeplan-migrate-asked','1');
  bar.hidden=false;
  bar.innerHTML='<span>'+extra.length+' skæreseddel'+(extra.length===1?'':'er')+' på denne enhed kan flyttes til din konto.</span><button type="button" class="btn small yellow" id="migrateYes">Flyt til konto</button><button type="button" class="btn small" id="migrateNo">Ikke nu</button>';
  $('#migrateNo').onclick=()=>{bar.hidden=true};
  $('#migrateYes').onclick=()=>{
    let b=cloudBridge();if(!b)return;
    let ids=new Set((b.cache||[]).map(p=>p.id));
    let add=extra.filter(p=>p&&p.id&&!ids.has(p.id));
    let merged=add.concat(b.cache||[]);
    if(!persistLibrary(merged))return;
    bar.hidden=true;
    toast(add.length===1?'1 skæreseddel er flyttet til din konto.':add.length+' skæresedler er flyttet til din konto.');
    if($('#projectsDialog')&&$('#projectsDialog').open)renderLibrary();
  };
}
function installPush(){
  let b=cloudBridge();if(!b||typeof b.push==='function')return;
  let timer;
  b.push=function(all){
    clearTimeout(timer);
    let snapshot=all.map(x=>({...x,p:Array.isArray(x.p)?x.p.slice():[]}));
    timer=setTimeout(async()=>{
      try{
        let r=await fetch('/api/projects',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({projects:snapshot})});
        if(r.status===503||r.status===401){
          b.degraded=true;b.ready=false;
          try{localStorage.setItem('pladeplan-projects',JSON.stringify(snapshot))}catch{}
          syncLibraryChrome();
          toast(r.status===401?'Log ind igen for at gemme på din konto. Skæresedlen er gemt på denne enhed.':'Konto-lagring er ikke sat op endnu. Skæresedlen er gemt på denne enhed.');
          return;
        }
        if(!r.ok)throw Error('save');
      }catch{toast('Kunne ikke gemme skæresedlen på kontoen. Prøv igen.');}
    },250);
  };
}
window.__pladeplanOnAuth=async function(){
  installPush();
  let b=cloudBridge();
  if(!b||!b.signedIn){if(b){b.ready=false;b.degraded=false}syncLibraryChrome();let bar=$('#migrateBar');if(bar)bar.hidden=true;return}
  b.ready=false;
  try{
    let r=await fetch('/api/projects',{headers:{accept:'application/json'}});
    if(r.status===503){
      b.degraded=true;b.ready=false;syncLibraryChrome();
      if(!b.warned){b.warned=true;toast('Konto-lagring er ikke sat op endnu. Skæresedler gemmes på denne enhed.')}
      return;
    }
    if(!r.ok)throw Error('sync');
    let j=await r.json();
    b.cache=Array.isArray(j.projects)?j.projects:[];
    b.degraded=false;
    b.ready=true;
    syncLibraryChrome();
    let ids=new Set(b.cache.map(p=>p.id));
    let extra=localLibraryRaw().filter(p=>p&&p.id&&!ids.has(p.id));
    showMigrateBar(extra);
    if($('#projectsDialog')&&$('#projectsDialog').open)renderLibrary();
  }catch{
    b.ready=false;
    b.degraded=true;
    syncLibraryChrome();
    if(!b.warned){b.warned=true;toast('Kunne ikke hente skæresedler fra kontoen. De gemmes lokalt på denne enhed.')}
  }
};
syncLibraryChrome();
