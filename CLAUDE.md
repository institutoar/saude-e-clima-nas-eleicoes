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
  parte do site publicado.

## Identidade visual (tokens em `:root`, no topo do `styles.css`)

- `--brand-ink: #15074C` (indigo) — cor de marca constante. Uso exclusivo: texto/ícone
  escuro sobre fundo de acento (hero, rodapé, botões preenchidos, estados
  ativo/hover). **Nunca** usar como fundo de seção.
- `--ink: #443970` — texto de corpo geral (nomes, texto de trecho, diálogos).
- `--mute: #655A87` — texto secundário/descrições.
- `--acc: #2FD4DA` (ciano) — fundo do hero e do rodapé, botões CTA padrão.
- `--card` / `--card-2: #F5F2FB` — fundo dos boxes (cards de candidatura, cards de
  tema, itens do accordion).
- `--card-hover: #EDE8F9` — fundo do card do accordion da intro quando o cursor está sobre o
  cabeçalho (só em dispositivos com hover).
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
- `--rule` / `--rule-strong` — fios/divisórias, 1px sólido.
- `--line-control` — contorno de controles e tags pequenos (botões, pills, siglas, popup),
  1px sólido. `--frame` — borda suave de 3px dos cards de candidato. Não criar novas
  opacidades soltas de `rgba(21,7,76,...)` em bordas: usar um desses tokens.

Tipografia: Poppins pra tudo, corpo em `font-weight:500` por padrão. Border-radius
padronizado em **4px** em todo botão/box — nada de pílula (`999px`), exceto elementos
genuinamente circulares. Botões em uppercase.

## Componentes/padrões importantes

- **Accordion da intro**: modo "box", animação via **Web Animations API** medindo
  altura real em JS — não usar `grid-template-rows` animado.
- **Destaque de termo nos trechos**: cada trecho em `dados.js` tem `inicio`/`fim`
  (índices de caractere). Nunca re-buscar a palavra por regex/string match — os
  índices já vêm validados da planilha-fonte.
- **Popups**: dois `<dialog>` nativos. `#cand` (candidato) é linkável por hash na URL. `#doc`
  (Metodologia/Nota técnica) é aberto por links `<a href="metodologia/" data-doc="metodologia">`: clique
  simples abre o popup com o texto buscado da página; Cmd/Ctrl+clique, sem JavaScript ou `fetch`
  indisponível (ex.: `file://`) abrem a página. Ao adicionar um link novo pra um documento, usar esse
  mesmo padrão (`href` + `data-doc`) e, se ele ficar dentro de `.nav`/`.drawer`, conferir que as regras de
  link (`.nav a`, `.drawer a`) não vazam pro visual (ver `a.nav-cta`).
- **Colunas alinhadas entre seções**: usar `calc()` referenciando `--container`/`--pad`
  diretamente, não porcentagem simples (porcentagem num item de grid resolve contra a
  área do próprio item, não o container inteiro).
- **Rodapé**: grid de 3 colunas (`.foot-grid`); mobile usa `display:contents` + `order`.
- **Menu mobile**: hamburguer + drawer lateral abaixo de 820px.

## Dados

827 trechos, 34 candidaturas. IDs seguem `{BR|SP|RS|MA}-{ordem:02d}`. Cada trecho:
`{tema, natureza, pagina, texto, inicio, fim}`. O dicionário de recuperação completo
está em `dados/dicionario.xlsx`.

### Pendências conhecidas (não resolver sozinho sem confirmar — perguntar primeiro)

- Aba `graficos` da planilha-fonte está desatualizada em relação ao restante da base.
  Não afeta o site hoje porque nenhum gráfico daquela aba foi implementado.
- Natureza "Contrário" existe na legenda de classificação mas nenhum trecho real está
  marcado assim ainda.
- `metaQuantificada` só existe como estatística agregada, nunca foi marcado por trecho
  individual.
- Os 6 números de "Achados principais" (`#numeros`) são **texto fixo no JS** (array
  `NUMS` em `app.js`), não calculados a partir de `dados.js`. Se algum dia fizer
  sentido automatizar isso, mapear cada número pro campo correspondente em
  `oficial.*` primeiro.

## Convenções de trabalho

- Mudanças de CSS/JS: editar direto `site/styles.css` / `site/app.js` — não há build
  step.
- Ao testar localmente, abrir com um servidor estático (`npx serve site`), não por
  `file://` direto — alguns navegadores restringem `fetch`/módulos nesse modo.
- Mudanças visuais (CSS, layout, componentes) devem ser verificadas num navegador antes
  de serem consideradas prontas — não validar só lendo o código.
- Antes de mudanças grandes de paleta/tipografia, checar se o valor já existe como
  variável em `:root`.
