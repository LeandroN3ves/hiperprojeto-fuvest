import os

def fix_mojibake(text):
    # Precise mapping for the current seed files corruption
    replacements = {
        'Matemâ”œÃ­tica': 'Matemática',
        'Fâ”œÂ¡sica': 'Física',
        'Quâ”œÂ¡mica': 'Química',
        'Histâ”œâ”‚ria': 'História',
        'Portuguâ”œÂ¬s': 'Português',
        'Repâ”œâ•‘blica': 'República',
        'â”œÂ¼lgebra': 'Álgebra',
        'â”œÃ¼lgebra': 'Álgebra',
        'Urbanizaâ”œÂºâ”œÃºo': 'Urbanização',
        'Interpretaâ”œÂºâ”œÃºo': 'Interpretação',
        'Funâ”œÂºâ”œÃ es': 'Funções',
        'Geopolâ”œÂ¡tica': 'Geopolítica',
        'Orgâ”œÃ³nica': 'Orgânica',
        'Termodinâ”œÃ³mica': 'Termodinâmica',
        'Mecâ”œÃ³nica': 'Mecânica',
        'Botâ”œÃ³nica': 'Botânica',
        'Josâ”œÂ®': 'José',
        'Mâ”œÃ­rio': 'Mário',
        'Gâ”œÂ¬nero': 'Gênero',
        'â”œÃ«': 'É',
        'â”œÃ¡': 'á',
        'â”œÂ¡': 'í',
        'â”œÃ­': 'á',
        'â”œÂ¬': 'ê',
        'â”œâ”‚': 'ó',
        'â”œâ•‘': 'ú',
        'â”œÃ³': 'ô',
        'â”œÂº': 'ç',
        'â”œÃºo': 'ão',
        'â”œÃº': 'ú',
        'â”œÃ±': 'ñ'
    }
    
    # Sort by length to avoid partial replacements
    for old in sorted(replacements.keys(), key=len, reverse=True):
        text = text.replace(old, replacements[old])
    return text

files = ['seed_1.sql', 'seed_2.sql', 'seed_3.sql']
for filename in files:
    if os.path.exists(filename):
        print(f"Fixing {filename}...")
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(filename, 'r', encoding='latin-1') as f:
                content = f.read()
        
        fixed_content = fix_mojibake(content)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Saved {filename}")
