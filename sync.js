/* ═══════════════════════════════════════════
   MONEY360 — sync.js
   Sincroniza carteira_transacoes / carteira_assinaturas
   (localStorage) com as tabelas do Supabase
   (transacoes / assinaturas), por user_id.

   • Quando o usuário está logado (via Supabase),
     toda escrita no localStorage é espelhada
     no banco (insert/update/delete).
   • Em "modo local" (sem login), nada muda —
     continua tudo em localStorage como antes.
═══════════════════════════════════════════ */
'use strict';

(function () {

  const TX_KEY  = 'carteira_transacoes';
  const ASS_KEY = 'carteira_assinaturas';

  let syncAtivo = false;
  let userId    = null;
  let lastTx    = new Map();
  let lastAss   = new Map();

  const origSetItem = localStorage.setItem.bind(localStorage);

  /* ── Intercepta gravações no localStorage ── */
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (!syncAtivo) return;
    if (key === TX_KEY)  syncTransacoes(parseArr(value)).catch(console.warn);
    if (key === ASS_KEY) syncAssinaturas(parseArr(value)).catch(console.warn);
  };

  function parseArr(v) { try { return JSON.parse(v) || []; } catch { return []; } }
  function igual(a, b)  { return JSON.stringify(a) === JSON.stringify(b); }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function novoUuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  // Itens criados antes da migração para UUID tinham ids como "lz3k2p1a2b3c".
  // O Postgres rejeita esses valores em colunas uuid — gera um novo id válido.
  function corrigirIds(lista) {
    return lista.map(item => UUID_RE.test(item.id) ? item : { ...item, id: novoUuid() });
  }

  /* ── Transações ── */
  async function syncTransacoes(novas) {
    const sb = window._sb;
    if (!sb || !userId) return;

    const idsNovos = new Set(novas.map(t => t.id));
    const remover  = [...lastTx.keys()].filter(id => !idsNovos.has(id));
    const upsert   = novas.filter(t => !igual(lastTx.get(t.id), t));

    lastTx = new Map(novas.map(t => [t.id, t]));

    if (remover.length) {
      await sb.from('transacoes').delete().in('id', remover).eq('user_id', userId);
    }
    if (upsert.length) {
      await sb.from('transacoes').upsert(upsert.map(t => ({
        id: t.id, user_id: userId, tipo: t.tipo, descricao: t.descricao,
        valor: t.valor, data: t.data, categoria: t.categoria || 'outros',
      })));
    }
  }

  /* ── Assinaturas ── */
  async function syncAssinaturas(novas) {
    const sb = window._sb;
    if (!sb || !userId) return;

    const idsNovos = new Set(novas.map(a => a.id));
    const remover  = [...lastAss.keys()].filter(id => !idsNovos.has(id));
    const upsert   = novas.filter(a => !igual(lastAss.get(a.id), a));

    lastAss = new Map(novas.map(a => [a.id, a]));

    if (remover.length) {
      await sb.from('assinaturas').delete().in('id', remover).eq('user_id', userId);
    }
    if (upsert.length) {
      await sb.from('assinaturas').upsert(upsert.map(a => ({
        id: a.id, user_id: userId, nome: a.nome, valor: a.valor,
        vencimento: a.vencimento ? Number(a.vencimento) : null,
        categoria: a.categoria || 'outros', notas: a.notas || null,
      })));
    }
  }

  /* ── Carrega os dados do Supabase ao logar ── */
  async function carregarDoSupabase(session) {
    const sb = window._sb;
    if (!sb || !session?.user) return;
    userId = session.user.id;

    try {
      const [{ data: tx, error: errTx }, { data: ass, error: errAss }] = await Promise.all([
        sb.from('transacoes').select('*').eq('user_id', userId),
        sb.from('assinaturas').select('*').eq('user_id', userId),
      ]);
      if (errTx)  console.warn('[sync] erro ao buscar transações:', errTx.message);
      if (errAss) console.warn('[sync] erro ao buscar assinaturas:', errAss.message);

      let txArr = (tx || []).map(r => ({
        id: r.id, tipo: r.tipo, descricao: r.descricao,
        valor: Number(r.valor), data: r.data, categoria: r.categoria,
      }));
      let assArr = (ass || []).map(r => ({
        id: r.id, nome: r.nome, valor: Number(r.valor),
        vencimento: r.vencimento || '', categoria: r.categoria, notas: r.notas || '',
      }));

      // Primeiro login: se o Supabase ainda não tem nada mas já existem
      // dados salvos localmente (modo local anterior), envia-os para a nuvem
      // em vez de apagá-los.
      const localTx  = parseArr(localStorage.getItem(TX_KEY));
      const localAss = parseArr(localStorage.getItem(ASS_KEY));
      if (!txArr.length && localTx.length) txArr = corrigirIds(localTx);
      if (!assArr.length && localAss.length) assArr = corrigirIds(localAss);

      origSetItem(TX_KEY, JSON.stringify(txArr));
      origSetItem(ASS_KEY, JSON.stringify(assArr));

      lastTx  = new Map();
      lastAss = new Map();
      syncAtivo = true;

      // Garante que os dados (locais ou da nuvem) fiquem espelhados no Supabase
      await syncTransacoes(txArr);
      await syncAssinaturas(assArr);

      // Re-renderiza com os dados sincronizados
      window._recarregarTransacoes?.();
      window._renderAssinaturas?.();
    } catch (err) {
      console.warn('[sync] falha ao carregar dados do Supabase:', err);
    }
  }

  function desativarSync() {
    syncAtivo = false;
    userId = null;
    lastTx = new Map();
    lastAss = new Map();
  }

  window._sync = { carregarDoSupabase, desativarSync };
})();
