#!/usr/bin/env python3
"""
tratar_dados_v4.py — gera dados.js a partir da planilha "Base de dados para o site"
entregue pela pesquisadora (versão 4.0, corpus fechado em 22/09/2026).

Diferença para o pipeline anterior (tratar_dados.py, que lia dados_final.json):
a fonte agora é a planilha .xlsx com 13-14 abas. As CONTAGENS por candidatura/tema
são completas e oficiais para as 34 candidaturas (aba `candidaturas`). Desde a
entrega de 22/09 (2ª leva), a aba `registro_completo` traz o texto literal, página,
arquivo e hash dos 825 trechos — não é mais amostra parcial (as primeiras entregas
só tinham 169/156 trechos com texto, na aba `citacoes_verificadas`).

Entrega de 24/09 (v5): `registro_completo` ganhou colunas de contexto (texto antes/depois
de cada trecho) e QA — ainda não consumidas aqui, esse script só lê os mesmos campos de
sempre (tema, natureza, página, trecho). A coluna do trecho em si foi renomeada de
"Trecho (literal)" para "Trecho", e o valor de natureza "incidental" passou a se chamar
"citação/menção" (mesma categoria, mesmo id de tela `mencao`).

Uso:
    cd dados
    python3 tratar_dados_v4.py --entrada entrada/v5/Base_de_dados_site_Clima_Saude_2026_v_final2.xlsx --saida ../site/dados.js --relatorio verificacao_dados.txt
"""
import argparse, json, collections as C
from openpyxl import load_workbook

ap = argparse.ArgumentParser()
ap.add_argument('--entrada', default='entrada/v5/Base_de_dados_site_Clima_Saude_2026_v_final2.xlsx')
ap.add_argument('--saida', default='../site/dados.js')
ap.add_argument('--relatorio', default='verificacao_dados.txt')
a = ap.parse_args()

wb = load_workbook(a.entrada, data_only=True)

def linhas(aba, pular_ate_cabecalho=True):
    """Itera as linhas de uma aba como dicts, usando a primeira linha 100% preenchida como cabeçalho
    (as abas têm notas de texto livre no topo antes da tabela)."""
    ws = wb[aba]
    rows = list(ws.iter_rows(values_only=True))
    cab_i = next(i for i, r in enumerate(rows) if r[0] and r[1] is not None and str(r[0]).strip() not in ('',))
    cab = rows[cab_i]
    out = []
    for r in rows[cab_i + 1:]:
        if r[0] is None and all(x is None for x in r):
            continue
        out.append(dict(zip(cab, r)))
    return out

DISPUTA_COD = {'Presidência': 'BR', 'Rio Grande do Sul': 'RS', 'São Paulo': 'SP', 'Maranhão': 'MA'}
DISPUTA_ID = {'Presidência': 'pres', 'Rio Grande do Sul': 'rs', 'São Paulo': 'sp', 'Maranhão': 'ma'}
TEMA_TELA = {
    'Mitigação climática': 'mitigacao', 'Adaptação e eventos extremos': 'adaptacao',
    'Poluição do ar': 'ar', 'Impactos do clima na saúde': 'saude',
}
TEMA_COL = {'mitigacao': 'Mitigação', 'adaptacao': 'Adaptação', 'ar': 'Poluição do ar', 'saude': 'Impactos na saúde'}
NATUREZA_TELA = {'proposta': 'proposta', 'diagnóstico': 'diagnostico', 'citação/menção': 'mencao'}

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

# ---------- resumo_geral: bloco "oficial" (números de manchete) ----------
resumo = {r['Indicador']: r['Valor'] for r in linhas('resumo_geral')}
oficial = {
    'candidaturas': resumo['Candidaturas no corpus'],
    'arquivos': resumo['Arquivos PDF'],
    'paginas': resumo['Páginas (por candidatura)'],
    'trechos': resumo['Trechos registrados (4 temas)'],
    'planosComOcorrencia': resumo['Planos com ao menos um tema'],
    'planosSemOcorrencia': resumo['Planos sem nenhum tema'],
    'natureza': {
        'proposta': resumo['Natureza — propostas'],
        'diagnostico': resumo['Natureza — diagnósticos'],
        'mencao': resumo['Natureza — citações/menções'],
    },
    'metaQuantificada': resumo['Trechos com meta quantificada'],
    'temas': {},  # preenchido abaixo com por_eixo
    'quatroTemas': resumo['Planos que tocam os quatro temas'],
}
for r in linhas('por_eixo'):
    if r['Tema'] not in TEMA_TELA:
        continue
    tid = TEMA_TELA[r['Tema']]
    oficial['temas'][tid] = {'trechos': r['Trechos'], 'planos': r['Planos com ao menos uma menção']}

# ---------- candidaturas: tabela-mestra (contagens completas, oficiais) ----------
cands = []
por_string = {}  # "UP (Samara Martins)" (sem †) -> id da candidatura, p/ casar com citações
for r in linhas('candidaturas'):
    disp_nome = r['Disputa']
    if disp_nome not in DISPUTA_COD:
        continue
    cod = DISPUTA_COD[disp_nome]
    ordem = r['Ordem de registro']
    cid = f"{cod}-{ordem:02d}"
    raw = r['Candidatura']  # ex.: "UP (Samara Martins)" ou "PCO (Cesar Pontes) †"
    marcador = '†' if raw.rstrip().endswith('†') else None
    base = raw.replace('†', '').strip()
    if '(' in base and base.endswith(')'):
        sigla_txt, nome = base[:base.index('(')].strip(), base[base.index('(') + 1:-1].strip()
    else:
        sigla_txt, nome = base, None
    nome = NOME_URNA.get(cid, nome)  # nome de urna oficial, confirmado pelo jornalista, sobrepõe o nome civil da planilha
    partido = r['Partido']
    situacao = r['Situação do registro']
    titulo = nome or partido
    subtitulo = partido if nome else 'Nome a confirmar'
    if marcador:
        subtitulo += ' · registro em recurso'
    contagens = {tid: (r[col] or 0) for tid, col in TEMA_COL.items()}
    total = r['Total de trechos'] or 0
    estado = 'sem_ocorrencia' if (r['Sem nenhuma menção'] == 'sim' or total == 0) else 'completo'
    cand = {
        'id': cid, 'disputa': DISPUTA_ID[disp_nome], 'ordem': ordem,
        'nome': nome, 'sigla': sigla_txt, 'titulo': titulo, 'subtitulo': subtitulo, 'foto': None,
        'marcador': marcador, 'situacao': situacao,
        'estado': estado,
        'contagens': {**contagens, 'total': total},
        'trechos': [],  # preenchido abaixo, só com citações verificadas (texto real)
    }
    cands.append(cand)
    por_string[base] = cid
cands.sort(key=lambda c: (['pres', 'sp', 'rs', 'ma'].index(c['disputa']), c['ordem']))
by_id = {c['id']: c for c in cands}

# ---------- registro_completo: os 825 trechos, um por linha (texto, página, arquivo, hash) ----------
TEMA_TELA_FULL = TEMA_TELA  # mesmas chaves de tema (PT completo -> id da tela)
nao_casaram = []
sem_tema_valido = 0
for r in linhas('registro_completo'):
    tema_raw = r['Tema']
    if tema_raw not in TEMA_TELA_FULL:
        sem_tema_valido += 1
        continue
    cand_txt = (r['Candidatura'] or '').replace('†', '').strip()
    cid = por_string.get(cand_txt)
    if not cid:
        nao_casaram.append((r['ID (site)'], cand_txt))
        continue
    by_id[cid]['trechos'].append({
        'tema': TEMA_TELA_FULL[tema_raw],
        'natureza': NATUREZA_TELA.get(r['Natureza'], 'mencao'),
        'pagina': r['Página'],
        'texto': (r['Trecho'] or '').strip(),
        'inicio': r['Início'],
        'fim': r['Fim'],
    })
descartadas_ou_fora = sem_tema_valido
for c in cands:
    c['trechos'].sort(key=lambda t: (t['pagina'] is None, t['pagina'] or 0))

# ---------- termos sem ocorrência (pra seção "o que nenhum plano diz", se/quando usada) ----------
termosSemOcorrencia = [r['Termo'] for r in linhas('termos_sem_ocorrencia')]

DADOS = {
    'dataCorte': resumo['Data de corte do corpus'],
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
    'candidaturas': cands,
}

cab = ('/* dados.js — GERADO por tratar_dados_v4.py a partir da planilha da pesquisadora (corte %s).\n'
       '   Não editar à mão: rode o script de novo quando chegar uma planilha nova (e depois\n'
       '   dados/fotos/aplicar_fotos.py, senão o campo foto de cada candidatura se perde).\n'
       '   As contagens (candidatura.contagens) e os trechos (candidatura.trechos) são o registro\n'
       '   OFICIAL e completo dos 825, com texto, página e natureza — aba registro_completo. */\n'
       ) % DADOS['dataCorte']
open(a.saida, 'w', encoding='utf-8').write(cab + 'window.DADOS = ' + json.dumps(DADOS, ensure_ascii=False, indent=1) + ';\n')

# ---------- relatório de verificação ----------
R = []
def out(s=''): R.append(s)
out('VERIFICAÇÃO — dados.js vs. planilha oficial (corte %s)' % DADOS['dataCorte'])
out('=' * 60)
out('Candidaturas: %d (por disputa: %s)' % (len(cands), dict(C.Counter(c['disputa'] for c in cands))))
soma_total = sum(c['contagens']['total'] for c in cands)
out('Soma de trechos por candidatura: %d (oficial: %d) %s' % (soma_total, oficial['trechos'], 'OK' if soma_total == oficial['trechos'] else 'DIVERGE'))
for tid in ['mitigacao', 'adaptacao', 'ar', 'saude']:
    soma = sum(c['contagens'][tid] for c in cands)
    npl = sum(1 for c in cands if c['contagens'][tid] > 0)
    o = oficial['temas'][tid]
    out('  %-10s trechos %3d / %3d   planos %2d / %2d   %s' % (tid, soma, o['trechos'], npl, o['planos'], 'OK' if (soma, npl) == (o['trechos'], o['planos']) else 'DIVERGE'))
com_texto = sum(1 for c in cands for t in c['trechos'])
com_indices = sum(1 for c in cands for t in c['trechos'] if t['inicio'] is not None and t['fim'] is not None)
out()
out('Trechos com texto (aba registro_completo, 825 esperados): %d aplicados no site' % com_texto)
out('Trechos com inicio/fim (pro <mark> do termo): %d / %d %s' % (com_indices, com_texto, 'OK' if com_indices == com_texto else 'FALTANDO EM ALGUNS — checar planilha'))
out('  linhas com tema fora da matriz de 4 (não entram no site): %d' % descartadas_ou_fora)
out('  não casaram com nenhuma candidatura (checar nome): %s' % (nao_casaram or 'nenhuma'))
sem_texto = [c['id'] for c in cands if c['contagens']['total'] > 0 and not c['trechos']]
out('Candidaturas com trechos oficiais mas 0 texto aplicado (deveria ser 0 agora): %d' % len(sem_texto))
out('  %s' % sem_texto)
marcadas = [c['id'] for c in cands if c['marcador']]
out('Candidaturas marcadas com † (recurso pendente): %s' % marcadas)
open(a.relatorio, 'w', encoding='utf-8').write('\n'.join(R) + '\n')
print('\n'.join(R))
