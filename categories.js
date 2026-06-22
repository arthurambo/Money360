/* ══════════════════════════════════════════════
   MONEY360 — categories.js
   Gerencia as categorias de transações.
   Deve ser carregado ANTES de script.js e ui.js.
══════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'carteira_categorias';

  const DEFAULT_CATS = [
    { id: 'salario',      emoji: '💰', nome: 'Salário',      isDefault: true },
    { id: 'freelance',    emoji: '💻', nome: 'Freelance',    isDefault: true },
    { id: 'investimento', emoji: '📈', nome: 'Investimento', isDefault: true },
    { id: 'alimentacao',  emoji: '🍔', nome: 'Alimentação',  isDefault: true },
    { id: 'transporte',   emoji: '🚗', nome: 'Transporte',   isDefault: true },
    { id: 'moradia',      emoji: '🏠', nome: 'Moradia',      isDefault: true },
    { id: 'saude',        emoji: '💊', nome: 'Saúde',        isDefault: true },
    { id: 'lazer',        emoji: '🎮', nome: 'Lazer',        isDefault: true },
    { id: 'educacao',     emoji: '📚', nome: 'Educação',     isDefault: true },
    { id: 'outros',       emoji: '📦', nome: 'Outros',       isDefault: true },
  ];

  let cats = [];

  function loadCats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return DEFAULT_CATS.map(c => ({ ...c }));
  }

  function saveCats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
  }

  function getCatMap() {
    const map = {};
    cats.forEach(c => { map[c.id] = { emoji: c.emoji, nome: c.nome }; });
    if (!map.outros) map.outros = { emoji: '📦', nome: 'Outros' };
    return map;
  }

  const TX_SELECT_IDS   = ['input-categoria', 'edit-categoria'];
  const FILTER_SELECT_ID = 'filtro2-categoria';

  function populateCatSelects() {
    TX_SELECT_IDS.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const prev = sel.value;
      sel.innerHTML = '';
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.emoji + ' ' + c.nome;
        sel.appendChild(opt);
      });
      if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
      else sel.value = cats[0]?.id || 'outros';
    });

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

  function addCat(emoji, nome) {
    const id = 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    cats.push({ id, emoji: emoji || '📦', nome, isDefault: false });
    saveCats();
    populateCatSelects();
    renderCatPanel();
  }

  function editCat(id, emoji, nome) {
    const c = cats.find(c => c.id === id);
    if (!c) return;
    c.emoji = emoji || c.emoji;
    c.nome  = nome  || c.nome;
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

  /* ── RENDER PANEL ─────────────────────── */

  function renderCatPanel() {
    const list = document.getElementById('cat-lista');
    if (!list) return;
    if (!cats.length) {
      list.innerHTML = '<p class="cat-vazio">Nenhuma categoria cadastrada.</p>';
      return;
    }
    list.innerHTML = cats.map(c => `
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

    list.querySelectorAll('.cat-btn-editar').forEach(btn =>
      btn.addEventListener('click', () => iniciarEdicaoCat(btn.dataset.id))
    );
    list.querySelectorAll('.cat-btn-remover').forEach(btn =>
      btn.addEventListener('click', () => solicitarRemocaoCat(btn.dataset.id))
    );
  }

  /* ── FORM ─────────────────────────────── */

  let editandoCatId = null;

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
      editCat(editandoCatId, emoji || '📦', nome);
    } else {
      addCat(emoji || '📦', nome);
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
  }

  document.addEventListener('DOMContentLoaded', () => {
    cats = loadCats();
    populateCatSelects();
    renderCatPanel();
    setupCatPanel();
  });

  window._catsMgr = { getCatMap, populateCatSelects, renderCatPanel };
})();
