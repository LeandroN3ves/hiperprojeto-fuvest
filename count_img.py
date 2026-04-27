import json, glob, os

total = 0
img = 0
for f in sorted(glob.glob('ProvasFuvestJson/fuvest_*.json')):
    with open(f, encoding='utf-8') as fh:
        qs = json.load(fh)
    for q in qs:
        total += 1
        if '[IMAGEM]' in q.get('enunciado', ''):
            img += 1

print(f'Total questoes: {total}')
print(f'Com [IMAGEM]: {img}')
print(f'Sem imagem (ficam): {total - img}')
