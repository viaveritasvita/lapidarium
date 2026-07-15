/**
 * Lapidarium — migração 15/07/2026
 * 1) Backup da aba Videos
 * 2) Restaura anexos/tags/autor da Urânia (apagados pela recarga do YouTube)
 * 3) Reclassifica 7 vídeos Epaminondas -> Urânia
 * 4) Insere 122 vídeos do Epaminondas Grau 1 + 2 pranchas avulsas
 *
 * Rodar UMA vez a função migrar(). Confira o Log no final.
 */
var RAW = 'https://raw.githubusercontent.com/viaveritasvita/lapidarium/main/_migracao/';
var ABA = 'Videos';

function csv_(nome) {
  var t = UrlFetchApp.fetch(RAW + nome, {muteHttpExceptions: true}).getContentText();
  return Utilities.parseCsv(t);
}
function idx_(hdr, nome) {
  var i = hdr.indexOf(nome);
  if (i < 0) throw new Error('Coluna não encontrada: ' + nome);
  return i;
}

function migrar() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(ABA);
  if (!sh) throw new Error('Aba ' + ABA + ' não existe');

  // ---------- 1) BACKUP ----------
  var carimbo = Utilities.formatDate(new Date(), 'America/Boa_Vista', 'yyyy-MM-dd_HHmm');
  var nomeBk = 'Backup_' + carimbo;
  if (ss.getSheetByName(nomeBk)) ss.deleteSheet(ss.getSheetByName(nomeBk));
  sh.copyTo(ss).setName(nomeBk);
  Logger.log('✓ Backup criado: ' + nomeBk);

  var dados = sh.getDataRange().getValues();
  var hdr = dados[0];
  var cYT = idx_(hdr, 'youtube_id'),
      cAnexos = idx_(hdr, 'anexos'),
      cTags = idx_(hdr, 'tags'),
      cAutor = idx_(hdr, 'autor'),
      cOrigem = idx_(hdr, 'origem');

  // mapa youtube_id -> linha da planilha (base 1)
  var linhaDe = {};
  for (var i = 1; i < dados.length; i++) {
    var y = String(dados[i][cYT] || '').trim();
    if (y) linhaDe[y] = i + 1;
  }

  // ---------- 2) RESTAURO (anexos, tags, autor) ----------
  var rest = csv_('restauro.csv');
  var rh = rest[0];
  var rYT = idx_(rh, 'youtube_id'), rAn = idx_(rh, 'anexos'), rTg = idx_(rh, 'tags'), rAu = idx_(rh, 'autor');
  var nAnexo = 0, nTag = 0, nAutor = 0, naoAchou = 0;
  for (var r = 1; r < rest.length; r++) {
    var y = String(rest[r][rYT] || '').trim();
    var ln = linhaDe[y];
    if (!ln) { naoAchou++; continue; }
    if (rest[r][rAn]) { sh.getRange(ln, cAnexos + 1).setValue(rest[r][rAn]); nAnexo++; }
    if (rest[r][rTg]) { sh.getRange(ln, cTags + 1).setValue(rest[r][rTg]); nTag++; }
    if (rest[r][rAu]) { sh.getRange(ln, cAutor + 1).setValue(rest[r][rAu]); nAutor++; }
  }
  Logger.log('✓ Restauro — anexos:%s tags:%s autores:%s | id não encontrado: %s', nAnexo, nTag, nAutor, naoAchou);

  // ---------- 3) RECLASSIFICAR ----------
  var rec = csv_('reclassificar.csv');
  var ch = rec[0];
  var cy = idx_(ch, 'youtube_id'), co = idx_(ch, 'origem_nova');
  var nRec = 0;
  for (var k = 1; k < rec.length; k++) {
    var y2 = String(rec[k][cy] || '').trim();
    var l2 = linhaDe[y2];
    if (l2) { sh.getRange(l2, cOrigem + 1).setValue(rec[k][co]); nRec++; }
  }
  Logger.log('✓ Reclassificados EP->Urânia: %s', nRec);

  // ---------- 4) INSERIR ----------
  var ins = csv_('inserir.csv');
  var ih = ins[0];
  var novas = [];
  var pulados = 0;
  for (var n = 1; n < ins.length; n++) {
    var yid = String(ins[n][idx_(ih, 'youtube_id')] || '').trim();
    if (yid && linhaDe[yid]) { pulados++; continue; }   // trava anti-duplicata
    var linha = [];
    for (var c = 0; c < hdr.length; c++) {
      var j = ih.indexOf(hdr[c]);
      linha.push(j >= 0 ? ins[n][j] : '');
    }
    novas.push(linha);
  }
  if (novas.length) {
    sh.getRange(sh.getLastRow() + 1, 1, novas.length, hdr.length).setValues(novas);
  }
  Logger.log('✓ Inseridas: %s linhas | puladas por já existirem: %s', novas.length, pulados);
  Logger.log('TOTAL de linhas agora: %s (antes: %s)', sh.getLastRow(), dados.length);
  Logger.log('Backup em: %s', nomeBk);
}
