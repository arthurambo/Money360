/* ═══════════════════════════════════════════
   MONEY360 — eventos.js
   Grupos de gastos por ocasião (ex: viagem, festa, show)
═══════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'carteira_eventos';
  const q = id => document.getElementById(id);

  function uid()    { return 'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function gid()    { return 'g_'  + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  function hoje()   { return new Date().toISOString().split('T')[0]; }
  function moeda(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function fmtData(s) { if (!s) return ''; const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; }
  function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

  let eventos = carregar();
  let eventoAtualId = null;

  function carregar() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }

  function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
  }

  function totalEvento(ev) {
    return (ev.gastos || []).reduce((a, g) => a + (g.valor || 0), 0);
  }

  const EDIT_SVG = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`;

  /* ── Render event cards ── */
  function renderEventos() {
    const grid    = q('eventos-grid');
    const vazio   = q('eventos-vazio');
    const totalEl = q('eventos-total-gasto');
    const qtdEl   = q('eventos-total-qtd');
    const maiorEl = q('eventos-maior');
    if (!grid) return;

    const agora   = new Date();
    const prefixo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const totalMes = eventos.reduce((a, ev) =>
      a + (ev.gastos || []).filter(g => g.data.startsWith(prefixo)).reduce((b, g) => b + (g.valor || 0), 0), 0);
    if (totalEl) totalEl.textContent = moeda(totalMes);
    if (qtdEl)   qtdEl.textContent   = eventos.length;

    if (!eventos.length) {
      grid.innerHTML = '';
      if (vazio)   vazio.style.display  = '';
      if (maiorEl) maiorEl.textContent  = '—';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    const maiorEv = eventos.reduce((a, b) => totalEvento(a) >= totalEvento(b) ? a : b);
    if (maiorEl) maiorEl.textContent = (maiorEv.emoji || '📦') + ' ' + maiorEv.nome;

    grid.innerHTML = eventos.map(ev => {
      const tot = totalEvento(ev);
      const qtd = (ev.gastos || []).length;
      return `
        <div class="ass-card" data-ev-id="${esc(ev.id)}">
          <div class="ass-card-accent" style="background:var(--brand-violet)"></div>
          <div class="ass-card-body">
            <div class="ass-card-top">
              <div class="ass-card-icon" style="background:rgba(124,111,247,.15);color:var(--brand-violet);font-size:1.4rem">${esc(ev.emoji || '📦')}</div>
              <div class="ass-card-acoes">
                <button class="ass-btn-edit ev-btn-edit" title="Editar">${EDIT_SVG}</button>
                <button class="ass-btn-del ev-btn-del" title="Excluir">×</button>
              </div>
            </div>
            <h4 class="ass-card-nome">${esc(ev.nome)}</h4>
            <div class="ev-meta">${qtd} gasto${qtd !== 1 ? 's' : ''}</div>
            <div class="ass-card-valores">
              <div><p class="ass-val-label">Total gasto</p><p class="ass-val-num ev-total">${moeda(tot)}</p></div>
            </div>
            <button class="btn-ev-gastos">Gerenciar gastos →</button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-ev-id]').forEach(card => {
      const id = card.dataset.evId;
      card.querySelector('.ev-btn-edit')?.addEventListener('click', () => abrirEditar(id));
      card.querySelector('.ev-btn-del')?.addEventListener('click',  () => excluir(id));
      card.querySelector('.btn-ev-gastos')?.addEventListener('click', () => abrirGastos(id));
    });
  }

  /* ── Modal criar/editar evento ── */
  const modalEvento = q('modal-evento');

  function abrirNovo() {
    q('evento-edit-id').value = '';
    q('evento-nome').value    = '';
    q('evento-emoji').value   = '';
    q('evento-modal-titulo').textContent = 'Novo Evento';
    const err = q('evento-msg-erro'); if (err) err.style.display = 'none';
    modalEvento?.classList.add('modal--aberto');
    setTimeout(() => q('evento-nome')?.focus(), 50);
  }

  function abrirEditar(id) {
    const ev = eventos.find(e => e.id === id);
    if (!ev) return;
    q('evento-edit-id').value = ev.id;
    q('evento-nome').value    = ev.nome;
    q('evento-emoji').value   = ev.emoji || '';
    q('evento-modal-titulo').textContent = 'Editar Evento';
    const err = q('evento-msg-erro'); if (err) err.style.display = 'none';
    modalEvento?.classList.add('modal--aberto');
    setTimeout(() => q('evento-nome')?.focus(), 50);
  }

  function salvarEvento() {
    const id    = q('evento-edit-id')?.value || '';
    const nome  = (q('evento-nome')?.value || '').trim();
    const emoji = (q('evento-emoji')?.value || '').trim() || '📦';
    const err   = q('evento-msg-erro');
    if (!nome) {
      if (err) { err.textContent = '⚠️ Digite o nome do evento.'; err.style.display = 'flex'; }
      return;
    }
    if (id) {
      const ev = eventos.find(e => e.id === id);
      if (ev) { ev.nome = nome; ev.emoji = emoji; }
    } else {
      eventos.push({ id: uid(), nome, emoji, gastos: [] });
    }
    salvar();
    modalEvento?.classList.remove('modal--aberto');
    renderEventos();
  }

  function excluir(id) {
    const ev = eventos.find(e => e.id === id);
    if (!ev) return;
    if (!confirm(`Excluir "${ev.nome}" e todos os seus gastos? Esta ação não pode ser desfeita.`)) return;
    eventos = eventos.filter(e => e.id !== id);
    salvar();
    renderEventos();
  }

  /* ── Modal gastos do evento ── */
  const modalGastos = q('modal-gastos');

  function abrirGastos(id) {
    eventoAtualId = id;
    const ev = eventos.find(e => e.id === id);
    if (!ev) return;
    const nomeEl = q('gastos-evento-nome');
    if (nomeEl) nomeEl.textContent = (ev.emoji || '📦') + ' ' + ev.nome;
    cancelarEdicaoGasto();
    renderGastos(ev);
    modalGastos?.classList.add('modal--aberto');
    setTimeout(() => q('gasto-descricao')?.focus(), 50);
  }

  function renderGastos(ev) {
    const lista   = q('gastos-lista');
    const vazioEl = q('gastos-vazio');
    const totalEl = q('gastos-evento-total');
    if (totalEl) totalEl.textContent = 'Total: ' + moeda(totalEvento(ev));
    const gastos = ev.gastos || [];
    if (!gastos.length) {
      if (lista)   lista.innerHTML     = '';
      if (vazioEl) vazioEl.style.display = '';
      return;
    }
    if (vazioEl) vazioEl.style.display = 'none';
    if (lista) {
      const editSvg = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`;
      lista.innerHTML = [...gastos].reverse().map(g => `
        <div class="gasto-row" data-gid="${esc(g.id)}">
          <div class="gasto-info">
            <span class="gasto-desc">${esc(g.descricao)}</span>
            <span class="gasto-data-fmt">${fmtData(g.data)}</span>
          </div>
          <div class="gasto-direita">
            <span class="gasto-valor">${moeda(g.valor)}</span>
            <button class="ass-btn-edit gasto-btn-edit" title="Editar">${editSvg}</button>
            <button class="ass-btn-del gasto-btn-del" title="Remover">×</button>
          </div>
        </div>`).join('');
      lista.querySelectorAll('.gasto-btn-del').forEach(btn => {
        btn.addEventListener('click', () => excluirGasto(btn.closest('.gasto-row').dataset.gid));
      });
      lista.querySelectorAll('.gasto-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => iniciarEdicaoGasto(btn.closest('.gasto-row').dataset.gid));
      });
    }
  }

  function iniciarEdicaoGasto(gastoId) {
    const ev = eventos.find(e => e.id === eventoAtualId);
    const g  = ev?.gastos?.find(g => g.id === gastoId);
    if (!g) return;
    if (q('gasto-edit-id'))    q('gasto-edit-id').value    = gastoId;
    if (q('gasto-descricao'))  q('gasto-descricao').value  = g.descricao;
    if (q('gasto-valor'))      q('gasto-valor').value      = g.valor;
    if (q('gasto-data'))       q('gasto-data').value       = g.data;
    const labelEl = q('btn-add-gasto-label'); if (labelEl) labelEl.textContent = 'Salvar alteração';
    const cancelEl = q('btn-cancel-gasto-edit'); if (cancelEl) cancelEl.style.display = '';
    const errEl = q('gasto-msg-erro'); if (errEl) errEl.style.display = 'none';
    q('gasto-descricao')?.focus();
  }

  function cancelarEdicaoGasto() {
    if (q('gasto-edit-id'))    q('gasto-edit-id').value    = '';
    if (q('gasto-descricao'))  q('gasto-descricao').value  = '';
    if (q('gasto-valor'))      q('gasto-valor').value      = '';
    if (q('gasto-data'))       q('gasto-data').value       = hoje();
    const labelEl = q('btn-add-gasto-label'); if (labelEl) labelEl.textContent = 'Adicionar';
    const cancelEl = q('btn-cancel-gasto-edit'); if (cancelEl) cancelEl.style.display = 'none';
    const errEl = q('gasto-msg-erro'); if (errEl) errEl.style.display = 'none';
  }

  function adicionarGasto() {
    const ev = eventos.find(e => e.id === eventoAtualId);
    if (!ev) return;
    const editId    = q('gasto-edit-id')?.value || '';
    const descricao = (q('gasto-descricao')?.value || '').trim();
    const valor     = parseFloat((q('gasto-valor')?.value || '').replace(',', '.'));
    const data      = q('gasto-data')?.value || hoje();
    const err       = q('gasto-msg-erro');
    if (!descricao) {
      if (err) { err.textContent = '⚠️ Digite a descrição.'; err.style.display = 'flex'; }
      return;
    }
    if (!valor || valor <= 0) {
      if (err) { err.textContent = '⚠️ Digite um valor válido.'; err.style.display = 'flex'; }
      return;
    }
    if (err) err.style.display = 'none';
    if (!ev.gastos) ev.gastos = [];
    if (editId) {
      const g = ev.gastos.find(g => g.id === editId);
      if (g) { g.descricao = descricao; g.valor = valor; g.data = data; }
    } else {
      ev.gastos.push({ id: gid(), descricao, valor, data });
    }
    salvar();
    renderGastos(ev);
    renderEventos();
    cancelarEdicaoGasto();
  }

  function excluirGasto(gastoId) {
    const ev = eventos.find(e => e.id === eventoAtualId);
    if (!ev) return;
    ev.gastos = (ev.gastos || []).filter(g => g.id !== gastoId);
    salvar();
    renderGastos(ev);
    renderEventos();
  }

  /* ── Eventos ── */
  q('btn-novo-evento')?.addEventListener('click', abrirNovo);
  q('evento-modal-salvar')?.addEventListener('click', salvarEvento);
  q('evento-modal-cancelar')?.addEventListener('click', () => modalEvento?.classList.remove('modal--aberto'));
  q('evento-modal-fechar')?.addEventListener('click',   () => modalEvento?.classList.remove('modal--aberto'));
  modalEvento?.addEventListener('click', e => { if (e.target === modalEvento) modalEvento.classList.remove('modal--aberto'); });
  ['evento-nome', 'evento-emoji'].forEach(id => q(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') salvarEvento(); }));

  q('btn-add-gasto')?.addEventListener('click', adicionarGasto);
  q('btn-cancel-gasto-edit')?.addEventListener('click', cancelarEdicaoGasto);
  q('gasto-descricao')?.addEventListener('keydown', e => { if (e.key === 'Enter') q('gasto-valor')?.focus(); });
  q('gasto-valor')?.addEventListener('keydown',     e => { if (e.key === 'Enter') adicionarGasto(); });
  q('gastos-modal-fechar')?.addEventListener('click', () => { cancelarEdicaoGasto(); modalGastos?.classList.remove('modal--aberto'); });
  modalGastos?.addEventListener('click', e => { if (e.target === modalGastos) { cancelarEdicaoGasto(); modalGastos.classList.remove('modal--aberto'); } });

  /* ── API pública ── */
  window._renderEventos  = renderEventos;
  window._getEventos     = () => eventos;
  window._totalEvento    = totalEvento;
  window._getEventGastos = function(ini, fim) {
    const result = [];
    eventos.forEach(ev => {
      (ev.gastos || []).forEach(g => {
        if (ini && g.data < ini) return;
        if (fim && g.data > fim) return;
        result.push({ id: '__eg_' + g.id, tipo: 'despesa', descricao: g.descricao,
          valor: g.valor, data: g.data, categoria: null,
          _evNome: ev.nome, _evEmoji: ev.emoji || '📦',
          _evId: ev.id, _gastoId: g.id });
      });
    });
    return result;
  };

  window._abrirGastosEditar = function(evId, gastoId) {
    abrirGastos(evId);
    setTimeout(() => iniciarEdicaoGasto(gastoId), 60);
  };

  window._excluirGastoExterno = function(evId, gastoId) {
    const ev = eventos.find(e => e.id === evId);
    if (!ev) return;
    ev.gastos = (ev.gastos || []).filter(g => g.id !== gastoId);
    salvar();
    renderEventos();
    window._recarregarTransacoes?.();
    window._renderTabelaTransacoes?.();
  };

  // script.js roda o DOMContentLoaded primeiro (antes de eventos.js);
  // ao chegar aqui a API já está registrada, então forçamos re-render.
  window._recarregarTransacoes?.();
});
