# Clima e Saúde nas Eleições — Instituto Ar

Site one-page com data viz analisando propostas de clima/saúde nos programas de governo
de 34 candidaturas (Presidência, SP, RS, MA). Este repositório **é a versão de produção**
do site: HTML/CSS/JS estático puro, sem build step, publicado por upload manual.

## Estrutura

- `site/index.html` — marcação da página.
- `site/styles.css` — todo o CSS.
- `site/app.js` — toda a lógica (accordion animado, filtros, popups, drawer mobile,
  destaque de termo nos trechos, contagem animada dos números).
- `site/dados.js` — os 827 trechos + metadados das 34 candidaturas. Define
  `window.DADOS`. Gerado a partir de uma planilha-fonte (ver `dados/`), não editar
  os números à mão sem recalcular a partir dela.
- `site/fotos/` — as 34 fotos oficiais (TSE), nomeadas por id de candidatura
  (`BR-01.jpg` etc.). Path relativo usado em `dados.js` (`foto: "fotos/BR-01.jpg"`).
- `site/metodologia/index.html` e `site/nota-tecnica/index.html` — páginas individuais dos dois
  documentos. **São a fonte única do texto**: o popup da página principal busca o conteúdo delas
  (`fetch`), então não existe cópia do texto em `app.js` nem em `index.html`. Editar o texto = editar
  o `<article id="doc-conteudo">` da página correspondente. Não carregam `app.js`.
- `site/icons/` — favicons (32px, 16px) e apple-touch-icon (180px), referenciados pelas três páginas.
- `dados/`, `documentos/` — material de pesquisa/planilhas-fonte originais. Não fazem
  parte do site publicado. Guardam só a versão vigente, com nomes estáveis (sem versão no
  nome; versões anteriores ficam no histórico do git). `documentos/interno/` está no
  `.gitignore`: documentos de trabalho com comentários da equipe, nunca commitar.

## Identidade visual (tokens em `:root`, no topo do `styles.css`)

- `--brand-ink: #17064F` (indigo) — cor de marca constante. Uso exclusivo: texto/ícone
  escuro sobre fundo de acento (anel decorativo do hero, estados ativo/hover de botões e
  links, contorno de foco). **Nunca** usar como fundo de seção.
- `--title: #15074C` (indigo, tom próprio — não é `--brand-ink`) — cor de títulos (h1–h4,
  nomes de candidatura, títulos de accordion/popup/tema) e de ícone persistente (logo,
  hambúrguer, "voltar" nas páginas de documento) sempre em Poppins **bold**. `--card`,
  `--card-2` e `--card-hover` são tingidos a partir dele via `color-mix()` (4%/4%/8%), e os
  fios/molduras abaixo (`--rule`, `--rule-strong`, `--line-control`, `--frame`, `--track`)
  também partem da sua decomposição em rgb (`21,7,76`) — nunca de `--brand-ink`.
- `--ink: #443970` — texto de corpo geral (nomes, texto de trecho, diálogos).
- `--mute: #655A87` — texto secundário/descrições.
- `--acc: #2FD4DA` (ciano) — fundo do hero e do rodapé, botões CTA padrão.
- `--card` / `--card-2` — fundo dos boxes (cards de candidatura, cards de tema, itens do
  accordion); `--card-hover` — fundo do card do accordion da intro quando o cursor está
  sobre o cabeçalho (só em dispositivos com hover). Os três são tingidos de `--title`, não
  hex fixo (ver acima).
- `--frase: #E2DAF6` — fundo (marca-texto) da frase classificada dentro do parágrafo, no popup do candidato. Não
  reaproveitar; o amarelo continua exclusivo do termo.
- `--hero-edge: #0B5663` — acento secundário pontual (hover de link no rodapé).
- `--violet: #8F76F1` — acento secundário de marca (roxo). Uso: botão "NOTA TÉCNICA",
  `.btn.violet` ("Ver metodologia"), link ativo do drawer mobile, ícone +/− do
  accordion, números grandes de "Achados principais". Token separado dos `--t-*` de
  propósito — não reaproveitar um pelo outro.
- `--t-mit` / `--t-ada` / `--t-ar` / `--t-sau` — as 4 cores de tema. Uso exclusivo:
  diferenciar os quatro eixos temáticos. Nunca reaproveitar — natureza do trecho usa
  uma escala de opacidade do brand-ink, não essas cores.
- `#FFC20E` (amarelo institucional) — uso exclusivo: `<mark>` da palavra do
  dicionário destacada no texto do trecho.
- `--stroke: 2px` — **espessura única de todo fio, contorno e ícone de traço** do site (bordas, divisórias, molduras,
  contorno de foco, SVGs com `stroke-width`). Nunca escrever largura literal (`1px`, `3px`) em `border`/`outline`/
  `stroke-width`: usar `var(--stroke)`. Os SVGs inline mantêm `stroke-width="2"` por fallback e a regra
  `svg[stroke-width]` do CSS vence o atributo. Exceção: separadores de barra (`.nat-bar-seg`) seguem o mesmo valor.
- `--rule` (12%) / `--rule-strong` (20%) — fios/divisórias decorativos; `--frame` (10%) — moldura dos cards de candidato.
  Opacidades calibradas para 2px (a 1px eram 15/25/8%).
- `--line-control` (48%) — contorno de controles e tags pequenos (botões, pills, siglas, popup). Fica em ≥ 3:1
  sobre branco e sobre `--card` (contraste de componente, WCAG 1.4.11); a 40% dava 2,64:1. `--frame` — borda suave dos cards de candidato. Não criar novas
  opacidades soltas de `rgba(21,7,76,...)` em bordas: usar um desses tokens.

Tipografia: Poppins pra tudo. Corpo em `font-weight:500` por padrão; títulos (a lista de
seletores do `--title` acima) em **bold (700)**, pro peso gráfico. Border-radius
padronizado em **24px** em cards, diálogos e caixas (`.card`, `.tema`, `.acc-item`, `.dlg`,
`.matriz-item`, `.pop`); botões e controles pequenos (`.btn`, `.nav-cta`, `.sigla`,
`.selo`, `.selo-tag`, `.filters button`, `.share a/button`) em **pílula** (`999px`);
círculo só em elementos genuinamente circulares (avatar, `.scroll-cue`, `.foot-top i`).
Botões em uppercase.

## Componentes/padrões importantes

- **Accordion da intro**: modo "box", animação via **Web Animations API** medindo
  altura real em JS — não usar `grid-template-rows` animado.
- **Destaque de termo nos trechos**: cada trecho em `dados.js` tem `inicio`/`fim`
  (índices de caractere). Nunca re-buscar a palavra por regex/string match — os
  índices já vêm validados da planilha-fonte.
- **Trechos no popup do candidato** (`agruparPassagens`/`passagemHTML` em `app.js`): trechos do mesmo tema **e da
  mesma natureza** que dividem o mesmo parágrafo viram um cartão só (todos os termos destacados; agrupar por
  natureza evita misturar frases de naturezas diferentes sob os mesmos selos). O cabeçalho diz
  "N trechos · M passagens" quando M < N (passagem = parágrafo distinto). Exibição em três níveis: parágrafo
  inteiro em cor normal, **frase classificada com fundo lilás** (`.frase`, token `--frase`), termo em amarelo
  (`<mark>`). Cartão **sem fundo** = a frase classificada não é localizável (ou o trecho é só o fragmento
  registrado); nunca afirmar qual frase foi classificada quando não se sabe. Parágrafos acima de 1.200
  caracteres abrem recolhidos, só com o entorno da frase ("Ver parágrafo completo"); o texto escondido usa
  `display:none`, então a busca do navegador não o encontra até expandir. Uma linha no topo explica o fundo
  lilás e avisa que a transcrição é literal do PDF (redação provisória, a confirmar com a equipe).
- **Popups**: dois `<dialog>` nativos. `#cand` (candidato) é linkável por hash na URL. `#doc`
  (Metodologia/Nota técnica) é aberto por links `<a href="metodologia/" data-doc="metodologia">`: clique
  simples abre o popup com o texto buscado da página; Cmd/Ctrl+clique, sem JavaScript ou `fetch`
  indisponível (ex.: `file://`) abrem a página. Ao adicionar um link novo pra um documento, usar esse
  mesmo padrão (`href` + `data-doc`) e, se ele ficar dentro de `.nav`/`.drawer`, conferir que as regras de
  link (`.nav a`, `.drawer a`) não vazam pro visual (ver `a.nav-cta`).
- **Colunas alinhadas entre seções**: usar `calc()` referenciando `--container`/`--pad`
  diretamente, não porcentagem simples (porcentagem num item de grid resolve contra a
  área do próprio item, não o container inteiro).
- **Card de candidato**: todos com a mesma altura. Desktop/tablet: 404px. Celular (≤560px): layout
  compacto (foto ao lado do nome) com altura fixa em degraus (210px; 234px até 354px de largura;
  258px até 329px). Os degraus foram medidos pelo pior caso (nome mais longo + 4 temas); se o
  conteúdo do card mudar, remedir em 320–560px antes de manter esses valores.
- **Rodapé**: grid de 3 colunas (`.foot-grid`); mobile usa `display:contents` + `order`.
- **Menu mobile**: hamburguer + drawer lateral abaixo de 820px.

## Dados

827 trechos, 34 candidaturas (base de 26/09/2026, corte do corpus 22/09; dicionário v3.3). IDs seguem
`{BR|SP|RS|MA}-{ordem:02d}` e vêm de `dados/fotos/candidatos.json` (lista-mestra que também amarra fotos e
links `#BR-05`); a base não traz mais a ordem de registro. Cada trecho:
`{id, tema, natureza, pagina, termo, texto, inicio, fim, fraseInicio, fraseFim, origem, metaQuantificada}`.
- `texto` é o **parágrafo** do plano (não mais uma janela de 260 caracteres); `inicio`/`fim` são o termo do
  dicionário dentro dele.
- `fraseInicio`/`fraseFim`: a frase que foi de fato classificada, dentro do parágrafo (para a exibição em
  três níveis). Calculada por `tratar_dados.py`; é `null` quando a frase não é localizável (64 casos) e nos
  36 trechos com `origem: 'fragmento'` (o texto exibido é o fragmento registrado, não o parágrafo).
- `metaQuantificada`: texto da meta, ou `null`. Vale em 6 trechos.
- Naturezas: `proposta` (Compromisso), `diagnostico` (Relato), `mencao` (Citação); "Contrário" existe com
  valor **0** — é resultado de pesquisa, não ausência de dado.
O dicionário de recuperação está em `dados/dicionario.xlsx` (v3.3) e a base em
`dados/entrada/base_de_dados.xlsx`. `oficial.*` do `dados.js` vem da aba `resumo_geral` (fonte única dos números).

**Redação de ausência** (regra da base): "não localizamos menção". Nunca afirmar o que a candidatura pensa
ou ignora. Vale para o cartão e o popup dos 7 planos sem menção.

**Definições dos selos** (`SELOS` em `app.js`) e o texto de `site/metodologia/` são a Nota Metodológica v5.0
(`documentos/Nota_Metodologica.docx`): ao mudar uma, mude a outra.

### Pendências conhecidas (não resolver sozinho sem confirmar — perguntar primeiro)

- Aba `graficos` da base de 26/09 (agora atualizada, com os números novos) descreve 7 gráficos de
  barras horizontais (G01–G07) e 3 tabelas (T01–T03) como "figuras do site", e diz que "verde e vermelho não
  são usados na exibição de dados". **Nenhum deles está implementado** e o site usa verde em Adaptação
  (`--t-ada`). Perguntar à equipe se os gráficos entram e se a regra de cores vale para os temas.
- Situação de registro por candidatura: a base de 26/09 não traz. `INDEFERIDAS` em
  `dados/tratar_dados.py` lista à mão as 4 candidaturas indeferidas com recurso pendente (PCO no RS, em SP
  e no MA, e PRTB no MA); as datas das três primeiras são da entrega anterior e a de MA-07 não tem data.
  Confirmar com a equipe antes de mudar.
- Os 6 números de "Achados principais" (`#numeros`) são **texto fixo no JS** (array
  `NUMS` em `app.js`), vindos da Correção da Nota (seção 4), sem linha de base e sem nota abaixo (removidas de
  propósito: repetiam o que as frases já dizem). Se algum dia fizer sentido automatizar os números, mapear
  cada um pro campo correspondente em `oficial.*` (arredondar com `Math.round`).

## Convenções de trabalho

- Mudanças de CSS/JS: editar direto `site/styles.css` / `site/app.js` — não há build
  step.
- Ao testar localmente, abrir com um servidor estático (`npx serve site`), não por
  `file://` direto — alguns navegadores restringem `fetch`/módulos nesse modo.
- Mudanças visuais (CSS, layout, componentes) devem ser verificadas num navegador antes
  de serem consideradas prontas — não validar só lendo o código.
- Antes de mudanças grandes de paleta/tipografia, checar se o valor já existe como
  variável em `:root`.
