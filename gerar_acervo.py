#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gerar_acervo.py — Gera o acervo.json do site Lapidarium a partir do CSV
exportado da planilha-mãe.

Uso:
    python3 gerar_acervo.py [caminho_csv] [saida_json]

Defaults: planilha.csv e acervo.json (na pasta do script).

Mapeamento CSV -> JSON:
    tipo      -> tipo
    titulo    -> titulo
    autor     -> autor
    data      -> data
    origem    -> grupo
    tags      -> tags (split por ';', com trim, sem vazios)
    url       -> url
    youtube_id-> yt
    thumbnail -> thumb
    anexos    -> pdf

Linhas sem 'id' são ignoradas.
"""
import csv
import json
import os
import sys


def gerar(caminho_csv, saida_json):
    itens = []
    with open(caminho_csv, newline="", encoding="utf-8-sig") as f:
        leitor = csv.DictReader(f)
        for linha in leitor:
            if not (linha.get("id") or "").strip():
                continue  # ignora linhas sem id (vazias/quebradas)
            tags = [t.strip() for t in (linha.get("tags") or "").split(";") if t.strip()]
            itens.append({
                "tipo": (linha.get("tipo") or "").strip(),
                "titulo": (linha.get("titulo") or "").strip(),
                "autor": (linha.get("autor") or "").strip(),
                "data": (linha.get("data") or "").strip(),
                "grupo": (linha.get("origem") or "").strip(),
                "tags": tags,
                "url": (linha.get("url") or "").strip(),
                "yt": (linha.get("youtube_id") or "").strip(),
                "thumb": (linha.get("thumbnail") or "").strip(),
                "pdf": (linha.get("anexos") or "").strip(),
            })

    with open(saida_json, "w", encoding="utf-8") as f:
        json.dump(itens, f, ensure_ascii=False, indent=1)
        f.write("\n")

    n_videos = sum(1 for i in itens if i["tipo"] == "video")
    n_pranchas = sum(1 for i in itens if i["tipo"] == "prancha")
    n_pdf = sum(1 for i in itens if i["pdf"])
    print(f"acervo gerado: {saida_json}")
    print(f"  itens:    {len(itens)}")
    print(f"  videos:   {n_videos}")
    print(f"  pranchas: {n_pranchas}")
    print(f"  com pdf:  {n_pdf}")
    return itens


if __name__ == "__main__":
    pasta = os.path.dirname(os.path.abspath(__file__))
    caminho_csv = sys.argv[1] if len(sys.argv) > 1 else os.path.join(pasta, "planilha.csv")
    saida_json = sys.argv[2] if len(sys.argv) > 2 else os.path.join(pasta, "acervo.json")
    if not os.path.isfile(caminho_csv):
        sys.exit(f"ERRO: CSV não encontrado: {caminho_csv}")
    gerar(caminho_csv, saida_json)
