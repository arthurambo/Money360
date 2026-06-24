/* ══════════════════════════════════════════════
   MONEY360 — categories.js
   Gerencia as categorias de transações.
   Deve ser carregado ANTES de script.js e ui.js.
══════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'carteira_categorias';

  const DEFAULT_CATS = [
    // Receita
    { id: 'salario',              emoji: '💰', nome: 'Salário',      tipo: 'receita', isDefault: true },
    { id: 'freelance',            emoji: '💻', nome: 'Freelance',    tipo: 'receita', isDefault: true },
    { id: 'investimento',         emoji: '📈', nome: 'Investimento', tipo: 'receita', isDefault: true },
    { id: 'outros_receita',       emoji: '📦', nome: 'Outros',       tipo: 'receita', isDefault: true },
    // Despesa
    { id: 'investimento_despesa', emoji: '📈', nome: 'Investimento', tipo: 'despesa', isDefault: true },
    { id: 'alimentacao',          emoji: '🍔', nome: 'Alimentação',  tipo: 'despesa', isDefault: true },
    { id: 'saude',                emoji: '💊', nome: 'Saúde',        tipo: 'despesa', isDefault: true },
    { id: 'transporte',           emoji: '🚗', nome: 'Transporte',   tipo: 'despesa', isDefault: true },
    { id: 'moradia',              emoji: '🏠', nome: 'Moradia',      tipo: 'despesa', isDefault: true },
    { id: 'lazer',                emoji: '🎮', nome: 'Lazer',        tipo: 'despesa', isDefault: true },
    { id: 'educacao',             emoji: '📚', nome: 'Educação',     tipo: 'despesa', isDefault: true },
    { id: 'outros',               emoji: '📦', nome: 'Outros',       tipo: 'despesa', isDefault: true },
  ];

  // Tipo correto de cada id padrão antigo (salvo antes de existir o campo "tipo")
  const TIPO_MIGRACAO = {
    salario: 'receita', freelance: 'receita', investimento: 'receita',
    alimentacao: 'despesa', transporte: 'despesa', moradia: 'despesa',
    saude: 'despesa', lazer: 'despesa', educacao: 'despesa', outros: 'despesa',
  };

  // Categorias padrão que existem nos dois tipos: cria a versão que falta
  const DUPLICAR_MIGRACAO = [
    { origemId: 'investimento', novoId: 'investimento_despesa', tipo: 'despesa' },
    { origemId: 'outros',       novoId: 'outros_receita',        tipo: 'receita' },
  ];

  // Versão da lógica de migração. Subir este número força uma nova correção
  // mesmo em categorias que já têm "tipo" salvo (ex.: corrigir um bug antigo).
  const MIGRACAO_VERSAO_KEY = 'carteira_categorias_versao';
  const MIGRACAO_ATUAL      = 2;

  let cats = [];
  // Lembra qual tipo está sendo filtrado em cada select de transação,
  // para que populateCatSelects() (chamado após CRUD) preserve o filtro.
  const lastTipo = { 'input-categoria': 'receita', 'edit-categoria': 'receita' };

  function migrarCats(parsed, forcarCorrecao) {
    const result = parsed.map(c => {
      // ids padrão conhecidos: sempre força o tipo correto (corrige dados salvos errados)
      if (forcarCorrecao && TIPO_MIGRACAO[c.id]) return { ...c, tipo: TIPO_MIGRACAO[c.id] };
      if (c.tipo === 'receita' || c.tipo === 'despesa') return c;
      return { ...c, tipo: TIPO_MIGRACAO[c.id] || 'despesa' };
    });

    DUPLICAR_MIGRACAO.forEach(({ origemId, novoId, tipo }) => {
      const origem   = result.find(c => c.id === origemId);
      const jaExiste = result.some(c => c.id === novoId);
      if (origem && !jaExiste) {
        result.push({ id: novoId, emoji: origem.emoji, nome: origem.nome, tipo, isDefault: true });
      }
    });

    return result;
  }

  function loadCats() {
    try {
      const raw    = localStorage.getItem(STORAGE_KEY);
      const versao = parseInt(localStorage.getItem(MIGRACAO_VERSAO_KEY) || '0', 10);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return migrarCats(parsed, versao < MIGRACAO_ATUAL);
        }
      }
    } catch {}
    return DEFAULT_CATS.map(c => ({ ...c }));
  }

  function saveCats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  }

  function getCatMap() {
    const map = {};
    cats.forEach(c => { map[c.id] = { emoji: c.emoji, nome: c.nome, tipo: c.tipo }; });
    if (!map.outros) map.outros = { emoji: '📦', nome: 'Outros', tipo: 'despesa' };
    return map;
  }

  function getCatsByTipo(tipo) {
    return cats.filter(c => c.tipo === tipo);
  }

  const TX_SELECT_IDS    = ['input-categoria', 'edit-categoria'];
  const FILTER_SELECT_ID = 'filtro2-categoria';

  /* Preenche um <select> de transação filtrando por tipo (receita/despesa) */
  function populateSelectByTipo(selectId, tipo, desiredValue) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    if (TX_SELECT_IDS.includes(selectId)) lastTipo[selectId] = tipo;

    const prev = desiredValue !== undefined ? desiredValue : sel.value;
    const filtrado = cats.filter(c => c.tipo === tipo);

    sel.innerHTML = '';
    filtrado.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.emoji + ' ' + c.nome;
      sel.appendChild(opt);
    });

    if (prev && filtrado.some(c => c.id === prev)) sel.value = prev;
    else sel.value = filtrado[0]?.id || '';
  }

  function populateCatSelects() {
    // Selects de transação: respeitam o último tipo filtrado, preservando a seleção atual
    TX_SELECT_IDS.forEach(id => {
      const sel = document.getElementById(id);
      populateSelectByTipo(id, lastTipo[id] || 'receita', sel?.value);
    });

    // Filtro de relatório: mostra todas as categorias, de qualquer tipo
    const fsel = document.getElementById(FILTER_SELECT_ID);
    if (fsel) {
      const prev = fsel.value;
      fsel.innerHTML = '<option value="todas">Todas</option>';
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.emoji + ' ' + c.nome;
        fsel.appendChild(opt);
      });
      if (prev && [...fsel.options].some(o => o.value === prev)) fsel.value = prev;
    }
  }

  /* ── CRUD ─────────────────────────────── */

  function addCat(emoji, nome, tipo) {
    const id = 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    cats.push({ id, emoji: emoji || '📦', nome, tipo: tipo === 'receita' ? 'receita' : 'despesa', isDefault: false });
    saveCats();
    populateCatSelects();
    renderCatPanel();
  }

  function editCat(id, emoji, nome, tipo) {
    const c = cats.find(c => c.id === id);
    if (!c) return;
    c.emoji = emoji || c.emoji;
    c.nome  = nome  || c.nome;
    if (tipo === 'receita' || tipo === 'despesa') c.tipo = tipo;
    saveCats();
    populateCatSelects();
    renderCatPanel();
  }

  function removeCat(id) {
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return;
    cats.splice(idx, 1);
    saveCats();
    populateCatSelects();
    renderCatPanel();
  }

  /* Restaura apenas as categorias padrão, removendo as criadas pelo usuário */
  function resetCats() {
    cats = DEFAULT_CATS.map(c => ({ ...c }));
    saveCats();
    localStorage.setItem(MIGRACAO_VERSAO_KEY, String(MIGRACAO_ATUAL));
    populateCatSelects();
    renderCatPanel();
  }

  /* ── RENDER PANEL ─────────────────────── */

  function renderGrupoCat(listEl, lista) {
    if (!listEl) return;
    if (!lista.length) {
      listEl.innerHTML = '<p class="cat-vazio">Nenhuma categoria cadastrada.</p>';
      return;
    }
    listEl.innerHTML = lista.map(c => `
      <div class="cat-item" data-id="${c.id}">
        <span class="cat-emoji-preview">${c.emoji}</span>
        <span class="cat-nome">${c.nome}</span>
        ${c.isDefault ? '<span class="cat-badge">Padrão</span>' : ''}
        <div class="cat-acoes">
          <button class="cat-btn-acao cat-btn-editar" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </button>
          <button class="cat-btn-acao cat-btn-remover" data-id="${c.id}" title="Remover">
            <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.cat-btn-editar').forEach(btn =>
      btn.addEventListener('click', () => iniciarEdicaoCat(btn.dataset.id))
    );
    listEl.querySelectorAll('.cat-btn-remover').forEach(btn =>
      btn.addEventListener('click', () => solicitarRemocaoCat(btn.dataset.id))
    );
  }

  function renderCatPanel() {
    const listDespesa = document.getElementById('cat-lista-despesa');
    const listReceita  = document.getElementById('cat-lista-receita');
    const despesas = cats.filter(c => c.tipo === 'despesa');
    const receitas  = cats.filter(c => c.tipo === 'receita');

    renderGrupoCat(listDespesa, despesas);
    renderGrupoCat(listReceita, receitas);

    const cntD = document.getElementById('cat-count-despesa');
    const cntR = document.getElementById('cat-count-receita');
    if (cntD) cntD.textContent = despesas.length;
    if (cntR) cntR.textContent = receitas.length;
  }

  /* ── FORM ─────────────────────────────── */

  let editandoCatId = null;
  let tipoFormCat    = 'despesa';

  function selTipoFormCat(tipo) {
    tipoFormCat = tipo;
    document.getElementById('cat-tipo-despesa')?.classList.toggle('ativo', tipo === 'despesa');
    document.getElementById('cat-tipo-receita')?.classList.toggle('ativo', tipo === 'receita');
  }

  function iniciarEdicaoCat(id) {
    const c = cats.find(c => c.id === id);
    if (!c) return;
    editandoCatId = id;
    const emojiInp  = document.getElementById('cat-add-emoji');
    const nomeInp   = document.getElementById('cat-add-nome');
    const btnSalvar = document.getElementById('cat-btn-salvar');
    const btnCancel = document.getElementById('cat-btn-cancelar');
    if (emojiInp)  emojiInp.value = c.emoji;
    if (nomeInp)   nomeInp.value  = c.nome;
    if (btnSalvar) btnSalvar.textContent = 'Salvar';
    if (btnCancel) btnCancel.style.display = '';
    selTipoFormCat(c.tipo);
    nomeInp?.focus();
  }

  function cancelarEdicaoCat() {
    editandoCatId = null;
    const emojiInp  = document.getElementById('cat-add-emoji');
    const nomeInp   = document.getElementById('cat-add-nome');
    const btnSalvar = document.getElementById('cat-btn-salvar');
    const btnCancel = document.getElementById('cat-btn-cancelar');
    if (emojiInp)  emojiInp.value = '';
    if (nomeInp)   nomeInp.value  = '';
    if (btnSalvar) btnSalvar.textContent = 'Adicionar';
    if (btnCancel) btnCancel.style.display = 'none';
    selTipoFormCat('despesa');
  }

  function solicitarRemocaoCat(id) {
    const c = cats.find(c => c.id === id);
    if (!c) return;
    const msg = `Remover "${c.nome}"? As transações existentes mantêm o ID da categoria salvo.`;
    if (window._abrirModalExCb) {
      window._abrirModalExCb(msg, () => removeCat(id));
    } else if (confirm(msg)) {
      removeCat(id);
    }
  }

  function salvarCat() {
    const emojiInp = document.getElementById('cat-add-emoji');
    const nomeInp  = document.getElementById('cat-add-nome');
    const emoji = (emojiInp?.value || '').trim();
    const nome  = (nomeInp?.value  || '').trim();
    if (!nome) { nomeInp?.focus(); return; }
    if (editandoCatId) {
      editCat(editandoCatId, emoji || '📦', nome, tipoFormCat);
    } else {
      addCat(emoji || '📦', nome, tipoFormCat);
    }
    cancelarEdicaoCat();
  }

  function setupCatPanel() {
    const btnSalvar = document.getElementById('cat-btn-salvar');
    const btnCancel = document.getElementById('cat-btn-cancelar');
    const nomeInp   = document.getElementById('cat-add-nome');
    if (!btnSalvar) return;
    btnSalvar.addEventListener('click', salvarCat);
    btnCancel?.addEventListener('click', cancelarEdicaoCat);
    nomeInp?.addEventListener('keydown', e => { if (e.key === 'Enter') salvarCat(); });
    document.getElementById('cat-tipo-despesa')?.addEventListener('click', () => selTipoFormCat('despesa'));
    document.getElementById('cat-tipo-receita')?.addEventListener('click', () => selTipoFormCat('receita'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    cats = loadCats();
    saveCats(); // persiste imediatamente o resultado de uma eventual migração
    localStorage.setItem(MIGRACAO_VERSAO_KEY, String(MIGRACAO_ATUAL));
    populateCatSelects();
    renderCatPanel();
    setupCatPanel();
  });

  window._catsMgr = { getCatMap, populateCatSelects, renderCatPanel, populateSelectByTipo, getCatsByTipo, resetCats };
})();
