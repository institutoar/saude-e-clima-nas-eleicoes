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
  {n:0, suf:'', t:'dos 827 trechos contesta a mudança do clima ou a ação climática'},
  {n:6, suf:'', t:'dos 827 trechos fixam meta com número, percentual ou prazo verificável, em quatro dos 34 planos'},
  {n:79, suf:'%', t:'dos planos mencionam pelo menos um dos quatro temas'},
  {n:12, suf:'%', t:'dos planos tratam dos quatro temas'},
  {n:26, suf:'%', t:'dos planos relacionam clima e saúde; em quatro deles a relação aparece em um compromisso'},
  {n:7, suf:'', t:'dos 34 planos trazem poluição do ar, em 16 trechos'}
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
filters.innerHTML = '<div class="filters-row">' + CHIPS.map((c, i) => `<button type="button" data-k="${c.id}" aria-pressed="${c.id === 'all'}">${c.rotulo}<span class="n">${c.n}</span></button>`).join('') + '</div><span class="status" id="live" aria-live="polite"></span>';

/* degradê na borda direita enquanto ainda há filtros fora da tela (linha rolável) */
const REDUZIDO = matchMedia('(prefers-reduced-motion: reduce)');
function fadeRolavel(el){
  const atualizar = () => el.classList.toggle('mais', el.scrollWidth - el.clientWidth - el.scrollLeft > 2);
  el.addEventListener('scroll', atualizar, {passive:true});
  if('ResizeObserver' in window) new ResizeObserver(atualizar).observe(el);
  atualizar();
  return atualizar;
}
const centralizar = b => b.scrollIntoView({inline:'center', block:'nearest', behavior: REDUZIDO.matches ? 'auto' : 'smooth'});
fadeRolavel(filters.firstElementChild);

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
const ARROW = '<svg class="go" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12M11 5l5 5-5 5"/></svg>';
const TCOR = {mitigacao:'var(--t-mit)', adaptacao:'var(--t-ada)', ar:'var(--t-ar)', saude:'var(--t-sau)'};
$('tlegend').innerHTML = '<span class="tl-label">Legenda dos temas</span>' + D.temas.map(t => `<span class="tl-i"><i style="background:${TCOR[t.id]}"></i>${t.curto}</span>`).join('');

/* filete de temas: proporção dos trechos de cada candidatura por tema (contagem oficial, completa) */
function dadosCard(c){
  if(c.estado === 'sem_ocorrencia') return {bars:'', resumo:'<p class="card-none">Não localizamos menção aos quatro temas</p>'};
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

/* abre em "Todas" (agrupa por disputa); cada filtro mostra todos os cards do grupo escolhido */
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
  centralizar(b);
  /* feedback de que o filtro rodou, mesmo quando a parte visível da lista não muda */
  cards.classList.remove('swap'); void cards.offsetWidth; cards.classList.add('swap');
});
render();

/* ---------- popup da candidatura ---------- */
const dlg = $('cand');
const body = $('cand-body');
const fil = $('cand-filters');
const pop = $('pop');
const fadeFil = fadeRolavel(fil);
const TEMA = Object.fromEntries(D.temas.map(t => [t.id, t]));
const NAT = Object.fromEntries(D.naturezas.map(n => [n.id, n.rotulo]));
const ATR = D.atributos[0];   // meta quantificada
/* definições da Nota Metodológica v5.0 (§5): manter o texto igual ao da Nota */
const SELOS = {
  proposta:'O plano anuncia o que fará no futuro, e o tema é um dos objetos da ação.',
  diagnostico:'O plano descreve uma situação, relata o que o governo atual já fez ou está fazendo — um programa em andamento, uma lei já sancionada — ou enuncia um princípio ou condição sem anunciar ação. É o relato do próprio plano, mesmo quando soa como conquista.',
  mencao:'O termo aparece, mas o trecho não afirma nada sobre ele.',
  contrario:'O trecho nega ou contesta a mudança do clima ou a ação climática. A busca procurou linguagem explícita desse tipo — como “farsa climática” ou a saída do Acordo de Paris — nos 37 arquivos. Nenhum trecho recebeu esta natureza, e esse zero é reportado como resultado da busca.',
  metaQuantificada:'O trecho fixa um resultado a alcançar, expresso em número, percentual ou prazo verificável, inclusive zero, e esse resultado é o do tema pelo qual o trecho está registrado.'
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

/* ---------- passagens ----------
   Cada trecho é um parágrafo do plano. Trechos do mesmo tema e da mesma natureza que dividem o mesmo parágrafo
   viram um cartão só (todos os termos destacados). Exibição em três níveis: parágrafo inteiro em cor normal,
   frase classificada com fundo lilás (`.frase`), termo em amarelo (`<mark>`). Sem fundo = a frase classificada
   não é localizável no parágrafo (ou o trecho é só o fragmento registrado): não afirmamos qual frase foi classificada. */
const LIMITE_LONGO = 1200;   // acima disso o parágrafo abre recolhido, só com o entorno da frase classificada
const ORDEM_NAT = D.naturezas.map(n => n.id);

function agruparPassagens(trechos){
  const mapa = new Map(), lista = [];
  trechos.forEach(t => {
    const k = t.origem === 'paragrafo' ? t.tema + '|' + t.natureza + '|' + t.texto : 'f|' + t.id;
    let g = mapa.get(k);
    if(!g){ g = {texto:t.texto, trechos:[]}; mapa.set(k, g); lista.push(g); }
    g.trechos.push(t);
  });
  return lista;
}

function passagemHTML(g){
  const txt = g.texto, len = txt.length;
  const marks = g.trechos.filter(t => t.inicio != null && t.fim != null).map(t => [t.inicio, t.fim]);
  let frases = g.trechos.every(t => t.fraseInicio != null) ? g.trechos.map(t => [t.fraseInicio, t.fraseFim]).sort((x, y) => x[0] - y[0]) : [];
  /* frases vizinhas (só espaço entre elas) viram uma faixa contínua: evita um furo branco de 1 caractere */
  frases = frases.reduce((acc, f) => {
    const u = acc[acc.length - 1];
    if(u && f[0] <= u[1] + 2 && !txt.slice(u[1], f[0]).trim()) u[1] = Math.max(u[1], f[1]); else acc.push([...f]);
    return acc;
  }, []);
  const longo = len > LIMITE_LONGO && (frases.length || marks.length) > 0;
  let showA = 0, showB = len;
  const base = frases.length ? frases : marks;
  if(longo && base.length){
    let a = Math.min(...base.map(x => x[0])), b = Math.max(...base.map(x => x[1]));
    if(b - a > 1400){ const m = Math.min(...marks.map(x => x[0])); a = Math.max(0, m - 400); b = Math.min(len, m + 1000); }
    const ini = Math.max(0, a - 250), fim = Math.min(len, b + 250);
    showA = ini === 0 ? 0 : txt.lastIndexOf(' ', ini) + 1;
    const f = fim >= len ? -1 : txt.indexOf(' ', fim);
    showB = f < 0 ? len : f;
  }
  const pts = [...new Set([0, len, showA, showB, ...marks.flat(), ...frases.flat()])].filter(x => x >= 0 && x <= len).sort((x, y) => x - y);
  /* segmentos entre pontos de corte; termos contínuos viram um único <mark> (mesmo que a frase comece no meio da palavra) */
  const segs = [];
  for(let i = 0; i < pts.length - 1; i++){
    const s0 = pts[i], e0 = pts[i + 1];
    segs.push({
      s0, e0, texto: esc(txt.slice(s0, e0)),
      frase: frases.some(f => s0 >= f[0] && e0 <= f[1]),
      marca: marks.some(m => s0 >= m[0] && e0 <= m[1]),
      longe: longo && (e0 <= showA || s0 >= showB)
    });
  }
  const comFrase = sg => sg.frase ? `<span class="frase">${sg.texto}</span>` : sg.texto;
  const comLonge = (html, longe) => longe ? `<span class="longe">${html}</span>` : html;
  let h = '', i = 0, fimEmitido = false;
  while(i < segs.length){
    const sg = segs[i];
    if(sg.longe && sg.s0 >= showB && !fimEmitido){ h += '<span class="elipse" aria-hidden="true">… </span>'; fimEmitido = true; }
    let j = i + 1, html;
    if(sg.marca){
      while(j < segs.length && segs[j].marca && segs[j].longe === sg.longe) j++;
      html = `<mark>${segs.slice(i, j).map(comFrase).join('')}</mark>`;
    } else html = comFrase(sg);
    h += comLonge(html, sg.longe);
    if(sg.longe && segs[j - 1].e0 === showA && showA > 0) h += '<span class="elipse" aria-hidden="true">… </span>';
    i = j;
  }
  const nats = ORDEM_NAT.filter(n => g.trechos.some(t => t.natureza === n));
  const pags = [...new Set(g.trechos.map(t => t.pagina))].filter(x => x != null).sort((x, y) => x - y);
  const meta = g.trechos.some(t => t.metaQuantificada);
  return `<article class="tr${longo ? ' longo' : ''}"><p class="tr-txt">${h}</p>${longo ? '<button type="button" class="tr-mais" aria-expanded="false">Ver parágrafo completo</button>' : ''}<div class="tr-meta">${nats.map(n => `<button type="button" class="selo" data-selo="${n}" aria-expanded="false">${NAT[n]}</button>`).join('')}${meta ? `<button type="button" class="selo attr" data-selo="metaQuantificada" aria-expanded="false">${ATR.rotulo}</button>` : ''}<span class="tr-pag">${pags.length > 1 ? 'pp.' : 'p.'} ${pags.join(', ')}</span></div></article>`;
}

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
    body.innerHTML = '<p class="dlg-empty">Não localizamos menção aos quatro temas neste plano.</p>';
    return;
  }
  const temas = temasDe(c);   // temas com contagem oficial > 0 (define o que fica clicável)
  if(!temas.includes(atual.tema)) atual.tema = 'todos';
  const rolou = fil.scrollLeft;   // o innerHTML abaixo recria os botões: preserva a posição da rolagem
  /* os 4 temas aparecem sempre, na mesma ordem; contagem é sempre a oficial (completa para as 34) */
  fil.innerHTML = [{id:'todos', rotulo:'Todos', n:c.contagens.total}, ...D.temas.map(t => ({id:t.id, rotulo:t.curto, n:c.contagens[t.id]}))]
    .map(x => {
      const off = x.id !== 'todos' && x.n === 0;
      return `<button type="button" data-k="${x.id}" aria-pressed="${x.id === atual.tema}"${off ? ' class="off" aria-disabled="true" title="Nenhum trecho deste tema no programa"' : ''}>${x.rotulo}<span class="n">${x.n}</span></button>`;
    }).join('');
  fil.scrollLeft = rolou;
  fadeFil();
  const idsComTexto = temasComTexto(c);
  const ids = (atual.tema === 'todos' ? temas : [atual.tema]).filter(id => idsComTexto.includes(id));
  const totalTema = atual.tema === 'todos' ? c.contagens.total : c.contagens[atual.tema];
  const doTema = c.trechos.filter(x => (atual.tema === 'todos' ? temas : [atual.tema]).includes(x.tema));
  const mostrados = doTema.length;
  /* passagens = parágrafos distintos entre os trechos mostrados (o mesmo parágrafo em dois temas conta uma vez) */
  const passagens = new Set(doTema.map(t => t.origem === 'paragrafo' ? t.texto : 'f|' + t.id)).size;
  const un = n => n === 1 ? '1 trecho' : `${n} trechos`;
  const sufixo = passagens < mostrados ? ` · ${passagens === 1 ? '1 passagem' : passagens + ' passagens'}` : '';
  $('cand-status').textContent = (atual.tema === 'todos' ? un(totalTema) : `${mostrados} de ${totalTema} trechos`) + sufixo;
  const aviso = ids.length ? '<p class="dlg-aviso">Transcrição literal do plano de governo: pode conter cortes de página ou de coluna. A frase classificada aparece com <span class="frase">fundo lilás</span>; sem fundo, não foi possível identificá-la no parágrafo.</p>' : '';
  body.innerHTML = aviso + ids.map(id => `<div class="group" role="group" aria-label="${TEMA[id].rotulo}"><h3 class="group-h">${TEMA[id].rotulo}</h3>${agruparPassagens(c.trechos.filter(x => x.tema === id)).map(passagemHTML).join('')}</div>`).join('');
}

/* ---- endereço: #BR-05 abre a candidatura; #BR-05/saude já abre filtrada ---- */
const hashDe = () => `#${atual.c.id}${atual.tema !== 'todos' ? '/' + atual.tema : ''}`;
function lerHash(){
  const m = /^#([A-Z]{2}-\d{2})(?:\/([a-z]+))?$/.exec(location.hash);
  return m && CANDS.some(c => c.id === m[1]) ? {id:m[1], tema:m[2] || 'todos'} : null;
}
/* fade ao esconder: espera a animação terminar antes de fechar o <dialog> */
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
  centralizar(fil.querySelector('[aria-pressed="true"]'));
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
body.addEventListener('click', e => {
  const m = e.target.closest('.tr-mais');
  if(m){
    const aberto = m.closest('.tr').classList.toggle('aberto');
    m.setAttribute('aria-expanded', aberto);
    m.textContent = aberto ? 'Recolher parágrafo' : 'Ver parágrafo completo';
    fecharPop(); return;
  }
  const b = e.target.closest('.selo'); if(b) abrirPop(b);
});
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

/* ---- dialog genérico de documento (metodologia / nota técnica): o texto mora nas páginas metodologia/ e nota-tecnica/ ---- */
const PAGINAS_DOC = {metodologia:'metodologia/', 'nota-tecnica':'nota-tecnica/'};
const cacheDoc = {};
async function carregarDoc(chave){
  if(cacheDoc[chave]) return cacheDoc[chave];
  const url = new URL(PAGINAS_DOC[chave], location.href);
  const r = await fetch(url);
  if(!r.ok) throw new Error('HTTP ' + r.status);
  const d = new DOMParser().parseFromString(await r.text(), 'text/html');
  const art = d.getElementById('doc-conteudo'), h1 = d.querySelector('h1');
  if(!art || !h1) throw new Error('página sem conteúdo');
  // o HTML vem de /metodologia/ mas é inserido na página principal: resolve caminhos relativos contra a URL de origem
  art.querySelectorAll('[src],[href]').forEach(el => {
    ['src','href'].forEach(at => {
      const v = el.getAttribute(at);
      if(v && !v.startsWith('#')) el.setAttribute(at, new URL(v, url).href);
    });
  });
  return cacheDoc[chave] = {titulo: h1.textContent, corpo: art.innerHTML};
}

const doc = $('doc');
async function abrirDoc(chave){
  let d;
  try{ d = await carregarDoc(chave); }
  catch(err){ location.href = PAGINAS_DOC[chave]; return; }   // sem fetch (ex.: file://): abre a página
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
  if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // Ctrl/Cmd+clique abre a página
  e.preventDefault();
  abrirDoc(b.dataset.doc);
});
document.addEventListener('pointerover', e => {
  const b = e.target.closest('[data-doc]'); if(b) carregarDoc(b.dataset.doc).catch(() => {});
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
  void drawer.offsetWidth;   // força o layout antes de animar (o menu fechado é display:none)
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


