#!/usr/bin/env python3
"""
Regenera os arquivos seed SQL a partir dos JSONs originais (que têm acentos corretos).
Gera 3 arquivos:
  - seed_1_clean.sql: Limpeza + estrutura + cursos + cursos_temas
  - seed_2_clean.sql: Questões parte 1
  - seed_3_clean.sql: Questões parte 2
"""

import json
import os
import glob

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CURSOS_JSON = os.path.join(BASE_DIR, 'cursos_fuvest.json')
QUESTOES_DIR = os.path.join(BASE_DIR, 'ProvasFuvestJson')

def escape_sql(text):
    """Escapa aspas simples para SQL."""
    if text is None:
        return 'NULL'
    return text.replace("'", "''")

def json_to_sql_literal(obj):
    """Converte um objeto Python para um literal JSON escapado para SQL."""
    json_str = json.dumps(obj, ensure_ascii=False)
    return escape_sql(json_str)

def generate_cleanup_sql():
    """Gera SQL para limpar dados existentes (respeitando foreign keys)."""
    lines = []
    lines.append("-- =============================================")
    lines.append("-- LIMPEZA: Remove dados antigos com encoding quebrado")
    lines.append("-- =============================================")
    lines.append("")
    lines.append("-- Limpar tabelas dependentes primeiro")
    lines.append("DELETE FROM public.respostas;")
    lines.append("DELETE FROM public.leaderboard_semanal;")
    lines.append("DELETE FROM public.provas;")
    lines.append("DELETE FROM public.estatisticas;")
    lines.append("DELETE FROM public.cursos_temas;")
    lines.append("DELETE FROM public.questoes;")
    lines.append("DELETE FROM public.cursos;")
    lines.append("")
    lines.append("-- Resetar sequences")
    lines.append("ALTER SEQUENCE public.cursos_id_seq RESTART WITH 1;")
    lines.append("ALTER SEQUENCE public.questoes_id_seq RESTART WITH 1;")
    lines.append("ALTER SEQUENCE public.respostas_id_seq RESTART WITH 1;")
    lines.append("ALTER SEQUENCE public.leaderboard_semanal_id_seq RESTART WITH 1;")
    lines.append("")
    return lines

def generate_cursos_sql():
    """Gera SQL de INSERT para cursos a partir do JSON original."""
    with open(CURSOS_JSON, 'r', encoding='utf-8') as f:
        cursos = json.load(f)
    
    lines = []
    lines.append("-- =============================================")
    lines.append("-- CURSOS: Inseridos a partir de cursos_fuvest.json")
    lines.append("-- =============================================")
    lines.append("")
    
    # Os 5 cursos legacy (IDs 1-5) com acentos corretos
    legacy_cursos = [
        (1, 'Medicina', 'Foco em Biologia, Química e Física'),
        (2, 'Engenharia', 'Foco em Matemática, Física e Química'),
        (3, 'Direito', 'Foco em História, Geografia e Português'),
        (4, 'Computação', 'Foco em Matemática e Física'),
        (5, 'Arquitetura', 'Foco em Matemática, História da Arte e Física'),
    ]
    
    # Legacy cursos com temas
    legacy_temas = {
        1: ['Biologia', 'Química', 'Física', 'Matemática', 'Português'],
        2: ['Matemática', 'Física', 'Química', 'Português'],
        3: ['História', 'Geografia', 'Português', 'Filosofia', 'Sociologia'],
        4: ['Matemática', 'Física', 'Português'],
        5: ['Matemática', 'Física', 'História', 'Português'],
    }
    
    for curso_id, nome, descricao in legacy_cursos:
        lines.append(f"INSERT INTO public.cursos (id, nome, descricao) VALUES ({curso_id}, '{escape_sql(nome)}', '{escape_sql(descricao)}');")
    
    lines.append("")
    
    # Cursos do JSON (IDs começam em 9 para manter compatibilidade)
    curso_id = 9
    curso_id_map = {}  # nome -> id
    
    for curso in cursos:
        nome = curso['nome']
        descricao = curso.get('descricao', '')
        curso_id_map[nome] = curso_id
        lines.append(f"INSERT INTO public.cursos (id, nome, descricao) VALUES ({curso_id}, '{escape_sql(nome)}', '{escape_sql(descricao)}');")
        curso_id += 1
    
    lines.append("")
    lines.append(f"-- Atualizar sequence para próximo ID disponível")
    lines.append(f"ALTER SEQUENCE public.cursos_id_seq RESTART WITH {curso_id};")
    lines.append("")
    
    # Gerar cursos_temas
    lines.append("-- =============================================")
    lines.append("-- CURSOS_TEMAS: Temas por curso")
    lines.append("-- =============================================")
    lines.append("")
    
    # Legacy temas
    for cid, temas in legacy_temas.items():
        for tema in temas:
            lines.append(f"INSERT INTO public.cursos_temas (curso_id, tema) VALUES ({cid}, '{escape_sql(tema)}');")
    
    lines.append("")
    
    # Temas do JSON
    curso_id = 9
    for curso in cursos:
        temas = curso.get('temas', [])
        for tema in temas:
            lines.append(f"INSERT INTO public.cursos_temas (curso_id, tema) VALUES ({curso_id}, '{escape_sql(tema)}');")
        curso_id += 1
    
    lines.append("")
    return lines

def generate_questoes_sql():
    """Gera SQL de INSERT para questões a partir dos JSONs de provas."""
    json_files = sorted(glob.glob(os.path.join(QUESTOES_DIR, 'fuvest_*.json')))
    
    all_lines = []
    all_lines.append("-- =============================================")
    all_lines.append("-- QUESTÕES: Inseridas a partir dos JSONs de provas")
    all_lines.append("-- =============================================")
    all_lines.append("")
    
    questao_id = 1
    
    for json_file in json_files:
        filename = os.path.basename(json_file)
        all_lines.append(f"-- Arquivo: {filename}")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            questoes = json.load(f)
        
        for q in questoes:
            enunciado = escape_sql(q.get('enunciado', ''))
            alternativas = json_to_sql_literal(q.get('alternativas', []))
            resposta_correta = escape_sql(q.get('resposta_correta', ''))
            tema = q.get('tema')
            categoria = q.get('categoria')
            ano_fuvest = q.get('ano_fuvest')
            imagem_url = q.get('imagem_url')
            explicacao = q.get('explicacao')
            
            tema_sql = f"'{escape_sql(tema)}'" if tema else 'NULL'
            categoria_sql = f"'{escape_sql(categoria)}'" if categoria else 'NULL'
            ano_sql = str(ano_fuvest) if ano_fuvest else 'NULL'
            imagem_sql = f"'{escape_sql(imagem_url)}'" if imagem_url else 'NULL'
            explicacao_sql = f"'{escape_sql(explicacao)}'" if explicacao else 'NULL'
            
            line = (
                f"INSERT INTO public.questoes (id, enunciado, alternativas, resposta_correta, "
                f"tema, categoria, ano_fuvest, classificado, imagem_url, explicacao) VALUES ("
                f"{questao_id}, '{enunciado}', '{alternativas}', '{resposta_correta}', "
                f"{tema_sql}, {categoria_sql}, {ano_sql}, false, {imagem_sql}, {explicacao_sql});"
            )
            all_lines.append(line)
            questao_id += 1
        
        all_lines.append("")
    
    all_lines.append(f"-- Atualizar sequence para próximo ID disponível")
    all_lines.append(f"ALTER SEQUENCE public.questoes_id_seq RESTART WITH {questao_id};")
    all_lines.append("")
    
    return all_lines, questao_id - 1

def main():
    print("=" * 60)
    print("Regenerando seeds SQL a partir dos JSONs originais...")
    print("=" * 60)
    
    # Verificar arquivos de entrada
    if not os.path.exists(CURSOS_JSON):
        print(f"ERRO: {CURSOS_JSON} não encontrado!")
        return
    
    json_files = sorted(glob.glob(os.path.join(QUESTOES_DIR, 'fuvest_*.json')))
    if not json_files:
        print(f"ERRO: Nenhum JSON de prova encontrado em {QUESTOES_DIR}!")
        return
    
    print(f"  Cursos JSON: {CURSOS_JSON}")
    print(f"  Provas JSON: {len(json_files)} arquivos encontrados")
    print()
    
    # Gerar seed_1_clean.sql (limpeza + cursos + temas)
    seed1_lines = []
    seed1_lines.append("SET client_encoding = 'UTF8';")
    seed1_lines.append("")
    seed1_lines.extend(generate_cleanup_sql())
    seed1_lines.extend(generate_cursos_sql())
    
    seed1_path = os.path.join(BASE_DIR, 'seed_1_clean.sql')
    with open(seed1_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(seed1_lines))
    print(f"✅ {seed1_path} ({len(seed1_lines)} linhas)")
    
    # Gerar questões
    questoes_lines, total_questoes = generate_questoes_sql()
    print(f"  Total de questões: {total_questoes}")
    
    # Dividir questões em 2 partes
    # Encontrar bom ponto de corte (entre arquivos de prova)
    mid = len(questoes_lines) // 2
    # Procurar o próximo comentário "-- Arquivo:" após o meio
    while mid < len(questoes_lines) and not questoes_lines[mid].startswith('-- Arquivo:'):
        mid += 1
    
    part1 = questoes_lines[:mid]
    part2 = questoes_lines[mid:]
    
    # seed_2_clean.sql - Questões parte 1
    seed2_lines = []
    seed2_lines.append("SET client_encoding = 'UTF8';")
    seed2_lines.append("")
    seed2_lines.extend(part1)
    
    seed2_path = os.path.join(BASE_DIR, 'seed_2_clean.sql')
    with open(seed2_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(seed2_lines))
    print(f"✅ {seed2_path} ({len(seed2_lines)} linhas)")
    
    # seed_3_clean.sql - Questões parte 2
    seed3_lines = []
    seed3_lines.append("SET client_encoding = 'UTF8';")
    seed3_lines.append("")
    seed3_lines.extend(part2)
    
    seed3_path = os.path.join(BASE_DIR, 'seed_3_clean.sql')
    with open(seed3_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(seed3_lines))
    print(f"✅ {seed3_path} ({len(seed3_lines)} linhas)")
    
    print()
    print("=" * 60)
    print("CONCLUÍDO! Arquivos gerados com encoding UTF-8 correto.")
    print("=" * 60)
    print()
    print("PRÓXIMOS PASSOS:")
    print("  1. Vá ao SQL Editor do Supabase")
    print("  2. Execute seed_1_clean.sql PRIMEIRO (limpeza + cursos)")
    print("  3. Execute seed_2_clean.sql (questões parte 1)")
    print("  4. Execute seed_3_clean.sql (questões parte 2)")
    print()
    print("⚠️  ATENÇÃO: O seed_1 vai APAGAR todos os dados existentes")
    print("   (usuários, respostas, provas, etc.) antes de re-inserir!")

if __name__ == '__main__':
    main()
