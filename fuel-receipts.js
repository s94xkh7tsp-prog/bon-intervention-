/* JM Express — tickets carburant : originaux locaux, export comptable sans serveur. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let pending = null, busy = false, importing = false, target = null;
  const amount = v => Number(String(v).replace(',', '.'));
  const round = n => Math.round(n * 100) / 100;
  const uid = () => crypto.randomUUID();
  async function registry() {
    let result;
    try { result = await window.storage.get('registreFrais'); }
    catch (err) { if (err.message === 'not found') return []; throw err; }
    const rows = JSON.parse(result.value);
    if (!Array.isArray(rows)) throw Error('Registre des frais illisible : restaure une sauvegarde avant d’encoder.');
    return rows;
  }
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let database;
  function db() {
    if (!database) database = new Promise((resolve, reject) => {
      const r = indexedDB.open('jm-fuel-receipts', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => { database = null; reject(r.error); };
    });
    return database;
  }
  async function fileStore(action, key, value) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction('files', action === 'get' ? 'readonly' : 'readwrite');
      const s = tx.objectStore('files'), r = action === 'put' ? s.put(value, key) : s[action](key);
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('Stockage indisponible'));
    });
  }
  async function validate(file) {
    if (!file || file.size === 0 || file.size > 20 * 1024 * 1024) throw Error('Choisis un PDF ou une photo de moins de 20 Mo.');
    const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const pdf = new TextDecoder().decode(b.slice(0, 5)) === '%PDF-';
    const jpg = b[0] === 255 && b[1] === 216;
    const png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
    const heic = new TextDecoder().decode(b.slice(4, 12)).match(/^ftyp(?:heic|heix|hevc|hevx|mif1|msf1)/);
    if (!pdf && !jpg && !png && !heic) throw Error('Format accepté : PDF, JPEG, PNG ou HEIC.');
    return {blob: new Blob([file], {type: pdf ? 'application/pdf' : jpg ? 'image/jpeg' : png ? 'image/png' : 'image/heic'}), name: file.name, ext: pdf ? 'pdf' : jpg ? 'jpg' : png ? 'png' : 'heic'};
  }
  function status() { $('fuelFileStatus').textContent = pending ? '✓ ' + pending.name : 'Aucun ticket joint'; }
  window.jmFuelPick = () => { target = null; $('fuelFile').click(); };
  window.jmFuelRemove = () => { pending = null; status(); };
  const oldOpen = ouvrirPlein;
  ouvrirPlein = function() { oldOpen(); pending = null; target = null; $('fuelStation').value = ''; $('fuelReference').value = ''; $('fuelExact').value = ''; status(); };
  window.jmFuelTotal = () => {
    const n = amount($('fuelExact').value);
    if ($('fuelExact').value && Number.isFinite(n) && n > 0) $('pleinTotal').textContent = fmt(round(n));
    else majTotalPlein();
  };
  const oldTotal = majTotalPlein;
  majTotalPlein = function() { oldTotal(); const n = amount($('fuelExact').value); if ($('fuelExact').value && n > 0 && Number.isFinite(n)) $('pleinTotal').textContent = fmt(round(n)); };
  enregistrerPlein = async function() {
    if (busy || importing) return showToast('Patiente pendant l’import du ticket.');
    const litres = amount($('pleinLitres').value), prixL = amount($('pleinPrixL').value), exact = amount($('fuelExact').value);
    const date = $('pleinDate').value, montant = $('fuelExact').value ? exact : litres * prixL;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(montant > 0) || !Number.isFinite(montant) || montant > 100000 || litres < 0 || prixL < 0 || !Number.isFinite(litres) || !Number.isFinite(prixL)) return showToast('Vérifie la date et le montant. Litres et prix au litre sont facultatifs avec un total exact.');
    busy = true; $('fuelSave').disabled = true;
    const id = uid(); let stored = false, saved = false;
    try {
      const r = await registry();
      if (pending) { await fileStore('put', id, pending); stored = true; }
      const station = $('fuelStation').value.trim(), reference = $('fuelReference').value.trim();
      r.push({id, categorie:'gasoil', libelle:'Gasoil' + (station ? ' — ' + station : '') + (litres ? ' ' + litres.toFixed(2) + ' L' : ''), montant:round(montant), echeance:date, paye:date, litres, prixL, lieu:PLEIN_LIEU, station, reference, justificatif:pending ? {id, name:pending.name, ext:pending.ext, size:pending.blob.size} : null});
      await window.storage.set('registreFrais', JSON.stringify(r)); saved = true;
      pending = null; fermerPlein(); showToast(stored ? 'Plein et ticket enregistrés' : 'Plein enregistré sans ticket');
      try { if (prixL > 0) await verifierAlerteDiesel(prixL, PLEIN_LIEU); } catch (_) {}
    } catch (_) { if (stored && !saved) await fileStore('delete', id).catch(() => {}); showToast('Enregistrement impossible : le ticket reste sélectionné. Réessaie ou libère de l’espace.'); }
    finally { busy = false; $('fuelSave').disabled = false; }
  };
  async function selected() { return (await registry()).map((f, i) => ({f, i})).filter(({f}) => f.categorie === 'gasoil' && String(f.paye).startsWith($('fuelYear').value)); }
  window.jmFuelList = async () => {
    const rows = await selected();
    $('fuelList').innerHTML = rows.map(({f, i}) => '<div class="grp"><strong>' + esc(f.paye) + ' · ' + esc(f.station || f.libelle) + ' · ' + esc(fmt(f.montant)) + '</strong><p>' + esc(f.reference || '') + '</p>' + (f.justificatif ? '<p>' + esc(f.justificatif.name) + '</p><button class="ghost" data-view="' + i + '">Ouvrir / partager le ticket</button>' : '<p>Ticket manquant</p>') + '<button class="ghost" data-attach="' + i + '">' + (f.justificatif ? 'Remplacer le ticket' : 'Joindre le ticket') + '</button></div>').join('') || '<p>Aucun plein pour cette année.</p>';
  };
  window.jmFuelOpen = async () => {
    if (typeof closeMenu === 'function') closeMenu(); if (typeof closeGestion === 'function') closeGestion();
    const years = [...new Set([(new Date()).getFullYear().toString(), ...(await registry()).map(f => String(f.paye || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y))])].sort().reverse();
    $('fuelYear').innerHTML = years.map(y => '<option>' + y + '</option>').join('');
    $('fuelArchive').classList.add('show'); await jmFuelList();
  };
  function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  async function share(file) { if (navigator.canShare && navigator.canShare({files:[file]})) await navigator.share({files:[file]}); else download(file, file.name); }
  $('fuelFile').addEventListener('change', async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    importing = true; $('fuelSave').disabled = true;
    try {
      const v = await validate(file);
      if (target === null) { pending = v; status(); return; }
      const rows = await registry(), f = rows[target];
      if (!f || f.categorie !== 'gasoil') throw Error('Plein introuvable');
      const id = uid(), previous = f.justificatif;
      await fileStore('put', id, v);
      f.justificatif = {id, name:v.name, ext:v.ext, size:v.blob.size};
      try { await window.storage.set('registreFrais', JSON.stringify(rows)); } catch (err) { await fileStore('delete', id); throw err; }
      if (previous) await fileStore('delete', previous.id).catch(() => {});
      await jmFuelList(); showToast('Ticket joint au plein');
    } catch (err) { showToast(err.message || 'Import impossible'); }
    finally { importing = false; $('fuelSave').disabled = busy; }
  });
  $('fuelList').addEventListener('click', async e => {
    const a = e.target.closest('[data-attach]'), v = e.target.closest('[data-view]');
    if (a) { target = Number(a.dataset.attach); $('fuelFile').click(); }
    if (v) try { const r = await registry(), j = r[Number(v.dataset.view)].justificatif, file = await fileStore('get', j.id); if (!file) throw Error('Ticket absent de ce téléphone. Réimporte le fichier original.'); await share(new File([file.blob], file.name, {type:file.blob.type})); } catch (err) { if (err.name !== 'AbortError') showToast(err.message); }
  });
  // ZIP sans compression : conserve exactement les octets des PDF et photos.
  function crc32(b) { let c = -1; for (const n of b) { c ^= n; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; }
  async function zip(entries) {
    const parts = [], central = []; let offset = 0;
    for (const [name, blob] of entries) {
      const n = new TextEncoder().encode(name), b = new Uint8Array(await blob.arrayBuffer()), crc = crc32(b);
      const h = new Uint8Array(30 + n.length), d = new DataView(h.buffer);
      d.setUint32(0, 0x04034b50, true); d.setUint16(4, 20, true); d.setUint16(6, 0x800, true); d.setUint32(14, crc, true); d.setUint32(18, b.length, true); d.setUint32(22, b.length, true); d.setUint16(26, n.length, true); h.set(n, 30);
      const c = new Uint8Array(46 + n.length), cd = new DataView(c.buffer);
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x800, true); cd.setUint32(16, crc, true); cd.setUint32(20, b.length, true); cd.setUint32(24, b.length, true); cd.setUint16(28, n.length, true); cd.setUint32(42, offset, true); c.set(n, 46);
      parts.push(h, b); central.push(c); offset += h.length + b.length;
    }
    const size = central.reduce((a, b) => a + b.length, 0), end = new Uint8Array(22), ed = new DataView(end.buffer);
    ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, entries.length, true); ed.setUint16(10, entries.length, true); ed.setUint32(12, size, true); ed.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], {type:'application/zip'});
  }
  window.jmFuelExport = async () => {
    const button = $('fuelExport'); button.disabled = true;
    try {
      const year = $('fuelYear').value, rows = (await registry()).filter(f => String(f.paye).startsWith(year)), entries = [], csv = [['Date','Catégorie','Libellé','Montant EUR','Litres','Prix au litre','Station','Référence','Pièce jointe']], missing = [];
      if (!rows.length) throw Error('Aucun frais pour cette année');
      for (let i = 0; i < rows.length; i++) {
        const f = rows[i], j = f.justificatif; let path = '';
        if (j) { const v = await fileStore('get', j.id); if (v) { path = 'tickets/' + String(i + 1).padStart(4, '0') + '-' + f.paye + '.' + v.ext; entries.push([path, v.blob]); } else missing.push(f.paye + ' : ' + (f.station || f.libelle)); }
        else if (f.categorie === 'gasoil') missing.push(f.paye + ' : ' + (f.station || f.libelle));
        csv.push([f.paye, f.categorie, f.libelle, Number(f.montant).toFixed(2).replace('.', ','), f.litres || '', f.prixL || '', f.station || '', f.reference || '', path || (f.categorie === 'gasoil' ? 'Ticket manquant' : '')]);
      }
      const cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
      entries.push(['releve-frais-' + year + '.csv', new Blob(['\uFEFF' + csv.map(r => r.map(cell).join(';')).join('\r\n')], {type:'text/csv'})]);
      const pdf = MiniPDF(595, 842); let y = 55;
      function heading() { pdf.text(45, y, 'JM EXPRESS — FRAIS ' + year, {size:16}); y += 25; pdf.text(45, y, 'Relevé interne — justificatifs originaux dans tickets/', {size:9}); y += 25; }
      heading();
      rows.forEach((f, i) => { if (y > 755) { pdf.newPage(); y = 55; heading(); } pdf.text(45, y, String(i + 1).padStart(4, '0') + '  ' + f.paye + '  ' + String(f.station || f.libelle || '').slice(0, 52), {size:9}); pdf.text(470, y, fmt(f.montant), {size:9}); y += 20; });
      if (y > 735) { pdf.newPage(); y = 55; }
      pdf.text(45, y + 10, 'TOTAL : ' + fmt(rows.reduce((sum, f) => sum + Number(f.montant || 0), 0)), {size:12});
      entries.push(['releve-frais-' + year + '.pdf', new Blob([pdf.build()], {type:'application/pdf'})]);
      entries.push(['A-LIRE.txt', new Blob(['JM Express — Frais ' + year + '\nLe CSV couvre tous les frais enregistrés de cet exercice. Les tickets carburant originaux sont dans tickets/. Les factures clients restent disponibles dans Historique.\n\nTickets manquants :\n' + (missing.join('\n') || 'Aucun')])]);
      const blob = await zip(entries); download(blob, 'JM-Express-Comptabilite-' + year + '.zip');
      showToast('Dossier exporté' + (missing.length ? ' — ' + missing.length + ' ticket(s) manquant(s)' : ' avec les tickets'));
    } catch (err) { showToast(err.message || 'Export impossible'); }
    finally { button.disabled = false; }
  };
})();
