# Monitor Saúde e Clima nas Eleições

Site one-page com data viz analisando as propostas de clima e saúde nos programas de
governo de 34 candidaturas (Presidência da República e os governos de São Paulo, Rio
Grande do Sul e Maranhão) nas eleições de 2026 no Brasil.

Um projeto do [Instituto Ar](https://institutoar.org.br/).

**[Ver o site no ar →](https://saudeeclimanaseleicoes.institutoar.org.br/)**

## O que é

815 trechos extraídos dos planos de governo oficiais registrados no TSE, localizados
por um dicionário público e versionado de termos (`dados/dicionario.xlsx`)
e classificados por natureza — compromisso, relato ou citação — em quatro eixos
temáticos: mitigação climática, adaptação e eventos extremos, poluição do ar, e
impactos do clima na saúde.

O registro é descritivo, não avaliativo: o site não pontua nem ranqueia planos de
governo, é um levantamento auditável de onde e como cada plano trata desses temas —
cada trecho publicado remete a uma página e a um documento oficial. A metodologia
completa está descrita no próprio site (botões "Ver metodologia" e "Nota técnica").

## Estrutura

- `site/` — o site publicado: HTML/CSS/JS estático puro, sem build step, com a página principal e as
  páginas de `metodologia/` e `nota-tecnica/`. Ver [`CLAUDE.md`](CLAUDE.md) para arquitetura,
  identidade visual e convenções de código.
- `dados/` — planilhas-fonte da pesquisa e os scripts que geram `site/dados.js` a
  partir delas.
- `documentos/` — metodologia completa, nota metodológica e nota de defeso entregues
  pela equipe de pesquisa. Só a versão vigente fica no repositório, com nome sem versão
  (a versão está na capa de cada documento; as anteriores estão no histórico do git).
  `documentos/interno/` é material de trabalho e não vai para o git.

## Rodando localmente

```
npx serve site
```

Abra a URL que o `serve` indicar. Não abra `site/index.html` direto por `file://` —
alguns navegadores restringem `fetch`/módulos nesse modo.

## Regerando os dados

```
cd dados
python3 tratar_dados.py
```

Lê `dados/entrada/base_de_dados.xlsx` (registro, contagens e números de manchete) e
`dados/dicionario.xlsx` (lista de termos sem ocorrência), casa as candidaturas com
`dados/fotos/candidatos.json`, escreve `site/dados.js` e um relatório de verificação
(`dados/verificacao_dados.txt`). O script para com erro se um nome não casar ou se uma natureza for
desconhecida. O campo `foto` é preenchido a partir de `site/fotos/`;
`dados/fotos/baixar_fotos.py` e `aplicar_fotos.py` só são necessários para baixar fotos novas do TSE.

## Contato

contato@institutoar.com.br
