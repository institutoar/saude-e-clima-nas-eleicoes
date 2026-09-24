#!/usr/bin/env python3
"""
aplicar_fotos.py — preenche o campo `foto` de cada candidatura em site/dados.js
a partir das fotos baixadas por baixar_fotos.py (pasta saida/, ex. saida/BR-01.jpg).

Não mexe em mais nada do dados.js (contagens, trechos, etc.) — só adiciona/atualiza `foto`.
Copia os arquivos de saida/ para site/fotos/ (normalizando tudo pra .jpg, já que o
Content-Type que o TSE devolve às vezes diz "png" para um arquivo que é JPEG de fato).

Uso:
    cd dados/fotos
    python3 aplicar_fotos.py
"""
import json
from pathlib import Path

AQUI = Path(__file__).parent
SAIDA = AQUI / 'saida'
SITE = AQUI.parent.parent / 'site'
DADOS_JS = SITE / 'dados.js'
FOTOS_DEST = SITE / 'fotos'
FOTOS_DEST.mkdir(exist_ok=True)

raw = DADOS_JS.read_text(encoding='utf-8')
marcador = 'window.DADOS = '
i = raw.index(marcador)
cabecalho_antigo = raw[:i]
d = json.loads(raw[i + len(marcador):-2])

candidatos = json.load(open(AQUI / 'candidatos.json', encoding='utf-8'))
ids = {c['id'] for c in candidatos}

aplicadas, faltando = [], []
for c in d['candidaturas']:
    origem = next((f for f in SAIDA.glob(f"{c['id']}.*")), None)
    if not origem:
        faltando.append(c['id'])
        continue
    destino = FOTOS_DEST / f"{c['id']}.jpg"   # normaliza extensão: bytes já são JPEG mesmo quando salvos como .png
    destino.write_bytes(origem.read_bytes())
    c['foto'] = f"fotos/{c['id']}.jpg"
    aplicadas.append(c['id'])

cab_novo = (
    '/* dados.js — GERADO por tratar_dados_v4.py a partir da planilha da pesquisadora (corte %s).\n'
    '   Não editar à mão: rode o script de novo quando chegar uma planilha nova (e depois\n'
    '   dados/fotos/aplicar_fotos.py, senão o campo foto de cada candidatura se perde).\n'
    '   As contagens (candidatura.contagens) e os trechos (candidatura.trechos) são o registro\n'
    '   OFICIAL e completo dos 827, com texto, página e natureza — aba registro_completo.\n'
    '   candidatura.foto: fotos oficiais baixadas via dados/fotos/baixar_fotos.py (API TSE/DivulgaCandContas),\n'
    '   aplicadas com dados/fotos/aplicar_fotos.py — não editar à mão. */\n'
) % d['dataCorte']
DADOS_JS.write_text(cab_novo + 'window.DADOS = ' + json.dumps(d, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')

print(f'{len(aplicadas)} fotos aplicadas em {FOTOS_DEST}/')
if faltando:
    print(f'sem foto em saida/ (ficam com avatar de iniciais): {faltando}')
