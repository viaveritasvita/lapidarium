#!/usr/bin/env python3
"""
Lapidarium — gera os fallbacks estáticos A PARTIR DA API (fonte de verdade).

    python3 gerar_fallback.py

Escreve videos-urania.json e videos-epaminondas.json lendo a planilha-mãe ao vivo.
Rode de tempos em tempos (ou depois de mexer bastante na planilha) e commite os JSONs.

POR QUE ESTE ARQUIVO EXISTE (leia antes de "melhorar"):
O antecessor, gerar_dados.py, lia um CSV exportado à mão (planilha.csv). Esse CSV
envelhecia em silêncio: em 15/07/2026 ele tinha 85 linhas enquanto a planilha tinha 327.
Rodar aquele script teria destruído o acervo. Fonte de verdade é a API, ponto.
"""
import json, sys, urllib.request

API = ("https://script.google.com/macros/s/"
       "AKfycbwucO2iSyf-SG9XXwFtmlrcVaHNm9_zcKnKV0J4rZq0OBApbYgImuv4c0DlUDa1NVVlhg/exec")

GRUPOS = {
    "urania": {
        "arquivo": "videos-urania.json",
        "grupo": "Grupo de Estudos Urânia",
        "tema": "urania",
        "cor": "#4a7fa8",
        "casa": lambda o: "pamin" not in o.lower(),
    },
    "epaminondas": {
        "arquivo": "videos-epaminondas.json",
        "grupo": "EpaminondasOnline",
        "tema": "epaminondas",
        "cor": "#b87333",
        "casa": lambda o: "pamin" in o.lower(),
    },
}


def buscar():
    req = urllib.request.Request(API, headers={"User-Agent": "lapidarium-fallback"})
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.loads(r.read().decode("utf-8"))
    if not d.get("ok"):
        sys.exit("API respondeu sem ok=true")
    return d["itens"]


def tags(v):
    t = v.get("tags") or ""
    if isinstance(t, list):
        return [x.strip() for x in t if str(x).strip()]
    return [x.strip() for x in str(t).replace(";", ",").split(",") if x.strip()]


def item(v):
    # schema do fallback: 'anexo' (singular) espelha 'anexos' da API
    return {
        "id": v.get("id", ""),
        "titulo": v.get("titulo", ""),
        "data": (v.get("data") or "")[:10],
        "palestrante": v.get("autor", ""),
        "youtube_id": v.get("youtube_id", ""),
        "url": v.get("url", ""),
        "thumbnail": v.get("thumbnail", ""),
        "duracao": v.get("duracao", ""),
        "tags": tags(v),
        "transcricao_status": v.get("transcricao_status", "pendente"),
        "tipo": v.get("tipo") or "video",
        "anexo": v.get("anexos", ""),
    }


def main():
    itens = buscar()
    print(f"API: {len(itens)} itens")
    for chave, g in GRUPOS.items():
        sel = [v for v in itens if g["casa"](str(v.get("origem") or ""))]
        sel.sort(key=lambda v: (v.get("data") or ""), reverse=True)
        saida = {
            "grupo": g["grupo"],
            "tema": g["tema"],
            "cor_identidade": g["cor"],
            "gerado_em": __import__("datetime").date.today().isoformat(),
            "fonte": "API da planilha-mãe (gerar_fallback.py)",
            "total": len(sel),
            "videos": [item(v) for v in sel],
        }
        with open(g["arquivo"], "w", encoding="utf-8") as f:
            json.dump(saida, f, ensure_ascii=False, indent=1)
        com_anexo = sum(1 for v in saida["videos"] if v["anexo"])
        pranchas = sum(1 for v in saida["videos"] if v["tipo"] == "prancha")
        datas = [v["data"] for v in saida["videos"] if v["data"]]
        print(f"  {g['arquivo']}: {len(sel)} itens | anexos: {com_anexo} | pranchas: {pranchas} "
              f"| {min(datas)} -> {max(datas)}")


if __name__ == "__main__":
    main()
