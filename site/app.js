'use strict';
/* Todos os números e listas vêm de dados.js (window.DADOS), gerado por tratar_dados.py. */
const D = window.DADOS;
const O = D.oficial;
const TOTAL = O.candidaturas;
const CANDS = D.candidaturas;
const $ = id => document.getElementById(id);
const pt = n => n.toLocaleString('pt-BR');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* números que aparecem em texto corrido */
const FILL = {dataCorte:D.dataCorte};
document.querySelectorAll('[data-fill]').forEach(el => { el.textContent = FILL[el.dataset.fill]; });

/* ---------- números ---------- */
const NUMS = [
  {n:1, suf:'%', t:'dos compromissos traz propostas claras, com custos e prazos'},
  {n:7, suf:'', t:'candidatos não trazem nada sobre meio ambiente'},
  {n:11, suf:'%', t:'dos planos abordaram os quatro temas ambientais escolhidos'},
  {n:26, suf:'%', t:'dos candidatos estabelecem relação entre clima e saúde'},
  {n:79, suf:'%', t:'dos planos mencionam pelo menos um dos quatro grandes temas ambientais'},
  {n:80, suf:'%', t:'dos programas de governo ignoram poluição do ar'}
];
const numsEl = $('nums');
numsEl.innerHTML = NUMS.map(x => `<div class="num"><strong data-n="${x.n}" data-suf="${x.suf}">${pt(x.n)}${x.suf}</strong><p>${x.t}</p></div>`).join('');
/* entrada única: os números sobem quando a seção aparece na tela */
if(!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
  const els = [...numsEl.querySelectorAll('strong')];
  els.forEach(s => { s.textContent = '0'; });
  const io = new IntersectionObserver(([e]) => {
    if(!e.isIntersecting) return;
    io.disconnect();
    els.forEach((s, i) => {
      const n = +s.dataset.n, suf = s.dataset.suf || '', start = performance.now() + i * 120, dur = 1100;
      (function step(t){
        const k = Math.min(Math.max((t - start) / dur, 0), 1);
        s.textContent = pt(Math.round(n * (1 - Math.pow(1 - k, 3)))) + suf;
        if(k < 1) requestAnimationFrame(step);
      })(performance.now());
    });
  }, {threshold:.35});
  io.observe(numsEl);
}

/* ---------- ferramenta: lista de candidaturas ---------- */
const filters = $('filters');
const cards = $('cards');
const DISP = D.disputas;
const rotuloDisputa = id => DISP.find(d => d.id === id).rotulo;
const doGrupo = id => CANDS.filter(c => c.disputa === id).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
const CHIPS = [{id:'all', rotulo:'Todas', n:CANDS.length}, ...DISP.map(d => ({id:d.id, rotulo:d.rotulo, n:doGrupo(d.id).length}))];
filters.setAttribute('role', 'group');
filters.setAttribute('aria-label', 'Filtrar por disputa');
filters.innerHTML = CHIPS.map((c, i) => `<button type="button" data-k="${c.id}" aria-pressed="${c.id === 'all'}">${c.rotulo}<span class="n">${c.n}</span></button>`).join('') + '<span class="status" id="live" aria-live="polite"></span>';

/* avatar: foto (quando houver) ou iniciais; só sigla -> a própria sigla */
function avatarDe(c){
  if(c.foto) return {cls:' foto', html:`<img src="${esc(c.foto)}" alt="" width="56" height="56" loading="lazy">`};
  if(c.nome){
    const w = c.nome.split(/\s+/).map(x => x.replace(/\./g, '')).filter(x => x && !/^(d[aeo]s?|e)$/i.test(x));
    const t = (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase();
    return {cls:'', html:t};
  }
  if(c.sigla){
    const t = c.sigla.length <= 4 ? c.sigla : c.sigla.slice(0, 3);
    return {cls:t.length > 3 ? ' sm' : '', html:t.toUpperCase()};
  }
  return {cls:'', html:'?'};
}
const ARROW = '<svg class="go" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>';
const TCOR = {mitigacao:'var(--t-mit)', adaptacao:'var(--t-ada)', ar:'var(--t-ar)', saude:'var(--t-sau)'};
$('tlegend').innerHTML = '<span class="tl-label">Legenda dos temas</span>' + D.temas.map(t => `<span class="tl-i"><i style="background:${TCOR[t.id]}"></i>${t.curto}</span>`).join('');

/* filete de temas: proporção dos trechos de cada candidatura por tema (contagem oficial, completa) */
function dadosCard(c){
  if(c.estado === 'sem_ocorrencia') return {bars:'', resumo:'<p class="card-none">Nenhum dos quatro temas</p>'};
  const porTema = D.temas.map(t => ({t, n:c.contagens[t.id]})).filter(x => x.n);
  const n = c.contagens.total;
  const bars = `<div class="tbar" aria-hidden="true">${porTema.map(x => `<i style="flex:${x.n} 1 0;background:${TCOR[x.t.id]}"></i>`).join('')}</div>`
    + `<p class="tbar-legend">${porTema.map(x => `<span class="tbar-item"><i aria-hidden="true" style="background:${TCOR[x.t.id]}"></i>${esc(x.t.curto)} <b>${x.n}</b></span>`).join('')}</p>`;
  const resumo = `<p class="card-n"><b>${n}</b> ${n === 1 ? 'trecho' : 'trechos'}</p>`;
  return {bars, resumo};
}
/* barra/legenda ficam coladas no nome (topo); o resumo final fica ancorado no fundo do
   card via margin-top:auto, pra dar uma base consistente independente de quantos temas
   o candidato tem */
const cardHTML = c => {
  const a = avatarDe(c);
  const {bars, resumo} = dadosCard(c);
  return `<article class="card"><span class="avatar${a.cls}" aria-hidden="true">${a.html}</span><div class="card-who"><h4 class="name"><a href="#${c.id}" data-cand="${c.id}">${esc(c.titulo)}<span class="sr"> — ver trechos</span></a></h4>${c.subtitulo ? `<span class="sigla">${esc(c.subtitulo)}</span>` : ''}</div>${bars ? `<div class="card-data">${bars}</div>` : ''}${resumo}${ARROW}</article>`;
};

/* abre na primeira disputa; "Todas" agrupa por disputa. Grupos grandes mostram só os primeiros cards */
function render(){
  const k = filters.querySelector('button[aria-pressed="true"]').dataset.k;
  const list = k === 'all' ? DISP : DISP.filter(d => d.id === k);
  cards.innerHTML = list.map(d => {
    const todos = doGrupo(d.id);
    return `<div class="group" role="group" aria-label="${d.rotulo}" data-g="${d.id}"><h3 class="group-h">${d.rotulo}</h3><div class="cards">${todos.map(cardHTML).join('')}</div></div>`;
  }).join('');
  const total = list.reduce((a, d) => a + doGrupo(d.id).length, 0);
  $('live').textContent = k === 'all' ? `${total} candidaturas` : `${total} de ${CANDS.length} candidaturas`;
}
filters.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  filters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  render();
  /* feedback de que o filtro rodou, mesmo quando a parte visível da lista não muda */
  cards.classList.remove('swap'); void cards.offsetWidth; cards.classList.add('swap');
});
render();

/* ---------- popup da candidatura ---------- */
const dlg = $('cand');
const body = $('cand-body');
const fil = $('cand-filters');
const pop = $('pop');
const TEMA = Object.fromEntries(D.temas.map(t => [t.id, t]));
const NAT = Object.fromEntries(D.naturezas.map(n => [n.id, n.rotulo]));
const ATR = D.atributos[0];   // meta quantificada
/* provisório: definições derivadas do documento do jornalista; validar com a pesquisadora */
const SELOS = {
  proposta:'O plano anuncia o que fará, no futuro, com o tema como objeto da ação.',
  diagnostico:'Descreve uma situação, ou relata o que o governo atual já fez ou está fazendo.',
  mencao:'O termo aparece, mas o trecho não afirma nada sobre ele.',
  contrario:'Nega ou contesta a mudança do clima ou a ação climática.',
  metaQuantificada:'Trecho que traz uma meta numérica com prazo definido.'
};
const selosEl = $('acc-selos');
if(selosEl) selosEl.innerHTML = [...D.naturezas.map(n => ({k:n.id, r:n.rotulo})), {k:'contrario', r:'Contrário'}]
  .map(s => `<div class="acc-selo"><dt><span class="selo-tag">${esc(s.r)}</span></dt><dd>${esc(SELOS[s.k])}</dd></div>`).join('');
/* temas com trecho oficial (contagem completa) — decide os filtros habilitados */
const temasDe = c => D.temas.map(t => t.id).filter(id => c.contagens[id] > 0);
/* temas com pelo menos uma citação de texto disponível — decide o que o corpo do modal renderiza */
const temasComTexto = c => D.temas.map(t => t.id).filter(id => c.trechos.some(x => x.tema === id));
let atual = null;   // {c, tema}
let empurrado = false;   // true quando abrimos o popup criando uma entrada no histórico
/* history pode falhar em contextos isolados (iframe, pré-visualização): nesse caso o popup abre sem endereço */
const histPush = h => { try { history.pushState({modal:true}, '', h); return true; } catch { return false; } };
const histReplace = (st, h) => { try { history.replaceState(st, '', h); } catch {} };

const marcarTermo = t =>
  (t.inicio == null || t.fim == null) ? esc(t.texto) :
  esc(t.texto.slice(0, t.inicio)) + '<mark>' + esc(t.texto.slice(t.inicio, t.fim)) + '</mark>' + esc(t.texto.slice(t.fim));

const trHTML = t =>
  `<article class="tr"><p class="tr-txt">${marcarTermo(t)}</p><div class="tr-meta"><button type="button" class="selo" data-selo="${t.natureza}" aria-expanded="false">${NAT[t.natureza]}</button>${t.metaQuantificada ? `<button type="button" class="selo attr" data-selo="metaQuantificada" aria-expanded="false">${ATR.rotulo}</button>` : ''}<span class="tr-pag">p. ${t.pagina}</span></div></article>`;

function renderNatBar(c){
  const el = $('cand-natbar');
  const trechos = c.trechos || [];
  const total = trechos.length;
  if(!total){ el.innerHTML = ''; return; }
  const counts = {};
  D.naturezas.forEach(n => counts[n.id] = 0);
  trechos.forEach(t => { if(counts[t.natureza] !== undefined) counts[t.natureza]++; });
  const SOMBRA = {proposta:1, diagnostico:.55, mencao:.28};
  const PLURAL = {proposta:'compromissos', diagnostico:'relatos', mencao:'citações'};
  const segs = D.naturezas.filter(n => counts[n.id] > 0);
  el.innerHTML = `<div class="nat-bar-track">${segs.map(n => `<span class="nat-bar-seg" style="width:${(counts[n.id] / total * 100).toFixed(2)}%;background:rgba(21,7,76,${SOMBRA[n.id]})"></span>`).join('')}</div><p class="nat-bar-legend">${segs.map(n => `<span class="nat-bar-item"><i style="background:rgba(21,7,76,${SOMBRA[n.id]})"></i>${counts[n.id]} ${PLURAL[n.id]}</span>`).join('')}</p>`;
}

function renderTopo(c){
  const a = avatarDe(c), av = $('cand-avatar');
  av.className = 'avatar' + a.cls; av.innerHTML = a.html;
  $('cand-titulo').textContent = c.titulo;
  $('cand-sub').textContent = [c.subtitulo, rotuloDisputa(c.disputa)].filter(Boolean).join(' · ');
  renderNatBar(c);
}

function renderCorpo(){
  const {c} = atual;
  fecharPop();
  if(c.estado === 'sem_ocorrencia'){
    fil.innerHTML = ''; $('cand-status').textContent = '';
    body.innerHTML = '<p class="dlg-empty">Nenhum dos quatro temas aparece no programa desta candidatura.</p>';
    return;
  }
  const temas = temasDe(c);   // temas com contagem oficial > 0 (define o que fica clicável)
  if(!temas.includes(atual.tema)) atual.tema = 'todos';
  /* os 4 temas aparecem sempre, na mesma ordem; contagem é sempre a oficial (completa para as 34) */
  fil.innerHTML = [{id:'todos', rotulo:'Todos', n:c.contagens.total}, ...D.temas.map(t => ({id:t.id, rotulo:t.curto, n:c.contagens[t.id]}))]
    .map(x => {
      const off = x.id !== 'todos' && x.n === 0;
      return `<button type="button" data-k="${x.id}" aria-pressed="${x.id === atual.tema}"${off ? ' class="off" aria-disabled="true" title="Nenhum trecho deste tema no programa"' : ''}>${x.rotulo}<span class="n">${x.n}</span></button>`;
    }).join('');
  const idsComTexto = temasComTexto(c);
  const ids = (atual.tema === 'todos' ? temas : [atual.tema]).filter(id => idsComTexto.includes(id));
  const totalTema = atual.tema === 'todos' ? c.contagens.total : c.contagens[atual.tema];
  const mostrados = c.trechos.filter(x => (atual.tema === 'todos' ? temas : [atual.tema]).includes(x.tema)).length;
  const un = n => n === 1 ? '1 trecho' : `${n} trechos`;
  $('cand-status').textContent = atual.tema === 'todos' ? un(totalTema) : `${mostrados} de ${totalTema} trechos`;
  body.innerHTML = ids.map(id => `<div class="group" role="group" aria-label="${TEMA[id].rotulo}"><h3 class="group-h">${TEMA[id].rotulo}</h3>${c.trechos.filter(x => x.tema === id).map(trHTML).join('')}</div>`).join('');
}

/* ---- endereço: #BR-05 abre a candidatura; #BR-05/saude já abre filtrada ---- */
const hashDe = () => `#${atual.c.id}${atual.tema !== 'todos' ? '/' + atual.tema : ''}`;
function lerHash(){
  const m = /^#([A-Z]{2}-\d{2})(?:\/([a-z]+))?$/.exec(location.hash);
  return m && CANDS.some(c => c.id === m[1]) ? {id:m[1], tema:m[2] || 'todos'} : null;
}
/* fade ao esconder: espera a animação terminar antes de fechar o <dialog> */
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)');
function esconder(){
  if(!dlg.open) return;
  if(REDUZIDO.matches){ dlg.close(); return; }
  if(dlg.classList.contains('saindo')) return;
  dlg.classList.add('saindo');
  const fim = () => { if(!dlg.classList.contains('saindo')) return; dlg.classList.remove('saindo'); dlg.close(); };
  dlg.addEventListener('animationend', function h(e){
    if(e.target === dlg && e.animationName === 'dlg-out'){ dlg.removeEventListener('animationend', h); fim(); }
  });
  setTimeout(fim, 300);   // rede de segurança
}
function abrir(id, tema){
  const c = CANDS.find(x => x.id === id); if(!c) return;
  dlg.classList.remove('saindo');   // reabrir durante o fade cancela o fechamento
  atual = {c, tema: tema || 'todos'};
  renderTopo(c); renderCorpo();
  body.scrollTop = 0;
  if(!dlg.open) dlg.showModal();
}
function fechar(){
  if(!dlg.open) return;
  fecharPop();
  if(empurrado){ empurrado = false; history.back(); }                  // o popstate fecha
  else { histReplace(null, location.pathname + location.search); esconder(); }
}
window.addEventListener('popstate', () => {
  const h = lerHash();
  if(h) abrir(h.id, h.tema); else if(dlg.open){ empurrado = false; esconder(); }
});

cards.addEventListener('click', e => {
  const a = e.target.closest('a[data-cand]'); if(!a) return;
  e.preventDefault();
  atual = {c:CANDS.find(x => x.id === a.dataset.cand), tema:'todos'};
  empurrado = histPush(hashDe());
  abrir(atual.c.id, 'todos');
});
fil.addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b || b.getAttribute('aria-disabled') === 'true') return;
  atual.tema = b.dataset.k;
  renderCorpo();
  body.scrollTop = 0;
  body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  histReplace(history.state, hashDe());
});

/* ---- selos: definição ao tocar (não só ao passar o mouse) ---- */
let popBtn = null;
function fecharPop(){
  if(!popBtn) return;
  popBtn.setAttribute('aria-expanded', 'false'); popBtn = null; pop.hidden = true;
}
function abrirPop(btn){
  if(popBtn === btn){ fecharPop(); return; }
  fecharPop();
  popBtn = btn; btn.setAttribute('aria-expanded', 'true');
  pop.textContent = SELOS[btn.dataset.selo];
  pop.hidden = false;
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  const left = Math.min(Math.max(12, r.left), innerWidth - w - 12);
  let top = r.bottom + 8;
  if(top + h > innerHeight - 12) top = r.top - h - 8;
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
body.addEventListener('click', e => { const b = e.target.closest('.selo'); if(b) abrirPop(b); });
body.addEventListener('scroll', fecharPop, {passive:true});
window.addEventListener('resize', fecharPop);

dlg.addEventListener('click', e => {
  if(e.target === dlg){ fechar(); return; }                            // clique no fundo
  if(!e.target.closest('.selo') && !e.target.closest('.pop')) fecharPop();
});
dlg.querySelector('.dlg-close').addEventListener('click', fechar);
dlg.addEventListener('cancel', e => { e.preventDefault(); if(popBtn) fecharPop(); else fechar(); });   // Esc
dlg.addEventListener('close', () => { fecharPop(); atual = null; empurrado = false; dlg.classList.remove('saindo'); });
{ const h = lerHash(); if(h) abrir(h.id, h.tema); }                     // link direto

/* ---- dialog genérico de documento (metodologia / nota técnica) — conteúdo ainda é rascunho ---- */
const DOCS = {
  metodologia: {
    titulo: 'Metodologia',
    corpo: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <h3>Levantamento e critérios</h3>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
      <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.</p>
      <h3>Classificação dos trechos</h3>
      <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
      <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa.</p>
    `
  },
  'nota-tecnica': {
    titulo: 'Nota técnica',
    corpo: `
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
      <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
      <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur.</p>
      <p>Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.</p>
      <p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia.</p>
    `
  }
};

const doc = $('doc');
function abrirDoc(chave){
  const d = DOCS[chave]; if(!d) return;
  doc.classList.remove('saindo');
  $('doc-titulo').textContent = d.titulo;
  $('doc-body-inner').innerHTML = d.corpo;
  doc.querySelector('.dlg-body').scrollTop = 0;
  if(!doc.open) doc.showModal();
}
function fecharDoc(){
  if(!doc.open) return;
  if(REDUZIDO.matches){ doc.close(); return; }
  if(doc.classList.contains('saindo')) return;
  doc.classList.add('saindo');
  const fim = () => { if(!doc.classList.contains('saindo')) return; doc.classList.remove('saindo'); doc.close(); };
  doc.addEventListener('animationend', function h(e){
    if(e.target === doc && e.animationName === 'dlg-out'){ doc.removeEventListener('animationend', h); fim(); }
  });
  setTimeout(fim, 300);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-doc]'); if(!b) return;
  e.preventDefault();
  abrirDoc(b.dataset.doc);
});
doc.addEventListener('click', e => { if(e.target === doc) fecharDoc(); });
doc.querySelector('.dlg-close').addEventListener('click', fecharDoc);
doc.addEventListener('cancel', e => { e.preventDefault(); fecharDoc(); });


/* ---------- header: a cor do gradiente acompanha a seção que está por baixo ---------- */
/* ---------- accordion da intro: abrir/fechar animado com altura medida (mais fluido que grid-rows) ---------- */
document.querySelectorAll('.acc-item > summary').forEach(summary => {
  const item = summary.parentElement;
  const body = item.querySelector(':scope > .acc-body');
  const inner = body.querySelector(':scope > .acc-body-in');
  let anim = null;

  summary.addEventListener('click', e => {
    e.preventDefault();
    if(anim) anim.cancel();
    if(REDUZIDO.matches){ item.open = !item.open; return; }

    if(item.open){
      // fechar: da altura atual até 0
      body.style.display = 'block'; body.style.overflow = 'hidden';
      const de = inner.offsetHeight;
      anim = body.animate([{height: de + 'px'}, {height: '0px'}], {duration: 260, easing: 'cubic-bezier(.4,0,.2,1)'});
      anim.onfinish = () => { item.open = false; body.style.cssText = ''; anim = null; };
    } else {
      // abrir: de 0 até a altura natural do conteúdo
      item.open = true;
      body.style.display = 'block'; body.style.overflow = 'hidden'; body.style.height = '0px';
      const ate = inner.offsetHeight;
      anim = body.animate([{height: '0px'}, {height: ate + 'px'}], {duration: 260, easing: 'cubic-bezier(.4,0,.2,1)'});
      anim.onfinish = () => { body.style.cssText = ''; anim = null; };
    }
  });
});

/* ---------- menu mobile: hamburguer + drawer lateral ---------- */
const burger = $('nav-burger');
const drawer = $('drawer');
const drawerBackdrop = $('drawer-backdrop');
function abrirDrawer(){
  drawer.hidden = false; drawerBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  burger.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => { drawer.classList.add('in'); drawerBackdrop.classList.add('in'); });
}
function fecharDrawer(){
  drawer.classList.remove('in'); drawerBackdrop.classList.remove('in');
  document.body.style.overflow = '';
  burger.setAttribute('aria-expanded', 'false');
  const fim = () => { drawer.hidden = true; drawerBackdrop.hidden = true; };
  if(REDUZIDO.matches) fim();
  else drawer.addEventListener('transitionend', fim, {once: true});
}
burger.addEventListener('click', abrirDrawer);
$('drawer-close').addEventListener('click', fecharDrawer);
drawerBackdrop.addEventListener('click', fecharDrawer);
drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', fecharDrawer));
document.addEventListener('keydown', e => { if(e.key === 'Escape' && !drawer.hidden) fecharDrawer(); });

const hdr = $('hdr');
const navLinks = [...document.querySelectorAll('.nav a[href^="#"], .drawer a[href^="#"]')];
const bands = [...document.querySelectorAll('main > section[data-nav]')];
function markNav(){
  let cur = null;
  bands.forEach(b => { if(b.getBoundingClientRect().top < 160) cur = b.dataset.nav; });
  navLinks.forEach(a => {
    if(cur && a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}
let ticking = false;
function tintHeader(){
  ticking = false;
  markNav();
  const y = hdr.getBoundingClientRect().height * 0.5;
  /* elementsFromPoint: o menu (.nav) captura o clique e ficaria sempre no topo da pilha */
  const band = document.elementsFromPoint(window.innerWidth / 2, y).map(e => e.closest('.hero, .sec, .foot')).find(Boolean);
  if(band) hdr.style.setProperty('--hbg', getComputedStyle(band).backgroundColor);
  hdr.classList.toggle('on-acc', !!band && (band.classList.contains('hero') || band.classList.contains('foot')));
}
window.addEventListener('scroll', () => { if(!ticking){ ticking = true; requestAnimationFrame(tintHeader); } }, {passive:true});
window.addEventListener('resize', tintHeader);
tintHeader();

/* ---------- copiar link e compartilhar ---------- */
async function copiarLink(url){
  try { await navigator.clipboard.writeText(url); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    ta.remove();
    return ok;
  }
}


