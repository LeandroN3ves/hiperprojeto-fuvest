import os

def fix_mojibake(text):
    # Map common mangled sequences back to Portuguese characters
    # These sequences are typical of UTF-8 text being interpreted as CP437/CP850
    replacements = {
        'â”œÃ¡': 'á',
        'â”œÂ¡': 'á',
        'â”œÃ©': 'é',
        'â”œÂ©': 'é',
        'â”œÃ­': 'í',
        'â”œÃ³': 'ó',
        'â”œÃº': 'ú',
        'â”œÃ³': 'ô', # sometimes mismapped
        'â”œÃ´': 'ô',
        'â”œÃª': 'ê',
        'â”œÂ¬': 'ê',
        'â”œÃ»': 'û',
        'â”œÃ£': 'ã',
        'â”œÃµ': 'õ',
        'â”œÂº': 'ç',
        'â”œÃºo': 'ão',
        'â”œÂºâ”œÃºo': 'ção',
        'â”œÃª': 'ê',
        'â”œÃ´': 'ô',
        'â”œÃ±': 'ñ', # just in case
        'â”œÃ²': 'ò',
        'â”œâ”‚': 'í', # seen in "Histâ”œâ”‚ria"
        'â”œâ•‘': 'ú', # seen in "Repâ”œâ•‘blica"
        'Portuguâ”œÂ¬s': 'Português',
        'Matemâ”œÃ­tica': 'Matemática',
        'Histâ”œâ”‚ria': 'História',
        'Geopolâ”œÂ¡tica': 'Geopolítica',
        'Urbanizaâ”œÂºâ”œÃºo': 'Urbanização',
        'Funâ”œÂºâ”œÃ es': 'Funções',
        'Quâ”œÂ¡mica': 'Química',
        'Orgâ”œÃ³nica': 'Orgânica',
        'Fâ”œÂ¡sico': 'Físico',
        'Termodinâ”œÃ³mica': 'Termodinâmica',
        'Mecâ”œÃ³nica': 'Mecânica',
        'â”œÃ¼lgebra': 'Álgebra',
        'Interpretaâ”œÂºâ”œÃºo': 'Interpretação',
        'â”œÃ«': 'É',
        'Josâ”œÂ®': 'José',
        'Mâ”œÃ­rio': 'Mário',
        'Vâ”œÂ¡rus': 'Vírus'
    }
    
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text

files = ['seed_1.sql', 'seed_2.sql', 'seed_3.sql']
for filename in files:
    if os.path.exists(filename):
        print(f"Fixing {filename}...")
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        fixed_content = fix_mojibake(content)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Saved {filename}")
