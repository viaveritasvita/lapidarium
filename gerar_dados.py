#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lapidarium — gera os JSONs modulares do site a partir da planilha-mãe.

Fluxo: planilha (aba Videos, exportada como planilha.csv) → gerar_dados.py
       → videos-urania.json (e, opcionalmente, videos-epaminondas.json).

Uso:
  python3 gerar_dados.py [caminho/do.csv] [--com-epaminondas]

Por padrão lê planilha.csv na raiz do repo e escreve APENAS videos-urania.json.
O videos-epaminondas.json atual (6 vídeos-semente) é preservado — só é
regenerado com --com-epaminondas, quando a planilha tiver o acervo completo.

Obs.: o antigo acervo.json (schema flat, gerado por gerar_acervo.py) ficou
órfão — o site modular consome videos-*.json. Não delete sem revisar o git.
"""
import csv, json, sys, unicodedata

GRUPOS = {
    "Grupo de Estudos Urânia":  {"arquivo": "videos-urania.json",      "tema": "urania",      "cor_identidade": "#4a7fa8"},
    "EpaminondasOnline":        {"arquivo": "videos-epaminondas.json", "tema": "epaminondas", "cor_identidade": "#b87333"},
}

def slug(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = "".join(c if c.isalnum() else "-" for c in s)
    return "-".join(p for p in s.split("-") if p)[:60] or "item"

def item_modular(r):
    tipo = (r.get("tipo") or "video").strip() or "video"
    yid  = (r.get("youtube_id") or "").strip()
    anexo = (r.get("anexos") or "").strip()
    it = {
        "id": yid or (r.get("id") or "").strip() or ("prancha-" + slug(r.get("titulo"))),
        "titulo": (r.get("titulo") or "").strip(),
        "data": (r.get("data") or "").strip(),
        "palestrante": (r.get("autor") or "").strip(),
        "youtube_id": yid,
        "url": (r.get("url") or "").strip() or (("https://www.youtube.com/watch?v=" + yid) if yid else ""),
        "thumbnail": (r.get("thumbnail") or "").strip() or (("https://img.youtube.com/vi/" + yid + "/hqdefault.jpg") if yid else ""),
        "tags": [t.strip() for t in (r.get("tags") or "").split(";") if t.strip()],
        "transcricao_status": (r.get("transcricao_status") or "").strip() or "pendente",
        "tipo": tipo,
    }
    if anexo:
        it["anexo"] = anexo          # vira o botão "Prancha PDF" no card
    for extra in ("descricao", "rito", "grau", "ordem"):
        v = (r.get(extra) or "").strip()
        if v:
            it[extra] = v
    return it

def main():
    args = [a for a in sys.argv[1:]]
    com_epa = "--com-epaminondas" in args
    args = [a for a in args if a != "--com-epaminondas"]
    csv_path = args[0] if args else "planilha.csv"

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        linhas = list(csv.DictReader(f))

    for origem, cfg in GRUPOS.items():
        if origem == "EpaminondasOnline" and not com_epa:
            print(f"· {cfg['arquivo']}: preservado (use --com-epaminondas para regenerar)")
            continue
        itens = [item_modular(r) for r in linhas if (r.get("origem") or "").strip() == origem]
        itens.sort(key=lambda i: i["data"] or "0000", reverse=True)
        saida = {"grupo": origem, "tema": cfg["tema"], "cor_identidade": cfg["cor_identidade"], "videos": itens}
        with open(cfg["arquivo"], "w", encoding="utf-8") as f:
            json.dump(saida, f, ensure_ascii=False, indent=2)
            f.write("\n")
        n_v = sum(1 for i in itens if i["tipo"] == "video")
        n_p = sum(1 for i in itens if i["tipo"] == "prancha")
        n_a = sum(1 for i in itens if i.get("anexo"))
        print(f"✔ {cfg['arquivo']}: {len(itens)} itens ({n_v} vídeos, {n_p} pranchas; {n_a} com anexo/PDF)")

if __name__ == "__main__":
    main()
