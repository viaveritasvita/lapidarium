# Migração 15/07/2026 — restauro das pranchas + acervo Epaminondas completo

Arquivos consumidos pelo Apps Script (função `migrar()`), lidos via raw.githubusercontent.

- `restauro.csv`  — youtube_id, anexos, tags, autor → repõe o que a recarga do YouTube apagou na Urânia (30 anexos, 81 tags, 32 autores).
- `inserir.csv`   — 124 linhas novas: 122 vídeos do Epaminondas Grau 1 (13/04/2023 → 12/07/2026) + 2 pranchas avulsas da Urânia.
- `reclassificar.csv` — 7 vídeos que são da Urânia e estavam como Epaminondas.
- `backup-urania-83itens.json` — o acervo bom da Urânia (fonte do restauro). NÃO APAGAR.

Formato do campo `anexos`: `Rótulo|URL ;; Rótulo|URL` (rótulos: Preâmbulo, Apresentação, Anexo, Prancha, Outro).
Esse é o formato que o publicar.html já grava. O ui.js precisa ser ensinado a lê-lo.

Depois da migração rodar e ser conferida, esta pasta pode ser removida do repo.
