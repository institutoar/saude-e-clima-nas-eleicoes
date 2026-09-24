#!/usr/bin/env python3
"""
baixar_fotos.py — baixa as fotos oficiais das 34 candidaturas direto do DivulgaCandContas (TSE).

Roda na SUA máquina (o ambiente do Claude não alcança tse.jus.br). Requer:
    pip install requests

Uso:
    python3 baixar_fotos.py

Lê candidatos.json (id, uf, protocolo, nome — já extraído da planilha da pesquisadora).
Para cada candidatura, consulta a API de detalhe do candidato (que devolve o campo
`fotoUrl` e a flag `fotoUrlPublicavel`), baixa a imagem e salva em ./saida/<id>.jpg
Gera também manifest.json com o resultado de cada um (baixado / sem foto publicável / erro),
pra você conferir de uma olhada quem ficou faltando.
"""
import json, time, sys
from pathlib import Path
import requests

AQUI = Path(__file__).parent
SAIDA = AQUI / 'saida'
SAIDA.mkdir(exist_ok=True)

ID_ELEICAO = '20322002026'  # eleições gerais 2026 — confirmado via DevTools
BASE = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; projeto-clima-saude/1.0)'}

candidatos = json.load(open(AQUI / 'candidatos.json', encoding='utf-8'))

manifest = []
for c in candidatos:
    cid, uf, protocolo, nome = c['id'], c['uf'], c['protocolo'], c['nome']
    detalhe_url = f"{BASE}/candidatura/buscar/2026/{uf}/{ID_ELEICAO}/candidato/{protocolo}"
    status = {'id': cid, 'nome': nome}
    try:
        r = requests.get(detalhe_url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()
        foto_url = data.get('fotoUrl')
        publicavel = data.get('fotoUrlPublicavel')
        if not foto_url:
            status.update(ok=False, motivo='sem fotoUrl na resposta')
        elif publicavel is False:
            status.update(ok=False, motivo='fotoUrlPublicavel = false (candidato pediu pra não divulgar)')
        else:
            img = requests.get(foto_url, headers=HEADERS, timeout=30)
            img.raise_for_status()
            ct = img.headers.get('Content-Type', '')
            ext = '.png' if 'png' in ct else '.jpg'
            destino = SAIDA / f'{cid}{ext}'
            destino.write_bytes(img.content)
            status.update(ok=True, arquivo=destino.name, bytes=len(img.content))
            print(f'{cid:7s} {nome:30s} OK  -> {destino.name} ({len(img.content)} bytes)')
    except requests.HTTPError as e:
        status.update(ok=False, motivo=f'HTTP {e.response.status_code}')
    except Exception as e:
        status.update(ok=False, motivo=str(e))
    if not status.get('ok'):
        print(f'{cid:7s} {nome:30s} FALHOU  -> {status.get("motivo")}')
    manifest.append(status)
    time.sleep(0.6)  # não martelar o servidor do TSE

json.dump(manifest, open(AQUI / 'manifest.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ok = sum(1 for m in manifest if m.get('ok'))
print(f'\n{ok} de {len(manifest)} fotos baixadas em {SAIDA}/. Detalhes em manifest.json.')
