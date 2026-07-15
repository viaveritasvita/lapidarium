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

## Regra nº 3 — planilha com segurança (comprada com sangue em 15/07/2026)
1. **Nunca importe pra dentro da aba `Videos` com "Substituir página atual"** nem cole blocos com
   formatação. Uma "Importação padrão" **mesclou as colunas T:U** (`publicado_em` + `anexos`) nas
   327 linhas. Em célula mesclada só a âncora aceita valor: a coluna `anexos` virou
   **inescrevível em silêncio** — painel, script e mão gravavam e nada acontecia, sem erro nenhum.
   As 32 pranchas sumiram do site assim.
2. **Nunca confie em log de escrita. Releia o dado.** O script de migração reportou
   "gravei 30 anexos" e gravou zero. Toda rotina que escreve na planilha tem que **ler de volta e
   conferir a contagem** antes de dizer que deu certo.
3. **Backup antes de mexer**: duplique a aba (`Backup_AAAA-MM-DD_HHMM`). É de graça.
4. Recarregar dados do YouTube por cima **apaga** o que o YouTube não conhece: `anexos`, `tags`,
   `autor`. Se for repopular, faça **merge por `youtube_id`**, nunca overwrite.

## Regra nº 4 — padrão de nomes dos PDFs
`Urânia AAAA-MM-DD — Título limpo.pdf` (data da sessão + título limpo).
Sem vídeo/sem data → `Urânia — Título.pdf`. Para Epaminondas, trocar o prefixo por `Epaminondas`.

## Arquitetura (versão MODULAR é a oficial)
- **Páginas**: `index.html` (home), `buscar.html` (busca no acervo, com tesauro),
  `urania.html` / `epaminondas.html` (portais), `calendar.html`, `video.html` (bancada),
  `publicar.html` (painel de cadastro — "Acesso Restrito").
- **Motor**: `busca.js` (busca com normalização de acento + sinônimos do `tesauro.json`),
  `ui.js` (tema, olho animado, **barra superior** e **anexos**), `app.js` (Pedra do Dia/Acaso,
  favoritos, PWA), `fundo.js` (fundo iconográfico), `config.js` (`API_URL` + `SITE_URL`),
  `lapidarium.css` + `app.css`, `sw.js` (service worker — **bump `CACHE_VERSION` a cada mudança**).
- **Dois topos, de propósito**: a home usa o **brasão** (`.masthead`, inline no `index.html`,
  instância única). As outras 6 páginas usam a **barra fina** (`.topbar`), montada pelo
  `lapiMontarTopo()` do `ui.js` — **fonte única**. A div fica vazia:
  `<div class="topbar" id="lapiTopbar">`. `data-enxuto="1"` → só o botão Tema (é o `publicar.html`).
- **Dados — dois caminhos**:
  1. **Ao vivo (primário)**: as páginas chamam a `API_URL` (Apps Script) e leem a planilha-mãe em
     tempo real. Cadastrou/editou na planilha → o site reflete **sozinho, sem push**.
  2. **Fallback (estático)**: `videos-urania.json` / `videos-epaminondas.json` — usados só se a API
     não responder. Regere com **`python3 gerar_fallback.py`** (lê a API) e commite.

## Anexos (pranchas, apresentações, preâmbulos…)
Campo `anexos` da planilha. Formato: **`Rótulo|URL ;; Rótulo|URL`**
Rótulos do painel: `Preâmbulo`, `Apresentação`, `Anexo`, `Prancha`, `Outro`.
Compatibilidade: **URL pelada** (acervo antigo) é lida como `Prancha`.
- Quem **escreve**: `publicar.html` (sobe o arquivo pro Drive sozinho) e `salvarAnexos_()` no Apps Script.
- Quem **lê**: `lapiAnexosParse()` / `lapiAnexoBtn()` no `ui.js` → **um botão por material**.
- Se mexer no formato, mexa **nos dois lados**. Eles ficaram dessincronizados por muito tempo: o
  painel gravava `Rótulo|URL` e o `ui.js` jogava a string inteira como URL do botão.

## Como atualizar o conteúdo (o ciclo)
- **Dia a dia (1 item)**: cadastre pelo painel `publicar.html` → grava na planilha + Drive.
  O site ao vivo já mostra. Nada de git.
- **Fallback estático** (periodicamente): `python3 gerar_fallback.py` →
  `git add videos-urania.json videos-epaminondas.json` → commit → push.

## Divisão de trabalho entre superfícies
- **Cowork** = orquestra dados: pesquisa, prepara conteúdo, atualiza a planilha, sobe PDFs ao Drive.
  NÃO mexe no git.
- **Claude Code** = dono do repositório/deploy: versiona (git add pelo nome, commit, push), roda
  `gerar_fallback.py` (tem rede) e faz código pesado (transcrições).
- **Painel `publicar.html`** = cadastro leigo de 1 item por vez (planilha + Drive + API).

## IDs úteis
- Planilha-mãe (Sheets): `1Ryh35fkZnxcccb-SVBgtsDyiE3nsW-_omNeokZGiNvo`
- Drive → pasta `Lapidarium — Acervo`: `1VfZEU-xRiQEriNQvfvkHR-78PrCkLMoZ`
- Drive → subpasta `Materiais` (PDFs): `1c0nt9U9qDuawQ-YPSSp-gu_qj0NJQ4vU`
- Apps Script (API) fica **vinculado à planilha**: Extensões → Apps Script → `Código.gs`.

## Estado / histórico (memória compartilhada)
- **15/07/2026 — restauro + acervo completo.** Planilha: **451 itens**.
  - **Urânia: 90** (81 vídeos + 7 reclassificados + 2 pranchas avulsas) · **32 anexos** · 83 com
    tags · 41 com autor · 2023-01-15 → 2026-07-11.
  - **Epaminondas: 361** (Grau 1) · 2022-12-11 → **2026-07-12**.
  - Backup da planilha pré-migração: aba `Backup_2026-07-15_1641`.
- **A fonte do Epaminondas é o xlsx `palestras Epaminondas 4`**, não o YouTube. Ele tem 3 abas;
  `Plan1` é cópia quase exata da `Planilha1` (220 dos 225 ids em comum). O pulo do gato: dentro da
  `Planilha1` há **207 linhas onde o registro inteiro está como texto solto numa célula** —
  `Título - Palestrante - DD/MM/AAAA - EpaminondasOnline https://youtu.be/...`. É aí que vivem 2025
  e 2026. Quem lê só as colunas para em 01/2025 e acha que acabou — foi o que aconteceu, e o acervo
  ficou 14 meses defasado.
- **"O acervo do Ricardo"** = as linhas estruturadas. Ele catalogava em colunas até adoecer, em
  2025; quem continuou passou a jogar tudo em texto. Os dois lados juntos = 369 vídeos únicos.
- **Aguardando destino** (no xlsx, ainda não classificados): 4 do Café Filosofia Cósmica, 3 do
  ACAOL, 2 do AMEM. Estão no ar como Epaminondas (é o canal que publicou) — o campo `Local` do
  Ricardo diz onde a palestra **aconteceu**, que é coisa diferente de **quem publicou**.
- **Fora por ora**: Grau 2 (5) e Grau 3 (6+1). Regra vigente: **só Grau 1**. Ressalva honesta — as
  143 linhas de texto **não têm coluna Grau**; foram inferidas como Grau 1 (varri os títulos atrás
  de "Grau 2/3", "Companheiro", "Elevação" e só achei um Setenário Grau 3). Se aparecer um Grau 2
  no meio do acervo, veio daí.
- **APOSENTADOS (não usar)**: `gerar_dados.py` e `planilha.csv` — o CSV era um retrato manual que
  envelhecia calado (85 linhas contra 327 na planilha). Substituídos por `gerar_fallback.py`.
  `acervo.json` / `gerar_acervo.py` já removidos.
- **Pendências**: duração dos 122 vídeos novos do Epaminondas (o YouTube nunca foi colhido pra
  eles); enriquecer tags/descrições a partir do texto dos PDFs; transcrições dos vídeos (o tesauro
  segura a busca enquanto isso); dar destino aos 9 de outras casas; Grau 2 e 3.
