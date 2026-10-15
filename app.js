(function(){
'use strict';
var CODE='FIAMME2026';
var DIST=[['Serie',9],['Logica',8],['Ragionamento verbale',5],['Matematica',10],['Geometria',3],['Italiano',25],['Storia',10],['Educazione civica',10],['Geografia',10]];
var ORDER=DIST.map(function(d){return d[0]}).concat(['Bando e selezione']);
var app=document.getElementById('app'), homeBtn=document.getElementById('homeBtn');
var Q=null, S=null, tick=null;

/* ---------- storage sicuro ---------- */
function get(k,d){try{var v=localStorage.getItem('af26_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function put(k,v){try{localStorage.setItem('af26_'+k,JSON.stringify(v))}catch(e){}}

/* ---------- utilità ---------- */
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function fmt(s){s=Math.max(0,s);var m=Math.floor(s/60),x=s%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x}
function stem(t){
  var lines=String(t).split('\n'),out=[],tab=[];
  function flush(){if(tab.length){out.push('<table>'+tab.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+esc(c)+'</td>'}).join('')+'</tr>'}).join('')+'</table>');tab=[]}}
  lines.forEach(function(l){
    if(/^\s*\|/.test(l)){ if(/^\s*\|[\s|:-]+\|\s*$/.test(l)) return; tab.push(l.trim().replace(/^\||\|$/g,'').split('|').map(function(c){return c.trim()})); }
    else {flush(); out.push(esc(l));}
  });
  flush(); return out.join('\n');
}
function decode(){
  var b=atob(window.QDATA), k=CODE, u=new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i)^k.charCodeAt(i%k.length);
  return JSON.parse(new TextDecoder('utf-8').decode(u));
}
function lbl(s){return s==='Serie'?'Serie numeriche e alfanumeriche':s}
function bySubj(s){return Q.filter(function(q){return q.s===s})}
function prep(q){ // rimescola le risposte
  var idx=[0,1,2,3]; if(!q.fix) idx=shuffle(idx);
  return {id:q.id,q:q,o:idx.map(function(i){return q.o[i]}),c:idx.indexOf(q.c),a:-1};
}

/* ---------- accesso ---------- */
function gate(){
  homeBtn.classList.add('hidden');
  app.innerHTML='<div class="gate card"><h1>Accesso al simulatore</h1><p class="lead">Inserisci il codice di accesso che trovi nel libro, nella pagina «Il simulatore online».</p>'+
  '<input id="code" class="code" type="text" autocomplete="off" autocapitalize="characters" placeholder="CODICE" aria-label="Codice di accesso">'+
  '<div class="err" id="err"></div><button class="btn red" id="go" type="button" style="width:100%;margin-top:6px">Entra</button></div>';
  var inp=document.getElementById('code');
  function tryGo(){
    if(inp.value.trim().toUpperCase().replace(/\s/g,'')===CODE){put('ok',true);start();}
    else document.getElementById('err').textContent='Codice non corretto. Controlla la pagina del libro e riprova.';
  }
  document.getElementById('go').onclick=tryGo;
  inp.onkeydown=function(e){if(e.key==='Enter')tryGo()};
  inp.focus();
}
function start(){ try{Q=decode()}catch(e){app.innerHTML='<div class="card">Errore nel caricamento delle domande. Ricarica la pagina.</div>';return} home(); }

/* ---------- menu ---------- */
function home(){
  stopTimer(); S=null; homeBtn.classList.add('hidden'); window.scrollTo(0,0);
  var errs=get('errors',[]), hist=get('hist',[]);
  var subs=ORDER.filter(function(s){return bySubj(s).length});
  var h='<h1>Allenati come il giorno della prova</h1><p class="lead">'+Q.length+' domande con spiegazione. Ogni risposta esatta vale 1, errori e risposte vuote valgono 0: il punteggio viene anche convertito in sessantesimi, come nel concorso.</p>';
  h+='<h2>Simulazione completa · 90 domande in 100 minuti</h2>';
  h+='<p class="meta" style="margin:-4px 0 12px">Come nella preselezione dell\'edizione 2025: 90 quesiti (35 di logica e matematica, 25 di italiano, 10 di storia, 10 di educazione civica, 10 di geografia) in 100 minuti. Nessuna penalità per gli errori: rispondi sempre.</p><div class="grid2">';
  h+='<button class="tile red" data-sim="0" type="button"><b>Simulazione casuale</b><span>90 domande pescate da tutto l\'archivio con la ripartizione del bando, ogni volta diverse</span></button>';
  [1,2,3].forEach(function(n){h+='<button class="tile" data-sim="'+n+'" type="button"><b>Simulazione '+n+' del libro</b><span>Le stesse domande del capitolo 15, in ordine e risposte rimescolati</span></button>'});
  h+='</div>';
  h+='<h2>Allenamento per materia</h2><div class="card"><label class="f" for="subj">Materia</label><select id="subj">'+
    subs.map(function(s){return '<option value="'+esc(s)+'">'+esc(lbl(s))+'</option>'}).join('')+'</select>'+
    '<label class="f">Numero di domande</label><div class="chips" id="num">'+[10,20,30,0].map(function(n,i){return '<button type="button" class="chip'+(i===1?' on':'')+'" data-n="'+n+'">'+(n||'Tutte')+'</button>'}).join('')+'</div>'+
    '<p class="meta" style="margin:10px 0">Vedi subito se la risposta è giusta, con la spiegazione.</p><button class="btn" id="train" type="button">Inizia</button></div>';
  h+='<h2>Ripasso degli errori</h2><div class="card"><p class="meta" style="margin-top:0">'+(errs.length?'Hai <b>'+errs.length+'</b> domande sbagliate da ripassare. Quando rispondi bene, escono dalla lista.':'Nessun errore da ripassare. Le domande che sbagli finiscono qui in automatico.')+'</p><button class="btn red" id="rev" type="button"'+(errs.length?'':' disabled')+'>Ripassa gli errori</button></div>';
  if(hist.length){
    h+='<h2>I tuoi ultimi risultati</h2><div class="card"><ul class="hist">'+hist.slice(0,8).map(function(r){return '<li><b>'+r.score+'/'+r.tot+'</b> · '+esc(r.title)+' · <span class="meta">'+esc(r.date)+'</span></li>'}).join('')+'</ul></div>';
  }
  app.innerHTML=h;
  app.querySelectorAll('[data-sim]').forEach(function(b){b.onclick=function(){simulation(+b.getAttribute('data-sim'))}});
  var n=20; app.querySelectorAll('#num .chip').forEach(function(c){c.onclick=function(){app.querySelectorAll('#num .chip').forEach(function(x){x.classList.remove('on')});c.classList.add('on');n=+c.getAttribute('data-n')}});
  document.getElementById('train').onclick=function(){var s=document.getElementById('subj').value;var pool=shuffle(bySubj(s));training(s,n?pool.slice(0,n):pool)};
  document.getElementById('rev').onclick=function(){var ids=get('errors',[]);var pool=shuffle(Q.filter(function(q){return ids.indexOf(q.id)>=0}));training('Ripasso errori',pool,true)};
}

/* ---------- sessioni ---------- */
function simulation(n){
  var list;
  if(n){ list=Q.filter(function(q){return q.sim===n}); }
  else { list=[]; DIST.forEach(function(d){list=list.concat(shuffle(bySubj(d[0])).slice(0,d[1]))}); }
  S={mode:'sim',title:n?'Simulazione '+n+' del libro':'Simulazione casuale',items:shuffle(list).map(prep),i:0,end:Date.now()+100*60*1000};
  run();
}
function training(title,list,review){
  if(!list.length){home();return}
  S={mode:'train',title:title,items:list.map(prep),i:0,t0:Date.now(),review:!!review};
  run();
}
function run(){ homeBtn.classList.remove('hidden'); startTimer(); show(); }
function startTimer(){
  stopTimer();
  tick=setInterval(function(){
    var el=document.getElementById('timer'); if(!S) return;
    if(S.mode==='sim'){var left=Math.round((S.end-Date.now())/1000); if(el){el.textContent=fmt(left); el.classList.toggle('low',left<=300);} if(left<=0){finish(true)}}
    else if(el){el.textContent=fmt(Math.round((Date.now()-S.t0)/1000))}
  },1000);
}
function stopTimer(){if(tick){clearInterval(tick);tick=null}}

function show(){
  var it=S.items[S.i], tot=S.items.length, answered=S.items.filter(function(x){return x.a>=0}).length;
  var sim=S.mode==='sim', locked=!sim && it.a>=0;
  var tm=sim?fmt(Math.round((S.end-Date.now())/1000)):fmt(Math.round((Date.now()-S.t0)/1000));
  var h='<div class="qbar"><div><b>'+esc(S.title)+'</b><div class="meta">Domanda '+(S.i+1)+' di '+tot+' · risposte date: '+answered+'</div></div><div class="timer" id="timer" aria-label="Tempo">'+tm+'</div></div>';
  h+='<div class="prog"><i style="width:'+Math.round(answered/tot*100)+'%"></i></div>';
  h+='<div class="card"><span class="tag">'+esc(lbl(it.q.s))+'</span><div class="qtext">'+stem(it.q.q)+'</div>';
  it.o.forEach(function(o,k){
    var cls='opt';
    if(locked){ if(k===it.c) cls+=' ok'; else if(k===it.a) cls+=' ko'; }
    else if(k===it.a) cls+=' sel';
    h+='<button type="button" class="'+cls+'" data-k="'+k+'"'+(locked?' disabled':'')+'><span class="L">'+'ABCD'[k]+'</span><span>'+esc(o)+'</span></button>';
  });
  if(locked) h+='<div class="expl"><b>'+(it.a===it.c?'Esatto.':'Risposta giusta: '+'ABCD'[it.c]+'.')+'</b> '+esc(it.q.e)+'</div>';
  h+='<div class="nav"><button class="btn light" id="prev" type="button"'+(S.i?'':' disabled')+'>‹ Indietro</button>';
  h+=S.i<tot-1?'<button class="btn" id="next" type="button">Avanti ›</button>':'<button class="btn red" id="end" type="button">'+(sim?'Consegna':'Termina')+'</button>';
  h+='</div>';
  if(sim){
    h+='<div class="dots">'+S.items.map(function(x,k){return '<button type="button" class="dot'+(x.a>=0?' a':'')+(k===S.i?' cur':'')+'" data-j="'+k+'">'+(k+1)+'</button>'}).join('')+'</div>';
    h+='<p style="text-align:center;margin-top:14px"><button class="btn red" id="end2" type="button">Consegna la prova</button></p>';
  }
  h+='</div>';
  app.innerHTML=h;
  app.querySelectorAll('.opt').forEach(function(b){b.onclick=function(){
    var k=+b.getAttribute('data-k');
    if(sim){ it.a=(it.a===k?-1:k); show(); }
    else if(it.a<0){ it.a=k; mark(it); show(); }
  }});
  var p=document.getElementById('prev'); if(p) p.onclick=function(){S.i--;show();window.scrollTo(0,0)};
  var n=document.getElementById('next'); if(n) n.onclick=function(){S.i++;show();window.scrollTo(0,0)};
  var e=document.getElementById('end'); if(e) e.onclick=function(){confirmEnd()};
  var e2=document.getElementById('end2'); if(e2) e2.onclick=function(){confirmEnd()};
  app.querySelectorAll('.dot').forEach(function(d){d.onclick=function(){S.i=+d.getAttribute('data-j');show()}});
}
function confirmEnd(){
  var empty=S.items.filter(function(x){return x.a<0}).length;
  if(S.mode==='sim' && empty>0){
    if(!window.confirm('Hai ancora '+empty+' domande senza risposta. Nella preselezione conviene rispondere a tutte: un errore non toglie punti. Vuoi consegnare lo stesso?')) return;
  }
  finish(false);
}
function mark(it){
  var errs=get('errors',[]), p=errs.indexOf(it.id);
  if(it.a===it.c){ if(p>=0) errs.splice(p,1); }
  else if(it.a>=0 && p<0) errs.push(it.id);
  put('errors',errs);
}
function finish(timeout){
  stopTimer();
  if(S.mode==='sim') S.items.forEach(mark);
  var tot=S.items.length, ok=S.items.filter(function(x){return x.a===x.c}).length;
  var per={}; S.items.forEach(function(x){var s=x.q.s;per[s]=per[s]||{ok:0,n:0};per[s].n++;if(x.a===x.c)per[s].ok++});
  var hist=get('hist',[]); var d=new Date();
  hist.unshift({title:S.title,score:ok,tot:tot,date:d.toLocaleDateString('it-IT')+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})});
  put('hist',hist.slice(0,30));
  var h='<h1>'+esc(S.title)+'</h1>'+(timeout?'<p class="lead">Tempo scaduto: la prova è stata consegnata in automatico.</p>':'');
  h+='<div class="card score"><div class="big">'+ok+'<small> / '+tot+'</small></div><div class="meta">Punteggio in sessantesimi: <b>'+(ok*60/tot).toFixed(2).replace('.',',')+' / 60</b><br>Risposte esatte: '+ok+'<br>Sbagliate: '+S.items.filter(function(x){return x.a>=0&&x.a!==x.c}).length+'<br>Senza risposta: '+S.items.filter(function(x){return x.a<0}).length+'</div></div>';
  h+='<h2>Punteggio per materia</h2><div class="card"><table class="t"><tr><th>Materia</th><th class="n">Esatte</th><th>%</th></tr>';
  ORDER.forEach(function(s){ if(!per[s]) return; var pc=Math.round(per[s].ok/per[s].n*100);
    h+='<tr><td>'+esc(lbl(s))+'</td><td class="n">'+per[s].ok+'/'+per[s].n+'</td><td><div class="bar"><i style="width:'+pc+'%"></i></div></td></tr>'; });
  h+='</table></div>';
  var wrong=S.items.filter(function(x){return x.a!==x.c});
  h+='<div class="row"><button class="btn" id="again" type="button">Torna al menu</button>'+(wrong.length?'<button class="btn red" id="showw" type="button">Rivedi gli errori ('+wrong.length+')</button>':'')+'</div><div id="revlist"></div>';
  app.innerHTML=h; window.scrollTo(0,0);
  homeBtn.classList.add('hidden');
  document.getElementById('again').onclick=home;
  var sw=document.getElementById('showw'); if(sw) sw.onclick=function(){
    document.getElementById('revlist').innerHTML='<h2>Le domande sbagliate o senza risposta</h2><div class="card">'+wrong.map(function(x){
      return '<div class="rev"><span class="tag">'+esc(lbl(x.q.s))+'</span><span class="tag '+(x.a<0?'':'ko')+'">'+(x.a<0?'Senza risposta':'Tua risposta: '+'ABCD'[x.a])+'</span><div class="qtext">'+stem(x.q.q)+'</div>'+
      x.o.map(function(o,k){return '<div class="opt'+(k===x.c?' ok':(k===x.a?' ko':''))+'"><span class="L">'+'ABCD'[k]+'</span><span>'+esc(o)+'</span></div>'}).join('')+
      '<div class="expl"><b>Perché:</b> '+esc(x.q.e)+'</div></div>';
    }).join('')+'</div>';
    sw.disabled=true;
  };
  S=null;
}
homeBtn.onclick=function(){ if(S && S.mode==='sim' && !window.confirm('Vuoi abbandonare la simulazione? Le risposte date finora andranno perse.')) return; home(); };
if(get('ok',false)) start(); else gate();
})();
