/* ═══════════════════════════════════════════
   MONEY360 — sync.js
   Sincroniza carteira_transacoes / carteira_assinaturas /
   carteira_rendas / carteira_categorias (localStorage) com
   as tabelas do Supabase (transacoes / assinaturas / rendas /
   categorias), por user_id.

   • Quando o usuário está logado (via Supabase),
     toda escrita no localStorage é espelhada
     no banco (insert/update/delete).
   • Em "modo local" (sem login), nada muda —
     continua tudo em localStorage como antes.
═══════════════════════════════════════════ */
'use strict';

(function () {

  const TX_KEY    = 'carteira_transacoes';
  const ASS_KEY   = 'carteira_assinaturas';
  const RENDA_KEY = 'carteira_rendas';
  const CAT_KEY   = 'carteira_categorias';

  let syncAtivo = false;
  let userId    = null;
  let lastTx    = new Map();
  let lastAss   = new Map();
  let lastRenda = new Map();
  let lastCat   = new Map();

  const origSetItem = localStorage.setItem.bind(localStorage);

  /* ── Intercepta gravações no localStorage ── */
  localStorage.setItem = function (key, value) {
    origSetItem(key, value);
    if (!syncAtivo) return;
    if (key === TX_KEY)    syncTransacoes(parseArr(value)).catch(console.warn);
    if (key === ASS_KEY)   syncAssinaturas(parseArr(value)).catch(console.warn);
    if (key === RENDA_KEY) syncRendas(parseArr(value)).catch(console.warn);
    if (key === CAT_KEY)   syncCategorias(parseArr(value)).catch(console.warn);
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
        parcela: !!a.parcela, data_ultima_parcela: a.dataUltimaParcela || null,
        cobranca_automatica: !!a.cobrancaAutomatica,
        ultima_cobranca_automatica: a.ultimaCobrancaAutomatica || null,
      })));
    }
  }

  /* ── Fontes de renda ── */
  async function syncRendas(novas) {
    const sb = window._sb;
    if (!sb || !userId) return;

    const idsNovos = new Set(novas.map(r => r.id));
    const remover  = [...lastRenda.keys()].filter(id => !idsNovos.has(id));
    const upsert   = novas.filter(r => !igual(lastRenda.get(r.id), r));

    lastRenda = new Map(novas.map(r => [r.id, r]));

    if (remover.length) {
      await sb.from('rendas').delete().in('id', remover).eq('user_id', userId);
    }
    if (upsert.length) {
      await sb.from('rendas').upsert(upsert.map(r => ({
        id: r.id, user_id: userId, nome: r.nome, valor: r.valor,
        dia_recebimento: r.diaRecebimento ? Number(r.diaRecebimento) : null,
        categoria: r.categoria || 'outros_receita', notas: r.notas || null,
        recebimento_automatico: !!r.recebimentoAutomatico,
        ultimo_recebimento_automatico: r.ultimoRecebimentoAutomatico || null,
      })));
    }
  }

  /* ── Categorias ── */
  async function syncCategorias(novas) {
    const sb = window._sb;
    if (!sb || !userId) return;

    const idsNovos = new Set(novas.map(c => c.id));
    const remover  = [...lastCat.keys()].filter(id => !idsNovos.has(id));
    const upsert   = novas.filter(c => !igual(lastCat.get(c.id), c));

    lastCat = new Map(novas.map(c => [c.id, c]));

    if (remover.length) {
      await sb.from('categorias').delete().in('id', remover).eq('user_id', userId);
    }
    if (upsert.length) {
      await sb.from('categorias').upsert(upsert.map(c => ({
        id: c.id, user_id: userId, emoji: c.emoji || '📦', nome: c.nome,
        tipo: c.tipo || 'despesa', is_default: !!c.isDefault,
      })), { onConflict: 'user_id,id' });
    }
  }

  /* ── Carrega os dados do Supabase ao logar ── */
  async function carregarDoSupabase(session) {
    const sb = window._sb;
    if (!sb || !session?.user) return;
    userId = session.user.id;

    try {
      const [
        { data: tx,    error: errTx },
        { data: ass,   error: errAss },
        { data: renda, error: errRenda },
        { data: cat,   error: errCat },
      ] = await Promise.all([
        sb.from('transacoes').select('*').eq('user_id', userId),
        sb.from('assinaturas').select('*').eq('user_id', userId),
        sb.from('rendas').select('*').eq('user_id', userId),
        sb.from('categorias').select('*').eq('user_id', userId),
      ]);
      if (errTx)    console.warn('[sync] erro ao buscar transações:', errTx.message);
      if (errAss)   console.warn('[sync] erro ao buscar assinaturas:', errAss.message);
      if (errRenda) console.warn('[sync] erro ao buscar rendas:', errRenda.message);
      if (errCat)   console.warn('[sync] erro ao buscar categorias:', errCat.message);

      let txArr = (tx || []).map(r => ({
        id: r.id, tipo: r.tipo, descricao: r.descricao,
        valor: Number(r.valor), data: r.data, categoria: r.categoria,
      }));
      let assArr = (ass || []).map(r => ({
        id: r.id, nome: r.nome, valor: Number(r.valor),
        vencimento: r.vencimento || '', categoria: r.categoria, notas: r.notas || '',
        parcela: !!r.parcela, dataUltimaParcela: r.data_ultima_parcela || '',
        cobrancaAutomatica: !!r.cobranca_automatica,
        ultimaCobrancaAutomatica: r.ultima_cobranca_automatica || '',
      }));
      let rendaArr = (renda || []).map(r => ({
        id: r.id, nome: r.nome, valor: Number(r.valor),
        diaRecebimento: r.dia_recebimento || '', categoria: r.categoria, notas: r.notas || '',
        recebimentoAutomatico: !!r.recebimento_automatico,
        ultimoRecebimentoAutomatico: r.ultimo_recebimento_automatico || '',
      }));
      let catArr = (cat || []).map(r => ({
        id: r.id, emoji: r.emoji, nome: r.nome, tipo: r.tipo, isDefault: !!r.is_default,
      }));

      // Primeiro login: se o Supabase ainda não tem nada mas já existem
      // dados salvos localmente (modo local anterior), envia-os para a nuvem
      // em vez de apagá-los.
      const localTx    = parseArr(localStorage.getItem(TX_KEY));
      const localAss   = parseArr(localStorage.getItem(ASS_KEY));
      const localRenda = parseArr(localStorage.getItem(RENDA_KEY));
      const localCat   = parseArr(localStorage.getItem(CAT_KEY));
      if (!txArr.length && localTx.length)       txArr    = corrigirIds(localTx);
      if (!assArr.length && localAss.length)     assArr   = corrigirIds(localAss);
      if (!rendaArr.length && localRenda.length) rendaArr = corrigirIds(localRenda);
      if (!catArr.length && localCat.length)     catArr   = localCat;

      origSetItem(TX_KEY, JSON.stringify(txArr));
      origSetItem(ASS_KEY, JSON.stringify(assArr));
      origSetItem(RENDA_KEY, JSON.stringify(rendaArr));
      origSetItem(CAT_KEY, JSON.stringify(catArr));

      lastTx    = new Map();
      lastAss   = new Map();
      lastRenda = new Map();
      lastCat   = new Map();
      syncAtivo = true;

      // Garante que os dados (locais ou da nuvem) fiquem espelhados no Supabase
      await syncTransacoes(txArr);
      await syncAssinaturas(assArr);
      await syncRendas(rendaArr);
      await syncCategorias(catArr);

      // Re-renderiza com os dados sincronizados
      window._recarregarTransacoes?.();
      window._renderAssinaturas?.();
      window._renderRenda?.();
      window._catsMgr?.reloadCats?.();
    } catch (err) {
      console.warn('[sync] falha ao carregar dados do Supabase:', err);
    }
  }

  function desativarSync() {
    syncAtivo = false;
    userId = null;
    lastTx    = new Map();
    lastAss   = new Map();
    lastRenda = new Map();
    lastCat   = new Map();
  }

  window._sync = { carregarDoSupabase, desativarSync };
})();
