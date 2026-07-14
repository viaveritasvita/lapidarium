/* ============================================================
   LAPIDARIUM — app.js · features de usuário (100% client-side)
   - Favoritos ("minhas pedras") e Visto ("pedras lapidadas")
     em localStorage, por aparelho, sem login.
   - Pedra do Dia (determinística pela data) e Pedra ao Acaso
     (roleta com o delta girando).
   - Tema claro/escuro persistente · registro do Service Worker.
   Chaves de localStorage:
     lapidarium:favoritos  → array de ids
     lapidarium:vistos     → array de ids
     lapidarium:ultima     → {k, titulo, ts} (continuar de onde parou)
     lapidarium:tema       → 'light' | 'dark'
   ============================================================ */
(function () {
  "use strict";

  var K_FAV = 'lapidarium:favoritos',
      K_VISTO = 'lapidarium:vistos',
      K_ULT = 'lapidarium:ultima',
      K_TEMA = 'lapidarium:tema';

  // ---------- util ----------
  function esc(s) {
    return ('' + (s == null ? '' : s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function lerSet(k) {
    try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); }
    catch (e) { return new Set(); }
  }
  function gravarSet(k, s) {
    try { localStorage.setItem(k, JSON.stringify(Array.from(s))); } catch (e) {}
  }
  var favs = lerSet(K_FAV), vistos = lerSet(K_VISTO);

  function chave(it) { return (it && (it.youtube_id || it.id)) || ''; }

  // ---------- acervo unificado (API viva → fallback JSON) ----------
  function normalizarItem(v) {
    var tags = Array.isArray(v.tags) ? v.tags
      : ('' + (v.tags || '')).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
    var o = {};
    for (var p in v) o[p] = v[p];
    o.origem = v.origem || '';
    o.autor = v.autor || v.palestrante || '';
    o.anexo = v.anexo || v.anexos || '';
    o.tags = tags;
    return o;
  }
  var _acervoP = null;
  function acervo() {
    if (_acervoP) return _acervoP;
    _acervoP = (async function () {
      var itens = null;
      if (typeof lapiFetch === 'function') itens = await lapiFetch('video');
      if (!itens || !itens.length) {
        itens = [];
        var fontes = [['videos-urania.json', 'Grupo de Estudos Urânia'],
                      ['videos-epaminondas.json', 'EpaminondasOnline']];
        for (var i = 0; i < fontes.length; i++) {
          try {
            var d = await (await fetch(fontes[i][0])).json();
            (d.videos || []).forEach(function (v) {
              if (!v.origem) v.origem = d.grupo || fontes[i][1];
              itens.push(v);
            });
          } catch (e) {}
        }
      }
      return itens.map(normalizarItem).filter(function (it) { return chave(it); });
    })();
    return _acervoP;
  }

  function destino(it) {
    var k = chave(it);
    if (it.youtube_id) return 'video.html?v=' + encodeURIComponent(k);
    if (it.anexo) return it.anexo;
    return 'video.html?v=' + encodeURIComponent(k);
  }
  function thumbDe(it) {
    return it.thumbnail || (it.youtube_id ? 'https://img.youtube.com/vi/' + it.youtube_id + '/hqdefault.jpg' : '');
  }

  // ---------- favoritos / lapidadas ----------
  function ehFavorita(k) { return favs.has(k); }
  function ehLapidada(k) { return vistos.has(k); }
  function alternarFavorita(k) {
    favs.has(k) ? favs.delete(k) : favs.add(k);
    gravarSet(K_FAV, favs); atualizarBotoes(k); return favs.has(k);
  }
  function alternarLapidada(k) {
    vistos.has(k) ? vistos.delete(k) : vistos.add(k);
    gravarSet(K_VISTO, vistos); atualizarBotoes(k); return vistos.has(k);
  }
  function marcarLapidada(k) {
    if (!k || vistos.has(k)) return;
    vistos.add(k); gravarSet(K_VISTO, vistos); atualizarBotoes(k);
  }
  function contadores() { return { lapidadas: vistos.size, favoritas: favs.size }; }

  function botoesHtml(it) {
    var k = chave(it);
    if (!k) return '';
    return '<span class="la-acoes">'
      + '<button type="button" class="la-btn la-fav' + (ehFavorita(k) ? ' on' : '') + '" data-k="' + esc(k)
      + '" title="Favoritar (minhas pedras)" aria-label="Favoritar">' + (ehFavorita(k) ? '★' : '☆') + '</button>'
      + '<button type="button" class="la-btn la-visto' + (ehLapidada(k) ? ' on' : '') + '" data-k="' + esc(k)
      + '" title="Marcar como pedra lapidada (visto)" aria-label="Marcar como visto">✓</button>'
      + '</span>';
  }
  function atualizarBotoes(k) {
    document.querySelectorAll('.la-btn[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]').forEach(function (b) {
      var on = b.classList.contains('la-fav') ? ehFavorita(k) : ehLapidada(k);
      b.classList.toggle('on', on);
      if (b.classList.contains('la-fav')) b.textContent = on ? '★' : '☆';
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      var vc = b.closest('.vc');
      if (vc) vc.classList.toggle('lapidada', ehLapidada(k));
    });
  }
  function decorarCards(raiz) {
    (raiz || document).querySelectorAll('.la-btn.la-visto[data-k]').forEach(function (b) {
      var vc = b.closest('.vc');
      if (vc) vc.classList.toggle('lapidada', ehLapidada(b.dataset.k));
    });
  }
  // clique nos botões dentro dos cards (que são <a>): captura antes da navegação
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.la-btn');
    if (!b || !b.dataset.k) return;
    e.preventDefault(); e.stopPropagation();
    (b.classList.contains('la-fav') ? alternarFavorita : alternarLapidada)(b.dataset.k);
  }, true);

  // ---------- continuar de onde parou ----------
  function registrarUltima(it) {
    try { localStorage.setItem(K_ULT, JSON.stringify({ k: chave(it), titulo: it.titulo || '', ts: Date.now() })); }
    catch (e) {}
  }
  function ultima() {
    try { return JSON.parse(localStorage.getItem(K_ULT) || 'null'); } catch (e) { return null; }
  }

  // ---------- Pedra do Dia (determinística: seed = AAAAMMDD) ----------
  function pedraDoDia(itens, data) {
    if (!itens || !itens.length) return null;
    var ord = itens.slice().sort(function (a, b) { return chave(a) < chave(b) ? -1 : 1; });
    var d = data || new Date();
    var h = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return ord[h % ord.length];
  }

  async function montarPedraDia() {
    var el = document.getElementById('pedraDia');
    if (!el) return;
    var itens = await acervo();
    var p = pedraDoDia(itens);
    if (!p) { el.hidden = true; return; }
    var hoje = new Date(), dd = String(hoje.getDate()).padStart(2, '0'),
        mm = String(hoje.getMonth() + 1).padStart(2, '0');
    var th = thumbDe(p), href = destino(p), externo = !p.youtube_id && p.anexo;
    var c = contadores(), u = ultima();
    var foot = '';
    if (c.lapidadas > 0 || c.favoritas > 0) {
      foot = 'Você já lapidou <b>' + c.lapidadas + '</b> ' + (c.lapidadas === 1 ? 'pedra' : 'pedras')
        + (c.favoritas ? ' · <b>' + c.favoritas + '</b> na sua coleção' : '')
        + ' · <a href="buscar.html?ver=favoritas">Minhas pedras ▸</a>';
    } else {
      foot = 'Cada pedra estudada é uma pedra lapidada. <a href="buscar.html">Comece hoje ▸</a>';
    }
    if (u && u.k && u.k !== chave(p)) {
      foot += '<br>Continuar de onde parou: <a href="video.html?v=' + encodeURIComponent(u.k) + '">' + esc(u.titulo || 'última pedra') + ' ▸</a>';
    }
    el.innerHTML =
      '<div class="pdia-grid">'
      + '<a class="pdia-thumb" href="' + esc(href) + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + '>'
      + (th ? '<img src="' + esc(th) + '" alt="" loading="lazy">' : '<span class="pdia-delta">◬</span>')
      + '</a>'
      + '<div class="pdia-body">'
      + '<p class="pdia-kicker">Pedra do Dia · ' + dd + '/' + mm + '/' + hoje.getFullYear() + '</p>'
      + '<p class="pdia-title"><a href="' + esc(href) + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + '>' + esc(p.titulo || '(sem título)') + '</a></p>'
      + '<p class="pdia-meta">' + esc([(p.origem || '').replace('Grupo de Estudos ', ''), p.autor,
          (p.data || '').slice(0, 10).split('-').reverse().join('/')].filter(Boolean).join(' · ')) + '</p>'
      + '<div class="pdia-row">'
      + '<a class="pdia-cta" href="' + esc(href) + '"' + (externo ? ' target="_blank" rel="noopener"' : '') + '>Lapidar esta pedra ▸</a>'
      + '<button type="button" class="pdia-acaso" onclick="LapidariumApp.pedraAoAcaso()">⟡ Pedra ao Acaso</button>'
      + botoesHtml(p)
      + '</div>'
      + '<p class="pdia-foot">' + foot + '</p>'
      + '</div></div>';
  }

  // ---------- Pedra ao Acaso (roleta com o delta) ----------
  var DELTA_SVG =
    '<svg viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="42,5 78,75 6,75" stroke="#c9a84c" stroke-width="2.4" fill="rgba(201,168,76,0.05)"/>'
    + '<ellipse cx="42" cy="54" rx="12" ry="7.5" stroke="#f0d98a" stroke-width="1.4" fill="none"/>'
    + '<circle cx="42" cy="54" r="5" stroke="#c9a84c" stroke-width="1" fill="rgba(201,168,76,0.12)"/>'
    + '<circle cx="42" cy="54" r="2.2" fill="#f0d98a"/></svg>';

  var _sorteando = false;
  async function pedraAoAcaso() {
    if (_sorteando) return;
    _sorteando = true;
    var ov = document.createElement('div');
    ov.className = 'la-overlay';
    ov.innerHTML = '<div class="la-roleta girando">' + DELTA_SVG
      + '<p class="la-rot-kicker">Lapide uma pedra ao acaso</p>'
      + '<p class="la-rot-title">O acaso escolhe. O Irmão lapida.</p>'
      + '<p class="la-rot-sub">girando a pedra…</p></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('on'); });
    function fechar() {
      _sorteando = false;
      ov.classList.remove('on');
      setTimeout(function () { ov.remove(); }, 320);
      document.removeEventListener('keydown', escFecha);
    }
    function escFecha(e) { if (e.key === 'Escape') fechar(); }
    document.addEventListener('keydown', escFecha);
    ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });

    var itens = await acervo();
    if (!itens.length) { fechar(); return; }
    var alvo = itens[Math.floor(Math.random() * itens.length)];
    var titulo = ov.querySelector('.la-rot-title'), sub = ov.querySelector('.la-rot-sub');
    var ticks = 0, max = 14;
    var timer = setInterval(function () {
      ticks++;
      if (!document.body.contains(ov)) { clearInterval(timer); return; }
      if (ticks < max) {
        titulo.textContent = itens[Math.floor(Math.random() * itens.length)].titulo || '…';
      } else {
        clearInterval(timer);
        titulo.textContent = alvo.titulo || '(sem título)';
        titulo.classList.add('revelada');
        sub.textContent = [(alvo.origem || '').replace('Grupo de Estudos ', ''),
          alvo.tipo === 'prancha' ? 'prancha' : 'vídeo'].filter(Boolean).join(' · ');
        setTimeout(function () {
          if (!document.body.contains(ov)) return;
          var url = destino(alvo);
          if (!alvo.youtube_id && alvo.anexo) { window.open(url, '_blank', 'noopener'); fechar(); }
          else location.href = url;
        }, 1100);
      }
    }, 95);
  }

  // ---------- tema persistente ----------
  function aplicarTema() {
    try {
      var t = localStorage.getItem(K_TEMA);
      if (t === 'light') document.body.classList.add('light');
      else if (t === 'dark') document.body.classList.remove('light');
      var b = document.getElementById('themeBtn');
      if (b && document.body.classList.contains('light')) b.textContent = '☾ Tema';
    } catch (e) {}
  }
  function vigiarTema() {
    var b = document.getElementById('themeBtn');
    if (!b) return;
    b.addEventListener('click', function () {
      try { localStorage.setItem(K_TEMA, document.body.classList.contains('light') ? 'light' : 'dark'); } catch (e) {}
    });
  }

  // ---------- relacionados (mesmo grupo e tags em comum) ----------
  function relacionados(item, itens, n) {
    n = n || 6;
    var k = chave(item);
    var tags = (item.tags || []).map(function (t) { return ('' + t).toLowerCase(); });
    return itens
      .filter(function (o) { return chave(o) !== k; })
      .map(function (o) {
        var s = 0;
        if (o.origem && item.origem && o.origem === item.origem) s += 2;
        (o.tags || []).forEach(function (t) {
          if (tags.indexOf(('' + t).toLowerCase()) >= 0) s += 3;
        });
        if (!ehLapidada(chave(o))) s += 0.5;   // leve preferência por pedras ainda brutas
        return { s: s, o: o };
      })
      .sort(function (a, b) { return b.s - a.s || ('' + (b.o.data || '')).localeCompare('' + (a.o.data || '')); })
      .slice(0, n)
      .map(function (r) { return r.o; });
  }

  // ---------- botão fixo + atalho de teclado ----------
  function montarAtalhos() {
    if (location.pathname.indexOf('publicar') >= 0) return;
    if (!document.querySelector('.acaso-btn')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'acaso-btn';
      b.title = 'Pedra ao Acaso (tecla A)';
      b.innerHTML = '⟡ <span class="acaso-rotulo">Acaso</span>';
      b.addEventListener('click', pedraAoAcaso);
      document.body.appendChild(b);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'a' && e.key !== 'A') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      pedraAoAcaso();
    });
  }

  // ---------- Instalar app (PWA) ----------
  var _instEvt = null;
  function montarInstalar() {
    if (location.pathname.indexOf('publicar') >= 0) return;
    var rodape = document.querySelector('footer');
    if (!rodape || document.getElementById('btnInstalar')) return;
    var ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var jaInstalado = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (jaInstalado) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'btnInstalar'; b.className = 'instalar-btn'; b.hidden = true;
    b.innerHTML = '&#8681; Instalar o app';
    b.title = 'Instalar o Lapidarium como aplicativo';
    rodape.appendChild(b);
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); _instEvt = e; b.hidden = false;
    });
    window.addEventListener('appinstalled', function () { _instEvt = null; b.hidden = true; });
    if (ehIOS) b.hidden = false;  // Safari/iOS não dispara beforeinstallprompt
    b.addEventListener('click', function () {
      if (_instEvt) {
        var ev = _instEvt; _instEvt = null;
        ev.prompt();
        if (ev.userChoice && ev.userChoice.then) ev.userChoice.then(function (r) {
          if (r && r.outcome === 'accepted') b.hidden = true; else _instEvt = ev;
        });
        return;
      }
      var d = document.getElementById('dicaInstalar');
      if (!d) {
        d = document.createElement('p');
        d.id = 'dicaInstalar'; d.className = 'instalar-dica';
        d.textContent = 'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".';
        b.insertAdjacentElement('afterend', d);
      } else { d.hidden = !d.hidden; }
    });
  }

  // ---------- Service Worker ----------
  function registrarSW() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  // ---------- init ----------
  function init() {
    aplicarTema(); vigiarTema(); montarAtalhos(); montarPedraDia(); montarInstalar(); registrarSW();
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  window.LapidariumApp = {
    acervo: acervo, chave: chave, destino: destino, thumbDe: thumbDe,
    ehFavorita: ehFavorita, ehLapidada: ehLapidada,
    alternarFavorita: alternarFavorita, alternarLapidada: alternarLapidada,
    marcarLapidada: marcarLapidada, contadores: contadores,
    botoesHtml: botoesHtml, decorarCards: decorarCards,
    pedraDoDia: pedraDoDia, pedraAoAcaso: pedraAoAcaso,
    relacionados: relacionados, registrarUltima: registrarUltima, ultima: ultima,
    esc: esc
  };
})();
