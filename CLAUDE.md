# Lapidarium — Guia do Projeto (constituição)

Site maçônico estático (GitHub Pages) que cataloga vídeos e pranchas dos grupos
**Grupo de Estudos Urânia** e **EpaminondasOnline**.
Repositório: github.com/viaveritasvita/lapidarium · No ar: https://viaveritasvita.github.io/lapidarium/

## Regra nº 1 — fonte de verdade única + fluxo de mão única
Cada coisa tem UM dono. Nunca edite o mesmo dado em dois lugares.

| Coisa | Fonte de verdade (onde editar) |
|---|---|
| Dados (vídeos, pranchas, autores, datas, tags, anexos) | **Planilha-mãe** (Google Sheets), aba `Videos` |
| Arquivos PDF das pranchas | **Google Drive → pasta `Materiais`** (pública, "qualquer um com link") |
| Código do site + `acervo.json` publicado | **Este repositório GitHub** |

Fluxo, sempre nesta direção:
`Planilha (+PDF no Drive) → gerar_acervo.py → acervo.json → git push → site no ar`

Nunca o contrário. Não edite `acervo.json` nem `buscar.html` na mão para mudar dados.

## Regra nº 2 — git com segurança
**Sempre `git add` pelo NOME do arquivo. Nunca `git add -A`, `git add .` nem `git commit -a`.**
Motivo: o checkout local pode aparecer com arquivos "deleted" (glitch de mount/sync);
adicionando pelo nome, nada que você não citar é tocado.

## Regra nº 3 — padrão de nomes dos PDFs
`Urânia AAAA-MM-DD — Título limpo.pdf` (data da sessão + título sem "Grupo de Estudos Urânia"/data no fim).
Sem vídeo/sem data → `Urânia — Título.pdf`. (Para Epaminondas, trocar o prefixo por `Epaminondas`.)

## Como o site funciona
- `index.html` — home (portais, busca, carrossel dos últimos vídeos). O carrossel e o card do
  Urânia têm números; ao atualizar o acervo, revise-os se quiser (hoje: Urânia 81 vídeos, desde 2023, 19 oradores).
- `buscar.html` — catálogo/busca. **Carrega `acervo.json` via fetch** (dados NÃO ficam embutidos).
  Filtros: grupo, tipo (vídeo/prancha), tema, ano; busca textual (ignora acento). Lê `?q=`, `?grupo=`, `?tipo=`, `?tema=`, `?ano=`.
- O botão **"Prancha PDF"** de um card aparece só quando aquele item tem `pdf` preenchido — vale para qualquer grupo (Urânia ou Epaminondas).

## Como atualizar o conteúdo (o ciclo)
1. Edite os dados na **planilha-mãe** (pelo painel `publicar.html` ou direto).
2. Exporte a aba `Videos` como CSV: no Sheets, *Arquivo → Fazer download → CSV* (ou baixe pela URL gviz). Salve como `planilha.csv` na raiz do repo.
3. Regenere o acervo: `python3 gerar_acervo.py`  (lê `planilha.csv`, escreve `acervo.json`; imprime um resumo).
4. Publique só o que mudou:
   `git add acervo.json planilha.csv`  (e `buscar.html`/`index.html` se mexeu neles)
   `git commit -m "Acervo: <descrição>"` e `git push`.
5. Confira no ar em 1–2 min (GitHub Pages recompila).

## PDFs novos (padrão de ingestão)
Ao receber um PDF de prancha: renomear no padrão acima → subir na pasta `Materiais` do Drive →
cadastrar/atualizar a linha do vídeo na planilha com o link do Drive na coluna `anexos`.

## Divisão de trabalho entre superfícies
- **Cowork** = orquestra dados: pesquisa, prepara conteúdo, atualiza a planilha, sobe PDFs ao Drive, roda `gerar_acervo.py`. NÃO mexe no git.
- **Claude Code** = dono do repositório/deploy: recebe os arquivos prontos, versiona (git add pelo nome, commit, push) e faz código pesado (ex.: transcrições). ÚNICO que mexe no git.
- **Painel `publicar.html`** = cadastro leigo de 1 item por vez (grava na planilha + Drive).

## Colunas da planilha-mãe (aba Videos)
`id, tipo, titulo, descricao, autor, data, origem, rito, grau, ordem, tags, url, youtube_id, thumbnail, transcricao_status, acesso, perguntas_aprofundamento, publicado_por, publicado_em, anexos`
- `tipo`: `video` ou `prancha` · `origem`: `Grupo de Estudos Urânia` ou `EpaminondasOnline`
- `tags`: separadas por `;` · `anexos`: link do PDF no Drive (vira o botão "Prancha PDF")

## IDs úteis
- Planilha-mãe (Sheets): `1Ryh35fkZnxcccb-SVBgtsDyiE3nsW-_omNeokZGiNvo`
- Drive → pasta `Lapidarium — Acervo`: `1VfZEU-xRiQEriNQvfvkHR-78PrCkLMoZ`
- Drive → subpasta `Materiais` (PDFs): `1c0nt9U9qDuawQ-YPSSp-gu_qj0NJQ4vU`

## Estado / histórico (memória compartilhada)
- Urânia: 81 vídeos catalogados (2023→2026) + 32 pranchas em PDF no Drive; 30 pranchas ligadas a vídeos, 2 avulsas ("A Simbologia da Morte", "Reconhecimento e Regularidade" — esta com sessão não gravada).
- Correções aplicadas: Enxertos→vídeo "O Espelho Hexagonal" (28/02/2026); Dia Internacional do Maçom→"22 de Fevereiro" (21/02/2026); "A Maçonaria em estado terminal"→"Por que o Maçom não estuda?" (05/07/2025).
- Epaminondas: só 2 vídeos-semente por enquanto (acervo completo virá depois).
- Pendências conhecidas: enriquecer tags/descrições a partir do texto dos PDFs; extrair transcrições dos vídeos do YouTube (base da busca inteligente); localizar/casar 5 vídeos que faltavam.
- `tags` atuais foram derivadas do TÍTULO (aproximação), não do texto integral — refinar depois.
