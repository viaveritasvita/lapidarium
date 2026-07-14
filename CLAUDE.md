# Lapidarium — Guia do Projeto (constituição)

Site maçônico estático (GitHub Pages) que cataloga vídeos e pranchas dos grupos
**Grupo de Estudos Urânia** e **EpaminondasOnline**.
Repositório: github.com/viaveritasvita/lapidarium · No ar: https://viaveritasvita.github.io/lapidarium/

## Regra nº 1 — fonte de verdade única + fluxo de mão única
Cada coisa tem UM dono. Nunca edite o mesmo dado em dois lugares.

| Coisa | Fonte de verdade (onde editar) |
|---|---|
| Dados (vídeos, pranchas, autores, datas, tags, anexos) | **Planilha-mãe** (Google Sheets), aba `Videos` |
| Arquivos PDF das pranchas | **Google Drive → pasta `Materiais`** (pública) |
| Código do site + JSONs de fallback | **Este repositório GitHub** |

## Regra nº 2 — git com segurança
**Sempre `git add` pelo NOME do arquivo. Nunca `git add -A`, `git add .` nem `git commit -a`.**
Motivo: o checkout local pode aparecer com arquivos "deleted" (glitch de mount/sync);
adicionando pelo nome, nada que você não citar é tocado.

## Regra nº 3 — padrão de nomes dos PDFs
`Urânia AAAA-MM-DD — Título limpo.pdf` (data da sessão + título limpo).
Sem vídeo/sem data → `Urânia — Título.pdf`. Para Epaminondas, trocar o prefixo por `Epaminondas`.

## Arquitetura (IMPORTANTE — versão MODULAR é a oficial)
- **Páginas**: `index.html` (home), `buscar.html` (busca em todo o acervo, com tesauro),
  `urania.html` / `epaminondas.html` (portais por grupo), `calendar.html` (calendário),
  `publicar.html` (painel de cadastro — "Acesso Restrito").
- **Motor**: `busca.js` (busca com normalização de acento + expansão por sinônimos do
  `tesauro.json`), `ui.js` (tema, olho animado, botão "Prancha PDF" via `lapiAnexoBtn`),
  `config.js` (config central com `API_URL` do Apps Script e `SITE_URL`), `lapidarium.css`.
- **Dados — dois caminhos**:
  1. **Ao vivo (primário)**: as páginas chamam a `API_URL` (Apps Script) e leem a
     **planilha-mãe em tempo real**. Ou seja, ao cadastrar/editar na planilha (pelo painel
     `publicar.html`), o site reflete **sozinho, sem push**.
  2. **Fallback (estático)**: `videos-urania.json` e `videos-epaminondas.json` (commitados no
     repo) — usados só se a API não responder. Devem ser atualizados de tempos em tempos.
- **Prancha/PDF**: qualquer item com o campo `anexo` (JSON) ou `anexos` (API) preenchido
  ganha o botão **"Prancha PDF"** no card — vale para Urânia E Epaminondas.

## Como atualizar o conteúdo (o ciclo)
- **Dia a dia (1 item)**: cadastre pelo painel `publicar.html` → grava na planilha + Drive.
  O site ao vivo já mostra. Nada de git.
- **Atualizar o fallback estático** (recomendado periodicamente):
  1. Exporte a aba `Videos` como CSV: Sheets → *Arquivo → Fazer download → CSV*. Salve como `planilha.csv` na raiz do repo.
  2. `python3 gerar_dados.py planilha.csv`  → escreve `videos-urania.json`
     (use `--com-epaminondas` só quando o CSV já tiver o acervo do Epaminondas).
  3. `git add videos-urania.json planilha.csv` → commit → push.

## Schema dos videos-*.json (fallback)
Topo: `{ "grupo", "tema", "cor_identidade", "videos": [ ... ] }`
Item: `{ id, titulo, data, palestrante, youtube_id, url, thumbnail, tags:[...], transcricao_status, tipo, anexo }`
- `tipo`: `video` ou `prancha` · `anexo`: link do PDF no Drive (vira o botão "Prancha PDF")
- Prancha sem vídeo: `youtube_id`/`url`/`thumbnail` vazios, `tipo:"prancha"`, `anexo` preenchido.

## Colunas da planilha-mãe (aba Videos)
`id, tipo, titulo, descricao, autor, data, origem, rito, grau, ordem, tags, url, youtube_id, thumbnail, transcricao_status, acesso, perguntas_aprofundamento, publicado_por, publicado_em, anexos`
(`autor` vira `palestrante`; `origem` vira `grupo`; `anexos` vira `anexo`.)

## Divisão de trabalho entre superfícies
- **Cowork** = orquestra dados: pesquisa, prepara conteúdo, atualiza a planilha, sobe PDFs ao Drive, roda `gerar_dados.py`. NÃO mexe no git.
- **Claude Code** = dono do repositório/deploy: versiona (git add pelo nome, commit, push) e faz código pesado (transcrições). ÚNICO que mexe no git.
- **Painel `publicar.html`** = cadastro leigo de 1 item por vez (planilha + Drive + API).

## IDs úteis
- Planilha-mãe (Sheets): `1Ryh35fkZnxcccb-SVBgtsDyiE3nsW-_omNeokZGiNvo`
- Drive → pasta `Lapidarium — Acervo`: `1VfZEU-xRiQEriNQvfvkHR-78PrCkLMoZ`
- Drive → subpasta `Materiais` (PDFs): `1c0nt9U9qDuawQ-YPSSp-gu_qj0NJQ4vU`

## Estado / histórico (memória compartilhada)
- 13/07/2026: unificação do site na versão MODULAR. Foi corrigido um engano em que uma home
  antiga (arquivo único, menu "em breve") havia sobrescrito a modular — restaurada do git (commit 1424e76).
- Urânia: 81 vídeos (2023→2026) + 32 pranchas em PDF no Drive; 30 pranchas ligadas a vídeos,
  2 avulsas ("A Simbologia da Morte"; "Reconhecimento e Regularidade" — sessão não gravada).
- Correções: Enxertos→"O Espelho Hexagonal" (28/02/2026); Dia Internacional→"22 de Fevereiro"
  (21/02/2026); "Maçonaria em estado terminal"→"Por que o Maçom não estuda?" (05/07/2025).
- Epaminondas: só 6 vídeos-semente por enquanto (acervo completo virá depois).
- APOSENTADOS (não usar): `acervo.json` e `gerar_acervo.py` — trilho paralelo antigo, substituídos
  por `videos-urania.json` + `gerar_dados.py`. Podem ser removidos do repo (`git rm`).
- Pendências: enriquecer tags/descrições a partir do texto dos PDFs; transcrições dos vídeos
  (base da busca inteligente — o tesauro já ajuda); acervo do Epaminondas.
