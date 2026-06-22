/* ══════════════════════════════════════════════
   MONEY360 — notification.js
   Push notifications: assinaturas + motivacionais
   Deve ser carregado APÓS auth.js.
══════════════════════════════════════════════ */
(function () {
  'use strict';

  const SETTINGS_KEY = 'carteira_notificacoes';
  const TX_KEY       = 'carteira_transacoes';
  const ASS_KEY      = 'carteira_assinaturas';

  /* ── Settings ──────────────────────────────── */

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  function isAtivo() {
    return ('Notification' in window)
      && Notification.permission === 'granted'
      && !!getSettings().ativo;
  }

  /* ── IndexedDB (para o SW acessar os dados) ─ */

  function abrirIDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('money360-data', 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'k' });
      };
      req.onsuccess = e => res(e.target.result);
      req.onerror   = () => rej(req.error);
    });
  }

  async function idbSet(k, v) {
    try {
      const db = await abrirIDB();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ k, v });
      return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    } catch {}
  }

  async function syncParaIDB() {
    const tx  = JSON.parse(localStorage.getItem(TX_KEY)  || '[]');
    const ass = JSON.parse(localStorage.getItem(ASS_KEY) || '[]');
    await idbSet('transacoes',  tx);
    await idbSet('assinaturas', ass);
  }

  /* ── Dias até vencimento (trata virada de mês) */

  function diasAteVencimento(diaVenc) {
    const hoje = new Date();
    const hd   = hoje.getDate();
    const cand = new Date(hoje.getFullYear(), hoje.getMonth(), diaVenc);
    if (diaVenc < hd) cand.setMonth(cand.getMonth() + 1);
    const diff = Math.round((cand - hoje) / 86400000);
    return diff;
  }

  /* ── Gerar mensagem motivacional ───────────── */

  function gerarMotivacional() {
    const transacoes  = JSON.parse(localStorage.getItem(TX_KEY)  || '[]');
    const assinaturas = JSON.parse(localStorage.getItem(ASS_KEY) || '[]');
    const candidatas  = [];

    if (transacoes.length) {
      const rec  = transacoes.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
      const desp = transacoes.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
      const saldo = rec - desp;
      const fmt   = v => 'R$ ' + v.toFixed(2).replace('.', ',');

      if (rec > 0 && saldo > 0) {
        const pct = Math.round((saldo / rec) * 100);
        candidatas.push(`Você está economizando ${pct}% da sua renda! Continue assim 🎉`);
      }

      if (rec > 0 && desp > 0) {
        const porCat = {};
        transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
          porCat[t.categoria] = (porCat[t.categoria] || 0) + t.valor;
        });
        const [catId, val] = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
        const pct = Math.round((val / rec) * 100);
        if (pct > 25) {
          const cm   = window._catsMgr?.getCatMap() || {};
          const info = cm[catId] || { emoji: '📦', nome: catId };
          candidatas.push(`Atenção! ${pct}% da sua renda está indo para ${info.emoji} ${info.nome}. Fique de olho! 👀`);
        }
      }

      if (saldo > 0) {
        const dias = Math.round(saldo / (desp / 30 || 1));
        if (dias > 5) candidatas.push(`Com seu saldo atual você consegue se manter por ~${dias} dias. Ótimo colchão! 💪`);
      }
    }

    if (assinaturas.length) {
      const totalAss = assinaturas.reduce((a, s) => a + (s.valor || 0), 0);
      candidatas.push(`Suas ${assinaturas.length} assinatura${assinaturas.length > 1 ? 's' : ''} somam R$ ${totalAss.toFixed(2).replace('.', ',')} por mês. Vale revisar? 🤔`);
    }

    const genericas = [
      'Registrar seus gastos é o primeiro passo para controlar seu dinheiro. Bom trabalho! ✅',
      'Sabia que quem acompanha os gastos economiza até 20% mais? Continue assim! 📊',
      'Pequenas economias diárias fazem grandes diferenças no final do mês! 💪',
    ];
    candidatas.push(genericas[Math.floor(Math.random() * genericas.length)]);

    return candidatas[Math.floor(Math.random() * candidatas.length)] || null;
  }

  /* ── Exibir notificação (via SW ou diretamente) */

  function mostrarNotificacao(titulo, corpo, tag) {
    if (Notification.permission !== 'granted') return;
    const opts = { body: corpo, icon: './icon.svg', badge: './icon.svg',
                   vibrate: [200, 100, 200], tag: tag || 'money360' };
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', titulo, corpo, opts });
    } else {
      new Notification(titulo, opts);
    }
  }

  /* ── Verificar e disparar notificações ─────── */

  async function verificarNotificacoes() {
    if (!isAtivo()) return;

    await syncParaIDB().catch(() => {});

    const settings = getSettings();
    const hoje     = new Date().toISOString().split('T')[0];
    settings.enviadas = settings.enviadas || {};

    // Limpa entradas antigas (mantém só os últimos 60 dias)
    Object.keys(settings.enviadas).forEach(k => {
      if (k < hoje.slice(0, 8) + '00') delete settings.enviadas[k];
    });

    const assinaturas = JSON.parse(localStorage.getItem(ASS_KEY) || '[]');

    assinaturas.forEach(ass => {
      if (!ass.vencimento) return;
      const diff = diasAteVencimento(ass.vencimento);

      if (diff === 0) {
        const chave = `cob-${ass.id}-${hoje}`;
        if (!settings.enviadas[chave]) {
          mostrarNotificacao(`💳 Cobrança hoje: ${ass.nome}`,
            `R$ ${(ass.valor || 0).toFixed(2).replace('.', ',')} será cobrado hoje.`, chave);
          settings.enviadas[chave] = true;
        }
      } else if (diff === 7) {
        const chave = `prev-${ass.id}-${hoje}`;
        if (!settings.enviadas[chave]) {
          mostrarNotificacao(`📅 Vence em 7 dias: ${ass.nome}`,
            `R$ ${(ass.valor || 0).toFixed(2).replace('.', ',')} será cobrado no dia ${ass.vencimento}.`, chave);
          settings.enviadas[chave] = true;
        }
      }
    });

    // Motivacional (uma por dia)
    if (settings.ultimaMotivacional !== hoje) {
      const msg = gerarMotivacional();
      if (msg) {
        mostrarNotificacao('💡 Money360', msg, 'motivacional');
        settings.ultimaMotivacional = hoje;
      }
    }

    saveSettings(settings);
  }

  /* ── Ativar notificações ────────────────────── */

  async function ativar() {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações.');
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      alert('Permissão negada. Ative as notificações nas configurações do navegador/sistema.');
      return false;
    }
    const s = getSettings();
    s.ativo = true;
    saveSettings(s);

    // Periodic Background Sync (Android Chrome com PWA instalado)
    try {
      if ('periodicSync' in ServiceWorkerRegistration.prototype) {
        const reg = await navigator.serviceWorker.ready;
        await reg.periodicSync.register('money360-daily', { minInterval: 24 * 60 * 60 * 1000 });
      }
    } catch {}

    await syncParaIDB().catch(() => {});
    verificarNotificacoes();
    atualizarUI();
    return true;
  }

  function desativar() {
    const s = getSettings();
    s.ativo = false;
    saveSettings(s);
    atualizarUI();
  }

  /* ── Atualiza o painel de Configurações ─────── */

  function atualizarUI() {
    const label = document.getElementById('notif-status-label');
    const btn   = document.getElementById('btn-toggle-notif');
    const tipos = document.getElementById('notif-tipos');
    if (!btn) return;
    const ativo = isAtivo();
    if (label) label.textContent = ativo ? 'Ativadas ✅' : ('Notification' in window && Notification.permission === 'denied' ? 'Bloqueadas pelo sistema' : 'Desativadas');
    btn.textContent = ativo ? 'Desativar' : 'Ativar';
    btn.className   = ativo ? 'btn-danger' : 'btn-secundario';
    if (tipos) tipos.style.display = ativo ? '' : 'none';
  }

  /* ── DOMContentLoaded ───────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-toggle-notif');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (isAtivo()) {
          desativar();
        } else {
          await ativar();
        }
      });
    }
    atualizarUI();
    window._notif = { verificar: verificarNotificacoes, ativar, desativar, isAtivo, atualizarUI, syncParaIDB };
  });

})();
