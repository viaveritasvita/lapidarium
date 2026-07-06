/* ============================================================
   LAPIDARIUM — Motor de Busca (Fase 1)
   Busca "inteligente" sem IA e sem dependências externas:
   - normalização de português (acentos, caixa, plural simples)
   - expansão de consulta via tesauro maçônico (tesauro.json)
   - índice invertido com pesos por campo e busca por prefixo
   - facetas: origem, rito, grau, ano, autor, tipo, tags
   Funciona com qualquer coleção que siga o esqueleto do Acervo
   (vídeos, pranchas, rituais...). Custo: zero. Dono: nós.
   ============================================================ */

const LapidariumBusca = (() => {

  // ---------- normalização ----------
  const normalizar = (s) => (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // remove acentos
    .replace(/[∴.]/g, " ")                               // V∴M∴ -> v m
    .replace(/[^a-z0-9º\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // singular por regras do português (aplicado após remoção de acentos)
  const raiz = (t) => {
    if (t.length <= 3) return t;
    if (t.endsWith("oes") || t.endsWith("aes") || t.endsWith("aos")) return t.slice(0, -3) + "ao"; // sessoes->sessao
    if (t.endsWith("eis")) return t.slice(0, -3) + "el";   // veneraveis->veneravel
    if (t.endsWith("ns"))  return t.slice(0, -2) + "m";    // homens->homem
    if (t.endsWith("s"))   return t.slice(0, -1);          // colunas->coluna
    return t;
  };

  const tokenizar = (s) => normalizar(s).split(" ").filter(t => t.length > 1).map(raiz);

  // ---------- estado ----------
  let documentos = [];          // todos os itens do acervo
  let indice = new Map();       // token -> Map(docId -> peso acumulado)
  let tesauroTermos = new Map();// termo normalizado completo -> id do grupo
  let tesauroGrupos = [];       // id -> { cat, termos: [normalizados] }

  // pesos por campo
  const PESOS = { titulo: 5, tags: 4, autor: 3, rito: 3, grau: 3, ordem: 3, origem: 2, descricao: 2, transcricao: 1 };

  // ---------- carga ----------
  async function carregarJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Falha ao carregar " + url);
    return r.json();
  }

  function carregarTesauro(dados) {
    (dados.grupos || []).forEach((g, i) => {
      const termosNorm = g.termos.map(normalizar);
      tesauroGrupos[i] = { cat: g.cat, termos: termosNorm };
      termosNorm.forEach(t => tesauroTermos.set(t, i));
    });
  }

  // aceita o formato atual dos JSONs de vídeo ({grupo, videos:[...]})
  // e o formato futuro do Acervo (lista de itens com "tipo")
  function extrairItens(dados, urlFonte) {
    if (Array.isArray(dados)) return dados;
    if (dados.videos) {
      return dados.videos.map(v => ({
        tipo: "video",
        origem: dados.grupo || "",
        cor: dados.cor_identidade || "",
        autor: v.palestrante || v.autor || "",
        ...v
      }));
    }
    if (dados.itens) return dados.itens;
    console.warn("Formato não reconhecido:", urlFonte);
    return [];
  }

  function indexarDocumento(doc, id) {
    const campos = {
      titulo: doc.titulo, descricao: doc.descricao, autor: doc.autor,
      tags: (doc.tags || []).join(" "), rito: doc.rito, grau: doc.grau,
      ordem: doc.ordem, origem: doc.origem, transcricao: doc.trecho_transcricao
    };
    for (const [campo, valor] of Object.entries(campos)) {
      if (!valor) continue;
      for (const tok of tokenizar(valor)) {
        if (!indice.has(tok)) indice.set(tok, new Map());
        const m = indice.get(tok);
        m.set(id, (m.get(id) || 0) + PESOS[campo]);
      }
    }
  }

  // ---------- expansão pela consulta ----------
  // encontra grupos do tesauro cujo termo apareça na consulta
  // (varre janelas de 1 a 5 palavras para pegar termos compostos)
  function expandirConsulta(consulta) {
    const norm = normalizar(consulta);
    const palavras = norm.split(" ").filter(Boolean);
    const gruposAtivados = new Set();

    for (let tam = Math.min(5, palavras.length); tam >= 1; tam--) {
      for (let i = 0; i + tam <= palavras.length; i++) {
        const janela = palavras.slice(i, i + tam).join(" ");
        if (tesauroTermos.has(janela)) gruposAtivados.add(tesauroTermos.get(janela));
      }
    }

    const tokensOriginais = tokenizar(consulta);
    const tokensExpandidos = new Set(tokensOriginais);
    const termosExpandidos = [];

    gruposAtivados.forEach(gid => {
      tesauroGrupos[gid].termos.forEach(termo => {
        termosExpandidos.push(termo);
        termo.split(" ").map(raiz).forEach(t => { if (t.length > 1) tokensExpandidos.add(t); });
      });
    });

    return { tokensOriginais, tokensExpandidos: [...tokensExpandidos], gruposAtivados: [...gruposAtivados], termosExpandidos };
  }

  // ---------- busca ----------
  function buscar(consulta, filtros = {}, opcoes = {}) {
    const limite = opcoes.limite || 50;
    const pontuacao = new Map();
    let exp = { tokensOriginais: [], tokensExpandidos: [], gruposAtivados: [] };

    if (consulta && consulta.trim()) {
      exp = expandirConsulta(consulta);
      const setOriginais = new Set(exp.tokensOriginais);

      exp.tokensExpandidos.forEach(tok => {
        // termo expandido pelo tesauro vale 60% do peso do termo digitado
        const fator = setOriginais.has(tok) ? 1.0 : 0.6;

        // casamento exato
        if (indice.has(tok)) {
          indice.get(tok).forEach((peso, id) => {
            pontuacao.set(id, (pontuacao.get(id) || 0) + peso * fator);
          });
        }
        // prefixo (>=4 letras): "inicia" acha "iniciacao"
        if (tok.length >= 4) {
          indice.forEach((docs, termoIndex) => {
            if (termoIndex !== tok && termoIndex.startsWith(tok)) {
              docs.forEach((peso, id) => {
                pontuacao.set(id, (pontuacao.get(id) || 0) + peso * fator * 0.5);
              });
            }
          });
        }
      });
    } else {
      // sem consulta: lista tudo (para navegação por facetas)
      documentos.forEach((_, id) => pontuacao.set(id, 1));
    }

    // bônus: todos os termos digitados presentes no título
    if (exp.tokensOriginais.length > 1) {
      pontuacao.forEach((score, id) => {
        const tituloToks = new Set(tokenizar(documentos[id].titulo || ""));
        if (exp.tokensOriginais.every(t => tituloToks.has(t))) pontuacao.set(id, score * 1.5);
      });
    }

    // filtros de faceta
    const passaFiltros = (doc) => {
      for (const [chave, valor] of Object.entries(filtros)) {
        if (!valor) continue;
        if (chave === "ano") { if (!(doc.data || "").startsWith(valor)) return false; }
        else if (chave === "tags") { if (!(doc.tags || []).map(normalizar).includes(normalizar(valor))) return false; }
        else if (normalizar(doc[chave] || "") !== normalizar(valor)) return false;
      }
      return true;
    };

    let resultados = [...pontuacao.entries()]
      .map(([id, score]) => ({ score, item: documentos[id] }))
      .filter(r => passaFiltros(r.item))
      .sort((a, b) => b.score - a.score || (b.item.data || "").localeCompare(a.item.data || ""));

    const facetas = calcularFacetas(resultados.map(r => r.item));
    return { total: resultados.length, resultados: resultados.slice(0, limite), facetas, expansao: exp };
  }

  function calcularFacetas(itens) {
    const contar = (fn) => {
      const c = new Map();
      itens.forEach(i => { const v = fn(i); if (v) c.set(v, (c.get(v) || 0) + 1); });
      return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([valor, qtde]) => ({ valor, qtde }));
    };
    return {
      tipo: contar(i => i.tipo),
      origem: contar(i => i.origem),
      rito: contar(i => i.rito),
      grau: contar(i => i.grau),
      ano: contar(i => (i.data || "").slice(0, 4)),
      autor: contar(i => i.autor),
      tags: (() => {
        const c = new Map();
        itens.forEach(i => (i.tags || []).forEach(t => c.set(t, (c.get(t) || 0) + 1)));
        return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([valor, qtde]) => ({ valor, qtde }));
      })()
    };
  }

  // ---------- API pública ----------
  async function iniciar(config) {
    const fontes = config.fontes || [];
    if (config.tesauro) carregarTesauro(await carregarJSON(config.tesauro));
    for (const url of fontes) {
      try {
        const dados = await carregarJSON(url);
        extrairItens(dados, url).forEach(item => {
          const id = documentos.length;
          documentos.push(item);
          indexarDocumento(item, id);
        });
      } catch (e) { console.warn(e.message); }
    }
    return { documentos: documentos.length, termosIndexados: indice.size };
  }

  return { iniciar, buscar, normalizar, _debug: () => ({ documentos, indice, tesauroGrupos }) };
})();

if (typeof module !== "undefined") module.exports = LapidariumBusca;
