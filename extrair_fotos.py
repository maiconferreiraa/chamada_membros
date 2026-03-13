import fitz  # PyMuPDF
import os
import re
import unicodedata

def limpar_nome_arquivo(nome):
    if not nome: return ""
    # Remove quebras de linha e espaços duplos
    nome = " ".join(nome.split())
    # Normaliza para remover acentos
    nfkd_form = unicodedata.normalize('NFKD', nome)
    nome_sem_acento = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Remove caracteres proibidos em nomes de arquivos
    nome_limpo = re.sub(r'[^a-zA-Z0-9 ]', '', nome_sem_acento)
    return nome_limpo.strip().upper()

def extrair_fotos_total():
    pasta_raiz = os.getcwd()
    pasta_fotos = os.path.join(pasta_raiz, 'fotos')

    if not os.path.exists(pasta_fotos):
        os.makedirs(pasta_fotos)

    arquivos_pdf = [f for f in os.listdir(pasta_raiz) if f.lower().endswith('.pdf') and 'listagem' in f.lower()]
    
    if not arquivos_pdf:
        print("Nenhum PDF encontrado na pasta!")
        return

    for nome_pdf in arquivos_pdf:
        print(f"\n--- Escaneando PDF: {nome_pdf} ---")
        doc = fitz.open(nome_pdf)
        
        for num_pagina in range(len(doc)):
            pagina = doc[num_pagina]
            
            # Localiza todas as imagens da página e suas coordenadas
            img_info = pagina.get_image_info(hashes=False, xrefs=True)
            
            for i, img in enumerate(img_info):
                xref = img["xref"]
                bbox_img = img["bbox"] # [x0, y0, x1, y1]
                
                # Criamos uma 'Área de Interesse' (AOI)
                # Expandimos a busca para a direita (300px) e um pouco para cima/baixo (20px)
                area_busca = fitz.Rect(bbox_img[0], bbox_img[1] - 10, bbox_img[0] + 450, bbox_img[3] + 10)
                
                # Extraímos o texto EXATAMENTE dessa área
                texto_area = pagina.get_text("text", clip=area_busca).strip()
                
                # Filtramos para pegar apenas o nome (ignoramos números de ordem e lixo)
                linhas = [l.strip() for l in texto_area.split('\n') if len(l.strip()) > 5]
                nome_candidato = ""
                
                for linha in linhas:
                    # Um nome válido é todo em maiúsculo e não contém palavras do sistema
                    if linha.isupper() and "IGREJA" not in linha and "FOTO" not in linha:
                        nome_candidato = linha
                        break
                
                if nome_candidato:
                    nome_final = limpar_nome_arquivo(nome_candidato) + ".jpg"
                else:
                    # Se falhar, salva com nome genérico para você saber qual página revisar
                    nome_final = f"REVISAR_PAG_{num_pagina+1}_IMG_{i+1}.jpg"

                try:
                    pix = fitz.Pixmap(doc, xref)
                    # Garante RGB (evita cores estranhas)
                    if pix.n - pix.alpha < 4:
                        pix.save(os.path.join(pasta_fotos, nome_final))
                    else:
                        pix_rgb = fitz.Pixmap(fitz.csRGB, pix)
                        pix_rgb.save(os.path.join(pasta_fotos, nome_final))
                        pix_rgb = None
                    print(f"Sucesso: {nome_final}")
                except Exception as e:
                    print(f"Erro na imagem {xref}: {e}")
                
                pix = None
        doc.close()

    print("\n[CONCLUÍDO] Verifique a pasta 'fotos'.")

if __name__ == "__main__":
    extrair_fotos_total()