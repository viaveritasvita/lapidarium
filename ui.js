/* LAPIDARIUM — UI compartilhada: delta vivo + troca de tema */

// ══ TEMA ══
function toggleTheme(){
  const l=document.body.classList.toggle('light');
  try{localStorage.setItem('lapidarium:tema',l?'light':'dark')}catch(e){}
  const b=document.getElementById('themeBtn');
  if(!b)return;
  const i=b.querySelector('.tb-ico');
  if(i)i.textContent=l?'☾':'☀';
  else b.textContent=l?'☾ Tema':'☀ Tema';
}

// ══ DELTA — olho vivo (rastreio suave · deriva ociosa · piscar) ══
(function(){
  function init(){
    const wrap=document.getElementById('deltaWrap');
    if(!wrap) return;
    const svgWrap=wrap.querySelector('.delta-svg-wrap');
    const halo=wrap.querySelector('.delta-halo');
    const rays=wrap.querySelector('.delta-rays');
    const pupil=document.getElementById('pupil');
    const iris=document.getElementById('iris');
    const spec=document.getElementById('spec');
    const eye=document.getElementById('eyeOutline');
    const glow=document.getElementById('eyeGlow');
    if(!pupil) return;
    const EX=42,EY=54,MAX=3.0,SX=1.2,SY=-1.2;
    const IRIS_RY=7.5,IRIS_R=5,PUP_R=2.2,GLOW_RY=8.5;
    let tgtX=EX,tgtY=EY,curX=EX,curY=EY,tgtProx=0,curProx=0,tgtNb=0,curNb=0;
    let lastMove=performance.now(),blinking=false,blinkStart=0,blink=1;
    let nextBlink=performance.now()+2000+Math.random()*3000;
    const lerp=(a,b,f)=>a+(b-a)*f;
    document.addEventListener('mousemove',function(e){
      lastMove=performance.now();
      const r=wrap.getBoundingClientRect();
      const cx=r.left+r.width/2, cy=r.top+r.height/2;
      const dx=e.clientX-cx, dy=e.clientY-cy, dist=Math.hypot(dx,dy);
      const t=Math.min(dist,140)/140;
      tgtX=EX+(dx/Math.max(dist,1))*MAX*t;
      tgtY=EY+(dy/Math.max(dist,1))*MAX*t;
      const FULL=380;
      tgtProx=Math.max(0,Math.min(1,(FULL-dist)/FULL));
      tgtNb=Math.max(0,Math.min(1,(120-dist)/120));
    });
    function frame(now){
      if(now-lastMove>2600){const w=now/1000;tgtX=EX+Math.cos(w*0.5)*1.4;tgtY=EY+Math.sin(w*0.7)*1.0;tgtProx=lerp(tgtProx,0.12,0.02);tgtNb=lerp(tgtNb,0,0.05);}
      curX=lerp(curX,tgtX,0.14);curY=lerp(curY,tgtY,0.14);curProx=lerp(curProx,tgtProx,0.08);curNb=lerp(curNb,tgtNb,0.10);
      if(!blinking&&now>=nextBlink){blinking=true;blinkStart=now;}
      if(blinking){const bd=now-blinkStart,DUR=150;if(bd>=DUR){blinking=false;blink=1;nextBlink=now+2600+Math.random()*4200;}else{blink=Math.abs(Math.cos((bd/DUR)*Math.PI));}}
      const breathe=0.5+0.5*Math.sin(now/1500);
      pupil.setAttribute('cx',curX.toFixed(2));pupil.setAttribute('cy',curY.toFixed(2));
      iris.setAttribute('cx',curX.toFixed(2));iris.setAttribute('cy',curY.toFixed(2));
      spec.setAttribute('cx',(curX+SX).toFixed(2));spec.setAttribute('cy',(curY+SY).toFixed(2));
      if(eye)eye.setAttribute('ry',(IRIS_RY*blink).toFixed(2));
      if(glow)glow.setAttribute('ry',(GLOW_RY*Math.max(blink,0.2)).toFixed(2));
      iris.setAttribute('r',(IRIS_R*Math.max(blink,0.05)).toFixed(2));
      pupil.setAttribute('r',(PUP_R*Math.max(blink,0.05)).toFixed(2));
      spec.style.opacity=blink.toFixed(2);
      svgWrap.style.animation='none';
      svgWrap.style.transform=`scale(${(1+curProx*0.05+curNb*0.05).toFixed(3)})`;
      halo.style.background=`radial-gradient(circle,rgba(240,217,138,${(0.02+curProx*0.11).toFixed(3)}) 0%,rgba(201,168,76,${(0.01+curProx*0.06).toFixed(3)}) 45%,transparent 100%)`;
      const s1=Math.round(3+curProx*11+curNb*5+breathe*2),s2=Math.round(10+curProx*24+curNb*12+breathe*4);
      svgWrap.style.filter=`drop-shadow(0 0 ${s1}px rgba(240,217,138,${(0.26+curProx*0.34+curNb*0.15).toFixed(2)})) drop-shadow(0 0 ${s2}px rgba(201,168,76,${(0.06+curProx*0.2+curNb*0.08).toFixed(2)}))`;
      rays.style.opacity=(curProx*0.45+curNb*0.30).toFixed(2);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',init);
})();

// ══ LEITURA DA API (planilha via Apps Script) ══
async function lapiFetch(tipo, extra){
  const cfg = window.LAPIDARIUM_CONFIG;
  if (!cfg || !cfg.API_URL || cfg.API_URL.indexOf("COLE_AQUI") >= 0) return null;
  try {
    const r = await fetch(cfg.API_URL + "?tipo=" + tipo + (extra || ""));
    if (!r.ok) return null;
    const j = await r.json();
    return (j && j.ok && Array.isArray(j.itens)) ? j.itens : null;
  } catch(e){ return null; }
}
function lapiData(d){ return ("" + (d||"")).slice(0,10); }              // ISO ou yyyy-mm-dd -> yyyy-mm-dd
function lapiHora(h){ const s=""+(h||""); let m=s.match(/T(\d\d:\d\d)/); if(m) return m[1]; m=s.match(/^(\d\d?:\d\d)/); return m?m[1]:""; }

// ══ ANEXO — botão "Prancha PDF" (campo item.anexo = link do PDF no Drive) ══
// Formato do campo: "Rotulo|URL ;; Rotulo|URL" (o publicar.html grava assim).
// Compatibilidade: URL pelada (acervo antigo) vale como Prancha.
function lapiAnexosParse(raw){
  if (!raw) return [];
  return String(raw).split(/\s*;;\s*/).map(function(x){ return x.trim(); }).filter(Boolean).map(function(x){
    var i = x.indexOf('|');
    if (i < 0) return { rotulo: 'Prancha', url: x.trim() };
    return { rotulo: (x.slice(0, i).trim() || 'Anexo'), url: x.slice(i + 1).trim() };
  }).filter(function(m){ return /^https?:\/\//i.test(m.url); });
}
function lapiAnexoUrl(raw){ var m = lapiAnexosParse(raw); return m.length ? m[0].url : ''; }
function lapiEscAttr_(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function lapiAnexoBtn(item){
  var mats = lapiAnexosParse(item && (item.anexo || item.anexos));
  if (!mats.length) return "";
  return mats.map(function(m){
    var rot = /^prancha$/i.test(m.rotulo) ? 'Prancha PDF' : m.rotulo;
    return '<span class="vc-pdf" data-pdf="' + lapiEscAttr_(m.url) + '" role="link" tabindex="0" '
      + 'onclick="event.preventDefault();event.stopPropagation();window.open(this.dataset.pdf,\'_blank\',\'noopener\')">'
      + lapiEscAttr_(rot) + '</span>';
  }).join('');
}
