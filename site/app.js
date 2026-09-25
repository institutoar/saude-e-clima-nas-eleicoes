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
      <p class="doc-subtitulo">Diretrizes para Avaliação de Planos de Governo nas Agendas de Clima, Ar e Saúde</p>

      <h3>Introdução</h3>
      <p>No Brasil, os impactos do aquecimento global já se manifestam de forma aguda e transversal. Secas históricas na bacia amazônica, inundações devastadoras no Sul e ondas de calor prolongadas nos grandes centros urbanos expõem a vulnerabilidade da infraestrutura das cidades e sobrecarregam o Sistema Único de Saúde (SUS) (OPAS, 2023; IPCC, 2022). Além dos danos diretos, às alterações nos padrões de temperatura e precipitação afetam a economia, a segurança alimentar e expandem a distribuição geográfica de vetores de doenças, como o <em>Aedes aegypti</em> (Romanello et al., 2023).</p>
      <p>Paralelamente, o país enfrenta uma crise silenciosa impulsionada pela poluição do ar. A queima de combustíveis fósseis nos centros urbanos e o aumento exponencial das queimadas em biomas como a Amazônia, o Cerrado e o Pantanal geram uma carga altíssima de material particulado fino (MP2,5). Essa exposição está diretamente associada ao aumento de internações por doenças respiratórias e cardiovasculares, atingindo de forma desproporcional crianças, idosos e comunidades de baixa renda (Alves et al., 2022). Fica evidente, portanto, que a justiça climática é, intrinsecamente, uma questão de equidade social e de saúde.</p>
      <p>Diante desse cenário, o objetivo desta Nota Técnica é fornecer à sociedade um referencial analítico rigoroso. Em um ano de eleição no qual muitos planos de governo buscam endereçar soluções para saúde e meio ambiente de maneira reativa e com pouco embasamento técnico, quais seriam os parâmetros para um plano de governo ideal?</p>
      <p>Ao delinear o que se deve exigir de propostas baseadas em evidências, este documento estrutura-se em quatro eixos indissociáveis: Adaptação, Mitigação, Poluição do Ar e Impactos na Saúde. Utilizando exemplos reais extraídos dos próprios planos de 2026 analisados pelo Instituto Ar, apresentamos Matrizes de Avaliação para distinguir abordagens genéricas de políticas públicas, integradas e orientadas pela ciência.</p>

      <h3>Tema 1: Adaptação e Eventos Extremos</h3>
      <p>A adaptação climática consiste em preparar o território, a economia e as instituições para absorver choques agudos (enchentes, deslizamentos) e estresses crônicos (secas, ondas de calor), garantindo a proteção da vida e a continuidade dos serviços essenciais. Como demonstra o levantamento dos planos de governo, a visão atual dos políticos ainda é puramente reativa, focada na resposta ao desastre. Um bom plano de governo deve transcender o "apagar incêndios" e focar na resiliência sistêmica, estruturando-se nos seguintes pilares:</p>
      <p><strong>Planejamento Urbano e Infraestrutura Verde:</strong> A adaptação começa no território. Planos robustos preveem a realocação digna de famílias em áreas de risco, investimentos em macrodrenagem e a adoção de Soluções Baseadas na Natureza (SBN), como "cidades-esponja", parques lineares e recuperação de matas ciliares para conter inundações.</p>
      <p><strong>Defesa Civil e Sistemas de Alerta Precoce:</strong> A Defesa Civil deve ser modernizada e operar de forma integrada com as secretarias de infraestrutura, meio ambiente e saúde. A ciência demonstra que sistemas de alerta precoce reduzem significativamente os danos físicos e traumas psicológicos, desde que a população receba o aviso com tempo hábil para agir e saiba rotas de evacuação (Hookway et al., 2024).</p>
      <p><strong>Resiliência de Serviços Essenciais (Hospitais Seguros):</strong> Instalações de saúde e de abastecimento frequentemente colapsam durante desastres por falta de energia ou água. É fundamental prever a adaptação física de hospitais e postos de saúde (retrofitting), garantindo geradores de energia de backup (preferencialmente renováveis) e sistemas de contingência hídrica.</p>
      <p><strong>Planos de Ação contra o Calor:</strong> O calor extremo é o desastre climático que mais mata de forma silenciosa. Planos de governo precisam prever gatilhos claros, baseados em índices meteorológicos, para acionar a rede de saúde e a assistência social antes que as emergências lotem, incluindo a criação de "centros de resfriamento" (Dwyer et al., 2022).</p>

      <p class="matriz-titulo">Matriz de Avaliação de Políticas Públicas: Adaptação e Eventos Extremos</p>
      <div class="matriz">
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Defesa Civil e Planejamento</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Modernizaremos ainda mais as estruturas do Corpo de Bombeiros, do Policiamento Ambiental, da Defesa Civil..."</em> (Foco restrito ao aparelhamento do órgão de resposta).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Prevenção Financiada:</strong> Fortalecimento do Plano de Adaptação, dotando a Defesa Civil de tecnologia preditiva e orçamento carimbado para prevenção e mitigação de riscos, não apenas para resposta a desastres. (Referência: Marco de Sendai para a Redução do Risco de Desastres, UNDRR, 2015)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Infraestrutura Urbana e Habitação</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"A reconstrução das cidades exige não apenas recompor moradias perdidas, mas também reduzir vulnerabilidades futuras..."</em> (Diagnóstico correto, porém desprovido de instrumentos de execução).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Resiliência Territorial:</strong> Mapeamento contínuo de áreas de risco, investimento em drenagem sustentável (SBN) e garantia de habitação segura atrelada a fundos climáticos. (Referência: IPCC, Relatório do Grupo de Trabalho II - Adaptação e Vulnerabilidade, 2022)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Infraestrutura de Saúde (Hospitais Seguros)</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"As enchentes de 2024 mostraram que adaptação climática deve ser política permanente de Estado."</em> (Constatação do desastre sem diretriz setorial).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Continuidade de Serviços:</strong> Financiamento para a adaptação climática de hospitais e UBSs, garantindo autonomia de energia e contingência hídrica durante eventos extremos. (Referência: OPAS/OMS, 2021; Ansah et al., 2024)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Sistemas de Alerta e Ondas de Calor</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Preparar áreas urbanas para enchentes, deslizamentos, calor extremo..."</em> (Menção em lista de zeladoria urbana).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Alertas em Saúde Pública:</strong> Integração de dados meteorológicos (CEMADEN) ao SUS para criar Sistemas de Alerta Multirrisco e formulação de Planos de Ação contra o Calor (Heat Action Plans) com protocolos clínicos claros. (Referências: Hookway et al., 2024; Dwyer et al., 2022)</dd></div>
          </dl>
        </div>
      </div>
      <p class="doc-nota-metodo"><em>Nota: Os trechos entre aspas e itálico foram retirados de planos de governo reais.</em></p>

      <p>É fundamental ressaltar que a formulação de políticas públicas eficientes não exige a reinvenção institucional. O Estado brasileiro já dispõe de programas estruturantes desenhados para este fim, como o VigiDesastres (Programa Nacional de Vigilância em Saúde dos Riscos Associados aos Desastres) e o VigiAgua (Vigilância da Qualidade da Água).</p>
      <p>O diferencial de uma proposta política robusta reside no compromisso de financiar, modernizar e integrar essas iniciativas existentes, dotando-as de tecnologia para operar de forma preditiva. Promessas que propõem a criação de estruturas inteiramente novas, ignorando o histórico e a capacidade instalada do SUS e do Sistema Nacional de Proteção e Defesa Civil, devem ser avaliadas com ceticismo, pois frequentemente configuram ações de marketing político descoladas da viabilidade técnica.</p>

      <h3>Tema 2: Mitigação Climática</h3>
      <p>A mitigação climática refere-se aos esforços estruturais para reduzir ou prevenir a emissão de gases de efeito estufa (GEE) e transformar a matriz econômica do Estado. No levantamento dos planos de governo, a mitigação raramente aparece sozinha; ela costuma vir atrelada à adaptação, muitas vezes limitada a promessas genéricas de "energia limpa" ou "sustentabilidade".</p>
      <p>Um plano de governo moderno deve tratar a mitigação não como um custo ambiental, mas como uma estratégia de desenvolvimento econômico que gera co-benefícios imediatos em saúde pública. Reduzir a queima de combustíveis fósseis, por exemplo, não apenas esfria o planeta a longo prazo, mas limpa o ar das cidades e reduz internações hospitalares hoje.</p>
      <p>Para avaliar o compromisso real de uma candidatura com a mitigação, o eleitor deve buscar propostas estruturadas nos seguintes pilares:</p>
      <p><strong>Uso da Terra e Desmatamento Zero:</strong> No Brasil, o desmatamento e a mudança no uso da terra são os maiores motores de emissões. Um plano robusto deve apresentar metas inegociáveis para zerar o desmatamento ilegal, propondo o aparelhamento dos órgãos de fiscalização, uso de inteligência artificial e satélites para monitoramento, além de fomento à bioeconomia e à recuperação de áreas degradadas.</p>
      <p><strong>Transição Energética e Mobilidade Ativa:</strong> É fundamental que o plano preveja a redução progressiva de combustíveis fósseis e a eletrificação do transporte público e de carga. Além disso, o incentivo à mobilidade ativa (ciclovias, calçadas seguras) é o exemplo perfeito de co-benefício: zera emissões de carbono e combate o sedentarismo, prevenindo doenças cardiovasculares e obesidade.</p>
      <p><strong>A Descarbonização da Máquina Pública:</strong> O que poucas pessoas sabem é que o setor de saúde global é um grande poluidor: se fosse um país, seria o quinto maior emissor de carbono do mundo (OMS, 2023). Hospitais funcionam 24 horas, consomem muita energia e geram toneladas de resíduos. O governo deve usar seu poder de compra (licitações) para exigir práticas sustentáveis de seus fornecedores.</p>
      <p>Exigir a descarbonização da máquina pública não é utopia. O Serviço Nacional de Saúde do Reino Unido (NHS) tornou-se o primeiro do mundo a se comprometer a zerar suas emissões, eletrificando frotas e substituindo gases anestésicos altamente poluentes (Tennison et al., 2021). O Brasil possui uma vantagem comparativa: a capilaridade da nossa Atenção Primária à Saúde e dos Agentes Comunitários de Saúde (ACS). O SUS já possui a rede humana ideal para implementar ações climáticas na ponta; falta apenas o compromisso político para unir essa força às metas de baixo carbono.</p>

      <p class="matriz-titulo">Matriz de Avaliação de Políticas Públicas: Mitigação Climática</p>
      <div class="matriz">
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Transição Energética</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Incentivar projetos de transição energética e desenvolver um cluster estadual de descarbonização..."</em> (Falta cronograma e integração setorial).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Metas quantificáveis:</strong> Cronograma para eletrificação da frota de transporte público e expansão de infraestrutura para mobilidade ativa, quantificando os cobenefícios em saúde (redução de sedentarismo e emissões). (Referência: The Lancet Countdown on Health and Climate Change, Romanello et al., 2023)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Descarbonização da Máquina Pública</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"A transformação ecológica continuará a ser parte estruturante do crescimento..."</em> (Declaração de intenção sem instrumento de execução).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Compras Públicas Sustentáveis:</strong> Inclusão de critérios de sustentabilidade nas licitações do Estado (Escopo 3) e instalação de painéis solares em hospitais e escolas, garantindo eficiência e resiliência energética. (Referência: Carbon Footprint Assessment of the NHS, Tennison et al., 2021)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Uso da Terra e Florestas</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Promover a conservação dos solos, visando reduzir os processos erosivos..."</em> (Foco restrito ao impacto local).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Desmatamento Ilegal Zero:</strong> Metas inegociáveis de controle do desmatamento via monitoramento por satélite (INPE), integradas a políticas de bioeconomia e mercado de carbono regulado. (Referência: Relatório Anual do MapBiomas, 2024)</dd></div>
          </dl>
        </div>
      </div>
      <p class="doc-nota-metodo"><em>Nota: Os trechos entre aspas e itálico foram retirados de planos de governo reais.</em></p>

      <p>Ao analisar essas propostas, a população pode observar se o candidato enxerga a sustentabilidade não como um "gasto extra", mas como um investimento inteligente. Hospitais que geram sua própria energia solar, por exemplo, não apenas deixam de poluir, mas também se tornam mais resilientes a apagões e liberam recursos financeiros que podem ser reinvestidos no atendimento direto ao paciente.</p>

      <h3>Tema 3: Poluição do Ar</h3>
      <p>A poluição do ar é um dos maiores riscos ambientais para a saúde humana no mundo. No Brasil, enfrentamos duas grandes ameaças: a poluição crônica nos grandes centros urbanos, impulsionada pela queima de combustíveis fósseis nos transportes e emissões industriais, e a poluição aguda causada pela fumaça das queimadas em biomas como a Amazônia, o Cerrado e o Pantanal.</p>
      <p>A exposição ao material particulado fino (MP2,5) presente na fumaça e no escapamento de veículos penetra profundamente nos pulmões e na corrente sanguínea, causando picos de asma, doenças pulmonares obstrutivas crônicas (DPOC), infartos e derrames (Oliveira et al., 2011).</p>
      <p>Para avaliar as propostas neste eixo, a sociedade civil deve observar os seguintes pontos fundamentais:</p>
      <p><strong>Queimadas como Fonte de Poluição:</strong> O governo não pode ser pego de surpresa todos os anos durante a época de seca. As queimadas florestais e agrícolas são fontes massivas de PM2,5. O plano de governo deve apresentar ações coordenadas para monitorar, prevenir e punir o uso ilegal do fogo, mitigando a fumaça que encobre cidades e estados inteiros. Além disso, o SUS precisa ter protocolos claros de contingência, garantindo estoques de medicamentos respiratórios, oxigênio e reforço nas equipes de telemedicina para evitar que populações vulneráveis precisem se deslocar sob ar tóxico.</p>
      <p><strong>Monitoramento Integrado (MonitorAr + VigiAr):</strong> O Brasil já conta com o programa MonitorAr (do Ministério do Meio Ambiente), que consolida os dados de qualidade do ar. No entanto, a rede de sensores físicos ainda é muito concentrada no Sudeste. Um bom plano de governo deve propor a expansão das estações de monitoramento para todo o país (especialmente nas regiões Norte e Centro-Oeste) e fortalecer a integração em tempo real desses dados com o VigiAr (do Ministério da Saúde), gerando alertas automáticos para a população (ex: recomendação para suspender aulas ou atividades físicas ao ar livre).</p>
      <p><strong>Controle de Fontes Fixas e Móveis:</strong> Implementação de políticas rigorosas de controle de emissões industriais (fontes fixas) e renovação da frota veicular (fontes móveis). Propostas de eletrificação de frotas de ônibus e criação de infraestrutura para ciclistas e pedestres devem ser tratadas e financiadas também como intervenções de saúde pública, pois reduzem a poluição e combatem o sedentarismo.</p>

      <p class="matriz-titulo">Matriz de Avaliação de Políticas Públicas: Qualidade do Ar</p>
      <div class="matriz">
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Monitoramento e Legislação</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Implantar uma rede permanente de monitoramento da qualidade do ar."</em> (Proposta válida, mas isolada de marcos legais e de saúde).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Adesão à Lei 14.850/2024:</strong> Expansão da rede de sensores físicos do sistema MonitorAr e estabelecimento de metas progressivas de redução de MP2,5 e Ozônio, alinhadas às diretrizes da OMS (2021). (Referências: Lei nº 14.850/2024; WHO Global Air Quality Guidelines, OMS, 2021)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Vigilância em Saúde</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"A combinação dessas fontes de emissão pode agravar a poluição atmosférica... tornando indispensável o monitoramento."</em> (Diagnóstico sem ação de resposta).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Integração de Dados:</strong> Integração em tempo real dos dados ambientais com o programa VigiAr (Ministério da Saúde), gerando alertas automáticos de saúde pública para a população em dias de poluição crítica. (Referência: Diretrizes Nacionais da Vigilância em Saúde Ambiental, Ministério da Saúde)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Queimadas e Contingência</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Renovar progressivamente a frota com veículos... menos poluentes."</em> (Foco apenas na fonte móvel urbana).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Protocolos de Emergência:</strong> Garantia de estoques estratégicos no SUS (oxigênio, broncodilatadores) e expansão da telemedicina para proteger populações vulneráveis durante picos de fumaça de incêndios florestais. (Referência: Alves et al., 2022)</dd></div>
          </dl>
        </div>
      </div>
      <p class="doc-nota-metodo"><em>Nota: Os trechos entre aspas e itálico foram retirados de planos de governo reais.</em></p>

      <p>Ao ler os planos de governo, o eleitor deve ser crítico: se o candidato promete melhorar a saúde respiratória, mas ao mesmo tempo incentiva o desmatamento ou ignora o transporte público limpo, ele apresenta uma inconsistência, pois a saúde humana e a saúde ambiental são inseparáveis.</p>

      <h3>Tema 4: Impactos do Clima na Saúde</h3>
      <p>A mudança climática está redesenhando o mapa das doenças no Brasil. O aumento das temperaturas médias e as alterações nos padrões de chuva criaram o ambiente perfeito para que vetores de doenças, como o mosquito <em>Aedes aegypti</em>, expandam seus territórios. O resultado prático já é visível: estados da região Sul do Brasil, que historicamente tinham poucos casos de dengue, passaram a enfrentar epidemias severas, e os surtos, que antes se concentravam no verão, agora ocorrem quase o ano todo (Barcellos et al., 2024).</p>
      <p>Além das arboviroses (dengue, zika, chikungunya, febre oropouche), o desequilíbrio ambiental e a invasão de habitats aumentam o risco de zoonoses (doenças transmitidas de animais para humanos) e doenças de veiculação hídrica (como leptospirose e cólera) após enchentes extremas.</p>
      <p>Para lidar com esse cenário dinâmico, o SUS não pode mais depender apenas de olhar para o retrovisor (contar os casos que já aconteceram). Um bom plano de governo deve propor um sistema de saúde que olhe para o para-brisa, antecipando os surtos. O eleitor deve avaliar as propostas com base em três pilares:</p>
      <p><strong>Vigilância Epidemiológica Preditiva:</strong> O governo deve propor a integração dos dados de saúde (DataSUS) com modelos climáticos e meteorológicos. Como apontado pela OMS (2023) e por estudos globais de adaptação (Ansah et al., 2024), cruzar dados de temperatura e umidade com a vigilância genômica permite prever onde e quando o próximo surto ocorrerá, semanas antes de os hospitais lotarem.</p>
      <p><strong>Controle de Vetores Sustentável e Inovador:</strong> Prometer apenas "mais carros de fumacê" é uma resposta ultrapassada, que gera resistência nos mosquitos e agride o meio ambiente. Planos de governo modernos devem investir em biotecnologia (como a expansão do método Wolbachia ou mosquitos estéreis) e no manejo ambiental integrado, com forte participação comunitária.</p>
      <p><strong>Capacidade de Resposta Rápida:</strong> O sistema de saúde precisa de agilidade para realocar recursos. Se o perfil epidemiológico de uma região muda subitamente, o plano de governo deve prever mecanismos ágeis para mobilizar tendas de hidratação, leitos, vacinas e testes diagnósticos rápidos para as áreas afetadas.</p>

      <p class="matriz-titulo">Matriz de Avaliação de Políticas Públicas: Saúde e Clima</p>
      <div class="matriz">
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Vigilância Epidemiológica</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"As mudanças climáticas e os eventos extremos acrescentaram novos desafios à saúde pública, exigindo maior capacidade de vigilância..."</em> (Diagnóstico passivo).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Vigilância Preditiva:</strong> Cruzamento de dados do DataSUS com modelos climáticos (INPE/CEMADEN) para antecipar surtos de arboviroses e zoonoses, permitindo alocação prévia de recursos. (Referência: Barcellos et al., 2024 - Expansão territorial da dengue)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Capacidade de Resposta</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"Integrar saúde indígena e ribeirinha, vigilância epidemiológica e cuidado relacionado a doenças tropicais... e eventos climáticos."</em> (Boa intenção, sem mecanismo logístico).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Logística de Emergência:</strong> Mecanismos ágeis para mobilização de leitos, tendas de hidratação e insumos diante de picos climáticos (ex: ondas de calor ou inundações), conforme preconizado pelo AdaptaSUS. (Referência: Programa AdaptaSUS, Ministério da Saúde, 2024)</dd></div>
          </dl>
        </div>
        <div class="matriz-item">
          <dl class="matriz-fields">
            <div class="matriz-row"><dt class="matriz-label">Dimensão da Política</dt><dd class="matriz-dim">Controle de Vetores e Saúde Única</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Abordagem Identificada nos Planos (Exemplos do Corpus)</dt><dd class="matriz-plano"><em>"O aquecimento global gera não só riscos à saúde dos humanos como à sobrevivência de muitas espécies..."</em> (Constatação genérica).</dd></div>
            <div class="matriz-row"><dt class="matriz-label">Diretriz Baseada em Evidências</dt><dd class="matriz-diretriz"><strong>Abordagem Saúde Única:</strong> Investimento em biotecnologia (ex: método Wolbachia) e manejo ambiental integrado, superando o uso exclusivo de controle químico (fumacê), que gera resistência vetorial e dano ambiental. (Referência: OMS, 2025)</dd></div>
          </dl>
        </div>
      </div>
      <p class="doc-nota-metodo"><em>Nota: Os trechos entre aspas e itálico foram retirados de planos de governo reais.</em></p>

      <p>Ao avaliar este eixo, o eleitor deve ter em mente que a mudança do clima mudou também a forma de enfrentamento das doenças. Candidatos que apresentam as mesmas soluções das décadas passadas para combater doenças não estão preparados para proteger a população no cenário climático atual.</p>

      <h3>O "Super El Niño" e o Desafio Crítico para o SUS</h3>
      <p>Ao avaliar os planos de governo, o eleitor deve ter em mente que o próximo governante não terá tempo para planejar a longo prazo antes de enfrentar sua primeira grande crise. A previsão de um "Super El Niño" ainda nesse ano de 2026 representa um desafio imediato para a resiliência do Sistema Único de Saúde (SUS).</p>
      <p>Embora o El Niño seja um fenômeno natural (caracterizado pelo aquecimento anormal das águas do Oceano Pacífico), a mudança climática global atua como um "combustível", tornando seus efeitos muito mais intensos, frequentes e destrutivos (IPCC, 2022; OMM, 2024). No Brasil, um Super El Niño tem impactos geográficos muito bem conhecidos, que exigem respostas rápidas e regionalizadas da saúde pública:</p>
      <p><strong>Norte e Nordeste (Seca Extrema e Fumaça):</strong> O fenômeno agrava severamente a seca na Amazônia e no Nordeste. Para a saúde, isso significa um aumento explosivo nas queimadas — sobrecarregando o SUS com doenças respiratórias (Alves et al., 2022) — e a escassez de água potável, que eleva os casos de desnutrição e doenças diarreicas.</p>
      <p><strong>Sul e Sudeste (Chuvas e Inundações):</strong> O oposto ocorre no Sul do país, com volumes de chuva muito acima da média. O sistema de saúde precisa estar preparado para o trauma imediato de enchentes e deslizamentos, além do surto posterior de doenças de veiculação hídrica, como a leptospirose (OPAS, 2023).</p>
      <p><strong>Ondas de Calor (Nacional):</strong> O El Niño eleva as temperaturas médias em quase todo o território nacional, aumentando o risco de mortalidade por estresse térmico, especialmente entre idosos, crianças e trabalhadores ao ar livre (Dwyer et al., 2022).</p>
      <p><strong>O que cobrar do candidato?</strong> Um plano de governo sério para as atuais eleições não pode ignorar esse cenário. O <em>Operational Framework</em> da OMS orienta que os sistemas de saúde integrem as previsões de El Niño/La Niña aos seus planos de gestão de emergências (OMS, 2023). O eleitor deve procurar propostas que mencionem explicitamente planos de contingência para esses ciclos climáticos. Promessas genéricas não salvarão vidas quando o fenômeno atingir seu pico; é preciso exigir orçamento emergencial pré-aprovado, reforço de insumos (como soro, oxigênio e medicamentos) e integração imediata da Defesa Civil com a rede hospitalar.</p>

      <h3>Considerações Finais</h3>
      <p>A urgência climática reconfigurou as exigências sobre a administração pública. Como demonstrado por esta Nota Técnica, a separação entre políticas de infraestrutura, meio ambiente e saúde tornou-se uma falha de governança grave. O registro sistemático evidencia que o clima ainda entra nos planos pela porta da emergência; que a saúde é ignorada como consequência direta; e que o vocabulário técnico e legal indispensável para a formulação de políticas públicas está ausente.</p>
      <p>Ausência documentada é evidência analítica. Ao avaliar um plano de governo, a imprensa, a academia e a sociedade civil dispõem agora de parâmetros claros para rejeitar promessas genéricas. É imperativo exigir propostas integradas que demonstrem domínio sobre a capacidade instalada do Estado e que proponham a execução de marcos legais já existentes, como a Lei 14.850/2024, o MonitorAr, o VigiAr e o AdaptaSUS.</p>
      <p>As eleições representam o momento de maior permeabilidade das agendas políticas. Comparações, como as aqui apresentadas, é uma forma de elevar o debate público, separando o discurso político reativo da formulação de políticas públicas baseadas em evidências, equidade e resiliência sistêmica.</p>

      <h3>Referências bibliográficas</h3>
      <ol class="doc-refs">
        <li>ANSAH, E. W. et al. (2024). Health systems response to climate change adaptation: a scoping review of global evidence. <em>BMC Public Health</em>, 24(2015). Disponível em: <a href="https://doi.org/10.1186/s12889-024-19459-w" target="_blank" rel="noopener">doi.org/10.1186/s12889-024-19459-w</a></li>
        <li>BARCELLOS, C. et al. (2024). Climate change, thermal anomalies, and the recent progression of dengue in Brazil. <em>Scientific Reports</em>, 14(5948). Disponível em: <a href="https://doi.org/10.1038/s41598-024-56044-y" target="_blank" rel="noopener">doi.org/10.1038/s41598-024-56044-y</a></li>
        <li>BRASIL. Lei nº 14.850, de 2 de maio de 2024. Institui a Política Nacional de Qualidade do Ar e dispõe sobre seus princípios, objetivos e instrumentos, bem como sobre as diretrizes relativas à gestão da qualidade do ar no território nacional. Brasília, DF: Presidência da República, [2024]. Disponível em: <a href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14850.htm" target="_blank" rel="noopener">planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14850.htm</a></li>
        <li>CAMPOS, V. N. de O. (2021). Soluções baseadas na natureza (SbN) e drenagem urbana em cidades latino-americanas: desafios para implementar soluções fluídas em ambientes rígidos. <em>Revista LABVERDE</em>, 11(1), 73-94. Disponível em: <a href="https://doi.org/10.11606/issn.2179-2275.labverde.2021.189314" target="_blank" rel="noopener">doi.org/10.11606/issn.2179-2275.labverde.2021.189314</a></li>
        <li>DWYER, I. J. et al. (2022). Evaluations of heat action plans for reducing the health impacts of extreme heat: methodological developments (2012–2021) and remaining challenges. <em>International Journal of Biometeorology</em>, 66, 1915–1927. Disponível em: <a href="https://link.springer.com/article/10.1007/s00484-022-02326-x" target="_blank" rel="noopener">link.springer.com/article/10.1007/s00484-022-02326-x</a></li>
        <li>HOOKWAY, A. et al. (2024). Exploring the effectiveness of flood early warning systems for mitigating the health impacts of flooding: a scoping review. <em>The Lancet</em>, 404(1), S18. Disponível em: <a href="https://doi.org/10.1016/S0140-6736(24)02010-5" target="_blank" rel="noopener">doi.org/10.1016/S0140-6736(24)02010-5</a></li>
        <li>Intergovernmental Panel on Climate Change [IPCC]. (2022). <em>Climate Change 2022: Impacts, Adaptation and Vulnerability</em>. Contribution of Working Group II to the Sixth Assessment Report of the IPCC. Disponível em: <a href="https://www.ipcc.ch/report/ar6/wg2/" target="_blank" rel="noopener">ipcc.ch/report/ar6/wg2</a></li>
        <li>MapBiomas. (2024). <em>Relatório Anual do MapBiomas 2024</em>. Disponível em: <a href="https://brasil.mapbiomas.org/wp-content/uploads/sites/3/2026/06/RA2024_MapBiomas_1710-4.pdf" target="_blank" rel="noopener">brasil.mapbiomas.org</a></li>
        <li>OLIVEIRA, B. et al. (2011). A systematic review of the physical and chemical characteristics of pollutants from biomass burning and combustion of fossil fuels and health effects in Brazil. <em>Cadernos de Saúde Pública</em>, 27(9), 1678-1698. Disponível em: <a href="https://doi.org/10.1590/s0102-311x2011000900003" target="_blank" rel="noopener">doi.org/10.1590/s0102-311x2011000900003</a></li>
        <li>Organização Meteorológica Mundial [OMM]. (2024). <em>State of the Global Climate</em>. Genebra: World Meteorological Organization. Disponível em: <a href="https://wmo.int/sites/default/files/2025-03/WMO-1368-2024_en.pdf" target="_blank" rel="noopener">wmo.int</a></li>
        <li>Organização Mundial da Saúde [OMS]. (2021). <em>COP26 special report on climate change and health: the health argument for climate action</em>. Genebra: World Health Organization. Disponível em: <a href="https://www.who.int/publications/i/item/9789240036727" target="_blank" rel="noopener">who.int/publications/i/item/9789240036727</a></li>
        <li>Organização Mundial da Saúde [OMS]. (2023). <em>Operational framework for building climate resilient and low carbon health systems</em>. Genebra: World Health Organization. Disponível em: <a href="https://www.who.int/publications/i/item/9789240081888" target="_blank" rel="noopener">who.int/publications/i/item/9789240081888</a></li>
        <li>Organização Mundial da Saúde [OMS]. (2025). <em>The Belém health action plan for the adaptation of the health sector to climate change</em>. Genebra: World Health Organization. Disponível em: <a href="https://www.who.int/publications/m/item/the-belem-health-action-plan-for-the-adaptation-of-the-health-sector-to-climate-change" target="_blank" rel="noopener">who.int</a></li>
        <li>Organização Pan-Americana da Saúde [OPAS]. (2025). <em>Mudança do clima na Região das Américas. Soluções de saúde resilientes aos desafios ambientais</em>. Disponível em: <a href="https://www.paho.org/pt/publicacoes/mudanca-do-clima-na-regiao-das-americas" target="_blank" rel="noopener">paho.org</a></li>
        <li>ROMANELLO, M. et al. (2023). The 2023 report of the Lancet Countdown on health and climate change: the imperative for a health-centred response in a world facing irreversible harms. <em>The Lancet</em>, 402(10419), 2346-2394. Disponível em: <a href="https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(23)01859-7/fulltext" target="_blank" rel="noopener">thelancet.com</a></li>
        <li>TENNISON, I. et al. (2021). Health care's response to climate change: a carbon footprint assessment of the NHS in England. <em>The Lancet Planetary Health</em>, 5(2), e84-e92. Disponível em: <a href="https://www.thelancet.com/journals/lanplh/article/PIIS2542-5196(20)30271-0/fulltext" target="_blank" rel="noopener">thelancet.com</a></li>
        <li>United Nations Office for Disaster Risk Reduction [UNDRR]. (2015). <em>Sendai Framework for Disaster Risk Reduction 2015-2030</em>. Escritório das Nações Unidas para a Redução do Risco de Desastres. Disponível em: <a href="https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030" target="_blank" rel="noopener">undrr.org</a></li>
      </ol>
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


