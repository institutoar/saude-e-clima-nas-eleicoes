#!/usr/bin/env python3
"""
tratar_dados.py — gera dados.js a partir da "Base de dados" entregue pela pesquisadora
(versão final de 26/09/2026; corpus fechado em 22/09/2026, dicionário v3.3).

O registro (aba `registro_completo`) tem os 827 trechos, cada um já como PARÁGRAFO do plano
(coluna `Trecho`), com as posições do termo (`Início`/`Fim`) recalculadas para esse texto.
As contagens por candidatura/tema vêm da aba `candidaturas` (27 com trechos) e da aba
`ausencias` (as 7 sem nenhuma menção); os números de manchete, da aba `resumo_geral`.

Os ids das candidaturas (BR-01, SP-02...) NÃO vêm mais da planilha: são casados por nome com
`fotos/candidatos.json`, que é a lista-mestra dos 34 (e amarra fotos e links #BR-05). Nome sem
correspondência = erro.

Além do parágrafo, cada trecho guarda a frase que foi de fato classificada (`fraseInicio`/`fraseFim`,
posições dentro do parágrafo, calculadas aqui a partir do fragmento registrado) para a exibição em
três níveis: contexto em cinza, frase registrada em cor normal, termo destacado.

Uso:
    cd dados
    python3 tratar_dados.py --entrada entrada/base_de_dados.xlsx --saida ../site/dados.js --relatorio verificacao_dados.txt
O campo `foto` é preenchido aqui a partir de site/fotos/ (baixar_fotos.py/aplicar_fotos.py só são
necessários para baixar fotos novas).
"""
import argparse, json, re, unicodedata, collections as C
from pathlib import Path
from openpyxl import load_workbook

AQUI = Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument('--entrada', default='entrada/base_de_dados.xlsx')
ap.add_argument('--dicionario', default='dicionario.xlsx')
ap.add_argument('--saida', default='../site/dados.js')
ap.add_argument('--relatorio', default='verificacao_dados.txt')
a = ap.parse_args()

wb = load_workbook(a.entrada, data_only=True)

def linhas(aba):
    """Linhas de uma aba como dicts. O cabeçalho é a primeira linha com 2+ células preenchidas
    (as abas têm notas de texto livre no topo, sempre numa célula só)."""
    rows = list(wb[aba].iter_rows(values_only=True))
    cab_i = next(i for i, r in enumerate(rows) if sum(x is not None for x in r) >= 2)
    cab = rows[cab_i]
    return [dict(zip(cab, r)) for r in rows[cab_i + 1:] if any(x is not None for x in r)]

def norm(x):
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', str(x or '')).strip())

DISPUTA_COD = {'Presidência': 'BR', 'Rio Grande do Sul': 'RS', 'São Paulo': 'SP', 'Maranhão': 'MA'}
DISPUTA_ID = {'Presidência': 'pres', 'Rio Grande do Sul': 'rs', 'São Paulo': 'sp', 'Maranhão': 'ma'}
TEMA_TELA = {
    'Mitigação climática': 'mitigacao', 'Adaptação e eventos extremos': 'adaptacao',
    'Poluição do ar': 'ar', 'Impactos do clima na saúde': 'saude',
}
TEMA_COL = {'mitigacao': 'Mitigação climática', 'adaptacao': 'Adaptação e eventos extremos',
            'ar': 'Poluição do ar', 'saude': 'Impactos do clima na saúde'}
# a planilha usa o vocabulário do site (Compromisso/Relato/Citação/Contrário); os ids de tela seguem os antigos
NATUREZA_TELA = {'Compromisso': 'proposta', 'Relato': 'diagnostico', 'Citação': 'mencao', 'Contrário': 'contrario'}

# nome de urna oficial (confirmado pelo Marcos/jornalista) — sobrepõe o nome civil da planilha,
# que a pesquisadora usa pra verificação de identidade, não necessariamente pra exibição pública
NOME_URNA = {
    'BR-01': 'Samara',
    'BR-02': 'Zema',
    'BR-06': 'Veterinário Wilson Grassi',
    'BR-08': 'Escritor Augusto Cury',
    'SP-02': 'Tarcísio',
    'RS-05': 'Zucco',
}
# registro indeferido com recurso pendente na data de corte. A base de 26/09 só declara isso em texto livre
# (notas da aba candidaturas) e não traz a situação por candidatura: as datas abaixo são as da entrega anterior.
# Para as demais, `situacao` fica None (o campo não é usado pelo site).
INDEFERIDAS = {
    'RS-07': 'Indeferido com recurso pendente (21/09/2026)',
    'SP-06': 'Indeferido com recurso pendente (20/09/2026)',
    'MA-08': 'Indeferido com recurso pendente (21/09/2026)',
}

def partido_nome(texto):
    """"UP (Samara Martins)" -> ("UP", "Samara Martins"); sem parênteses -> (texto, None)."""
    t = norm(texto).replace('†', '').strip()
    if '(' in t and t.endswith(')'):
        return t[:t.index('(')].strip(), t[t.index('(') + 1:-1].strip()
    return t, None

# ---------- resumo_geral: números de manchete (fonte única) ----------
resumo = {norm(r['Indicador']): r['Valor'] for r in linhas('resumo_geral')}
oficial = {
    'candidaturas': resumo['Candidaturas'],
    'arquivos': resumo['Arquivos PDF'],
    'paginas': resumo['Páginas por candidatura'],
    'trechos': resumo['Trechos registrados'],
    'planosComOcorrencia': resumo['Planos com ao menos um tema'],
    'planosSemOcorrencia': resumo['Planos sem nenhum tema'],
    'natureza': {
        'proposta': resumo['Compromisso'],
        'diagnostico': resumo['Relato'],
        'mencao': resumo['Citação'],
        'contrario': resumo['Contrário'],
    },
    'metaQuantificada': resumo['Trechos com meta quantificada'],
    'temas': {},  # preenchido abaixo com por_tema
    'quatroTemas': resumo['Planos que tocam os quatro temas'],
    'compromissoClimaSaude': resumo['Planos com compromisso sobre clima e saúde'],
    'verificacao': {'lidosUmAUm': resumo['Leitura humana individual'], 'porAmostra': resumo['Verificados por amostra humana']},
    'paragrafo': {'reconstruidos': resumo['Trechos com parágrafo reconstruído'],
                  'fragmentos': resumo['Trechos que mantêm o fragmento registrado'],
                  'passagens': resumo['Passagens distintas']},
}
for r in linhas('por_tema'):
    if r['Tema'] in TEMA_TELA:
        oficial['temas'][TEMA_TELA[r['Tema']]] = {'trechos': r['Trechos'], 'planos': r['Planos (de 34)']}

# ---------- 34 candidaturas: lista-mestra (candidatos.json) x planilha (candidaturas + ausencias) ----------
mestra = json.load(open(AQUI / 'fotos' / 'candidatos.json', encoding='utf-8'))
id_por_nome = {(m['uf'], norm(m['nome'])): m['id'] for m in mestra}
FOTOS = AQUI.parent / 'site' / 'fotos'

def id_da(disputa, texto):
    _, nome = partido_nome(texto)
    cid = id_por_nome.get((DISPUTA_COD[disputa], norm(nome)))
    if not cid:
        raise SystemExit(f'candidatura sem correspondência em candidatos.json: {disputa} / {texto}')
    return cid

cands, por_string = {}, {}   # id -> dict ; (disputa, texto) -> id
def nova(cid, disputa, texto, partido, contagens, total, paginas):
    sigla_txt, nome = partido_nome(texto)
    nome = NOME_URNA.get(cid, nome)
    marcador = '†' if cid in INDEFERIDAS else None
    subtitulo = (partido if nome else 'Nome a confirmar') + (' · registro em recurso' if marcador else '')
    cands[cid] = {
        'id': cid, 'disputa': DISPUTA_ID[disputa], 'ordem': int(cid.split('-')[1]),
        'nome': nome, 'sigla': sigla_txt, 'titulo': nome or partido, 'subtitulo': subtitulo,
        'foto': f'fotos/{cid}.jpg' if (FOTOS / f'{cid}.jpg').exists() else None,
        'marcador': marcador, 'situacao': INDEFERIDAS.get(cid),
        'estado': 'completo' if total else 'sem_ocorrencia',
        'contagens': {**contagens, 'total': total},
        'paginas': paginas,
        'trechos': [],
    }
    por_string[(disputa, norm(texto))] = cid

for r in linhas('candidaturas'):
    if r['Disputa'] not in DISPUTA_COD:
        continue
    cid = id_da(r['Disputa'], r['Candidatura'])
    cont = {tid: (r[col] or 0) for tid, col in TEMA_COL.items()}
    nova(cid, r['Disputa'], r['Candidatura'], r['Partido'], cont, r['Trechos'] or 0, r['Páginas'])
for r in linhas('ausencias'):
    if r['Tema'] != 'Nenhum dos quatro temas':
        continue
    for texto in r['Quais'].split(';'):
        cid = id_da(r['Disputa'], texto)
        nova(cid, r['Disputa'], texto, partido_nome(texto)[0], {tid: 0 for tid in TEMA_COL}, 0, None)
faltam_mestra = sorted({m['id'] for m in mestra} - set(cands))
if faltam_mestra:
    raise SystemExit(f'candidaturas da lista-mestra que não aparecem na planilha: {faltam_mestra}')
lista = sorted(cands.values(), key=lambda c: (['pres', 'sp', 'rs', 'ma'].index(c['disputa']), c['ordem']))

# ---------- registro_completo: os 827 trechos ----------
def localizar_frase(par, frag):
    """Posição do fragmento registrado dentro do parágrafo: (inicio, fim, 'exata'|'espacos') ou None."""
    frag = (frag or '').strip()
    if not frag:
        return None
    k = par.find(frag)
    if k >= 0:
        return k, k + len(frag), 'exata'
    # tolera diferença só de espaços/quebras: compara sem espaços e mapeia de volta
    idx = [i for i, ch in enumerate(par) if not ch.isspace()]
    plano = ''.join(par[i] for i in idx)
    alvo = ''.join(ch for ch in frag if not ch.isspace())
    k = plano.find(alvo)
    if k >= 0 and alvo:
        return idx[k], idx[k + len(alvo) - 1] + 1, 'espacos'
    return None

nao_casaram, sem_tema_valido = [], 0
frase = C.Counter(); frase_falhou = []
passagens = set(); ids_vistos = C.Counter()
for r in linhas('registro_completo'):
    if r['Tema'] not in TEMA_TELA:
        sem_tema_valido += 1
        continue
    cid = por_string.get((r['Disputa'], norm(r['Candidatura'])))
    if not cid:
        nao_casaram.append((r['ID (site)'], r['Candidatura']))
        continue
    nat = NATUREZA_TELA.get(r['Natureza'])
    if not nat:
        raise SystemExit(f"natureza desconhecida em {r['ID (site)']}: {r['Natureza']!r}")
    par = (r['Trecho'] or '').strip()
    reconstruido = r['Origem do trecho'] == 'parágrafo reconstruído'
    fr = localizar_frase(par, r['Trecho como estava registrado (fragmento)']) if reconstruido else None
    if reconstruido:
        frase[fr[2] if fr else 'nao_localizada'] += 1
        if not fr:
            frase_falhou.append(r['ID (site)'])
        passagens.add((cid, par))
    ids_vistos[r['ID (site)']] += 1
    cands[cid]['trechos'].append({
        'id': r['ID (site)'],
        'tema': TEMA_TELA[r['Tema']],
        'natureza': nat,
        'pagina': r['Página'],
        'termo': r['Termo (dicionário)'],
        'texto': par,
        'inicio': r['Início'],
        'fim': r['Fim'],
        'fraseInicio': fr[0] if fr else None,
        'fraseFim': fr[1] if fr else None,
        'origem': 'paragrafo' if reconstruido else 'fragmento',
        'metaQuantificada': r['Meta quantificada'] or None,
    })
for c in lista:
    c['trechos'].sort(key=lambda t: (t['pagina'] is None, t['pagina'] or 0))

# ---------- termos sem ocorrência: 41 (decisão de 26/09, conferência termo a termo) ----------
# Vêm do dicionário v3.3 (aba sem_ocorrencia, coluna da apuração de 41). A aba termos_sem_ocorrencia da base
# ainda traz os 39 de 22/09 e NÃO é usada.
wd = load_workbook(a.dicionario, data_only=True)
_rows = list(wd['sem_ocorrencia'].iter_rows(values_only=True))
_cab_i = next(i for i, r in enumerate(_rows) if r[0] == 'Termo')
termosSemOcorrencia = [r[0] for r in _rows[_cab_i + 1:] if r[0] and str(r[4]).strip().lower() == 'sim']

DADOS = {
    'dataCorte': resumo['Data de corte'],
    'disputas': [{'id': 'pres', 'rotulo': 'Presidência'}, {'id': 'sp', 'rotulo': 'São Paulo'},
                 {'id': 'rs', 'rotulo': 'Rio Grande do Sul'}, {'id': 'ma', 'rotulo': 'Maranhão'}],
    'temas': [
        {'id': 'mitigacao', 'rotulo': 'Mitigação climática', 'curto': 'Mitigação'},
        {'id': 'adaptacao', 'rotulo': 'Adaptação e eventos extremos', 'curto': 'Adaptação'},
        {'id': 'ar', 'rotulo': 'Poluição do ar', 'curto': 'Poluição do ar'},
        {'id': 'saude', 'rotulo': 'Impactos do clima na saúde', 'curto': 'Clima e saúde'},
    ],
    'naturezas': [
        {'id': 'proposta', 'rotulo': 'Compromisso'},
        {'id': 'diagnostico', 'rotulo': 'Relato'},
        {'id': 'mencao', 'rotulo': 'Citação'},
    ],
    'atributos': [{'id': 'metaQuantificada', 'rotulo': 'Meta quantificada'}],
    'oficial': oficial,
    'termosSemOcorrencia': termosSemOcorrencia,
    'candidaturas': lista,
}

cab = ('/* dados.js — GERADO por tratar_dados.py a partir da base de dados da pesquisadora (versão final de 26/09/2026; corte %s).\n'
       '   Não editar à mão: rode o script de novo quando chegar uma planilha nova.\n'
       '   As contagens (candidatura.contagens) e os trechos (candidatura.trechos) são o registro\n'
       '   OFICIAL e completo dos 827, com o parágrafo do plano, página e natureza — aba registro_completo.\n'
       '   candidatura.foto: fotos oficiais em site/fotos/ (baixar_fotos.py / aplicar_fotos.py, API TSE). */\n'
       ) % DADOS['dataCorte']
open(a.saida, 'w', encoding='utf-8').write(cab + 'window.DADOS = ' + json.dumps(DADOS, ensure_ascii=False, indent=1) + ';\n')

# ---------- relatório de verificação ----------
R = []
def out(s=''): R.append(s)
def ok(c): return 'OK' if c else 'DIVERGE'
todos = [t for c in lista for t in c['trechos']]
out('VERIFICAÇÃO — dados.js vs. base de dados (corte %s)' % DADOS['dataCorte'])
out('=' * 60)
out('Candidaturas: %d (por disputa: %s) %s' % (len(lista), dict(C.Counter(c['disputa'] for c in lista)), ok(len(lista) == 34)))
out('  ids casados com candidatos.json: %d; sem foto em site/fotos: %s' % (len(lista), [c['id'] for c in lista if not c['foto']] or 'nenhuma'))
soma_total = sum(c['contagens']['total'] for c in lista)
out('Soma de trechos por candidatura (aba candidaturas): %d (oficial: %d) %s' % (soma_total, oficial['trechos'], ok(soma_total == oficial['trechos'])))
for tid in TEMA_COL:
    soma = sum(c['contagens'][tid] for c in lista)
    npl = sum(1 for c in lista if c['contagens'][tid] > 0)
    o = oficial['temas'][tid]
    reg = sum(1 for t in todos if t['tema'] == tid)
    out('  %-10s trechos %3d / %3d (registro %3d)  planos %2d / %2d   %s' % (tid, soma, o['trechos'], reg, npl, o['planos'], ok((soma, npl, reg) == (o['trechos'], o['planos'], o['trechos']))))
nat = C.Counter(t['natureza'] for t in todos)
out('Natureza no registro: compromisso %d · relato %d · citação %d · contrário %d   %s' % (nat['proposta'], nat['diagnostico'], nat['mencao'], nat['contrario'],
    ok(all(nat[k] == oficial['natureza'][k] for k in ('proposta', 'diagnostico', 'mencao')) and nat['contrario'] == oficial['natureza']['contrario'])))
out()
out('Trechos aplicados no site: %d (esperados %d) %s' % (len(todos), oficial['trechos'], ok(len(todos) == oficial['trechos'])))
dup = [i for i, n in ids_vistos.items() if n > 1]
out('  ids de trecho repetidos: %s' % (dup or 'nenhum'))
com_idx = sum(1 for t in todos if t['inicio'] is not None and t['fim'] is not None and 0 <= t['inicio'] < t['fim'] <= len(t['texto']))
out('  trechos com inicio/fim válidos dentro do texto (<mark> do termo): %d / %d %s' % (com_idx, len(todos), ok(com_idx == len(todos))))
por_cand_ok = all(len(c['trechos']) == c['contagens']['total'] for c in lista)
out('  trechos do registro = contagem da candidatura, em todas as 34: %s' % ok(por_cand_ok))
out('  linhas com tema fora da matriz de 4: %d · não casaram com candidatura: %s' % (sem_tema_valido, nao_casaram or 'nenhuma'))
out()
rec = sum(1 for t in todos if t['origem'] == 'paragrafo'); frg = len(todos) - rec
out('Origem do texto: parágrafo reconstruído %d (oficial %d) %s · fragmento registrado %d (oficial %d) %s' % (rec, oficial['paragrafo']['reconstruidos'], ok(rec == oficial['paragrafo']['reconstruidos']), frg, oficial['paragrafo']['fragmentos'], ok(frg == oficial['paragrafo']['fragmentos'])))
out('Passagens distintas (candidatura + parágrafo): %d (oficial %d) %s' % (len(passagens), oficial['paragrafo']['passagens'], ok(len(passagens) == oficial['paragrafo']['passagens'])))
out('Frase registrada dentro do parágrafo (para a exibição em três níveis):')
out('  localizada exata: %d · localizada ignorando espaços: %d · não localizada: %d' % (frase['exata'], frase['espacos'], frase['nao_localizada']))
if frase_falhou:
    out('  ids sem frase localizada: %s' % ', '.join(frase_falhou))
metas = [t['id'] for t in todos if t['metaQuantificada']]
out('Metas quantificadas por trecho: %d (oficial %d) %s  %s' % (len(metas), oficial['metaQuantificada'], ok(len(metas) == oficial['metaQuantificada']), metas))
out('Termos sem ocorrência (dicionário v3.3): %d %s  [a aba da base traz %d, lista de 22/09; não usada]' % (len(termosSemOcorrencia), ok(len(termosSemOcorrencia) == 41), len(linhas('termos_sem_ocorrencia'))))
out('Candidaturas marcadas com † (recurso pendente): %s' % [c['id'] for c in lista if c['marcador']])
open(a.relatorio, 'w', encoding='utf-8').write('\n'.join(R) + '\n')
print('\n'.join(R))
