/* ══════════════════════════════════════════════
   MINHA CARTEIRA — script.js  v2.2
   BUG FIX: modais usam style.display (não [hidden] nem classes)
══════════════════════════════════════════════ */
'use strict';

const STORAGE_KEY      = 'carteira_transacoes';
const STORAGE_KEY_TEMA = 'carteira_tema';

let transacoes          = carregar(STORAGE_KEY) || [];
let tipoSelecionado     = 'receita';
let tipoEditando        = 'receita';
let idParaExcluir       = null;
let modalCallback       = null;
let filtroAtivo         = false;
let transacoesFiltradas = [];

const $ = id => document.getElementById(id);

// Formulário
const inputDescricao = $('input-descricao');
const inputValor     = $('input-valor');
const inputData      = $('input-data');
const inputCategoria = $('input-categoria');
const btnAdicionar   = $('btn-adicionar');
const msgErro        = $('msg-erro');
const btnReceita     = $('btn-receita');
const btnDespesa     = $('btn-despesa');

// Filtros
const filtroInicio    = $('filtro-inicio');
const filtroFim       = $('filtro-fim');
const filtroCat       = $('filtro-categoria');
const btnFiltrar      = $('btn-filtrar');
const btnLimparFiltro = $('btn-limpar-filtro');

// Tabela
const tabelaBody     = $('tabela-body');
const listaVazia     = $('lista-vazia');
const contagem       = $('contagem');
const contagemRodape = $('contagem-rodape');

// Resumo
const saldoEl    = $('saldo');
const receitasEl = $('total-receitas');
const despesasEl = $('total-despesas');

// Tema
const btnTema = $('btn-tema');

// Modal exclusão
const modal          = $('modal');
const modalMsg       = $('modal-msg');
const modalCancelar  = $('modal-cancelar');
const modalConfirmar = $('modal-confirmar');

// Modal edição
const modalEdicao = $('modal-edicao');
const editId      = $('edit-id');
const editDesc    = $('edit-descricao');
const editVal     = $('edit-valor');
const editDt      = $('edit-data');
const editCat     = $('edit-categoria');
const editErro    = $('edit-msg-erro');
const editBtnRec  = $('edit-btn-receita');
const editBtnDesp = $('edit-btn-despesa');

// Gráfico
const canvas = $('grafico-pizza');
const ctx    = canvas ? canvas.getContext('2d') : null;

function catMap() {
  return window._catsMgr ? window._catsMgr.getCatMap() : { outros: { emoji: '📦', nome: 'Outros' } };
}

const CORES = ['#7C6FF7','#2EC4B6','#FF5C7A','#FFC542','#5B9CF6','#30D988','#fb923c','#f472b6','#34d399','#94a3b8'];

// ── INIT ──────────────────────────────────────────
function init() {
  if (inputData) inputData.value = hoje();
  if (localStorage.getItem(STORAGE_KEY_TEMA) === 'claro') aplicarTema('claro');
  aplicarPeriodo(28);
  registrarEventos();
  window._solicitarExclusao = solicitarExclusao;
  window._abrirEdicao       = abrirEdicao;
  window._getTransacoes     = () => transacoes;
  window._recarregarTransacoes = () => {
    transacoes = carregar(STORAGE_KEY) || [];
    filtroAtivo ? aplicarFiltro() : renderTudo();
  };
  window._adicionarTransacaoAutomatica = (tipo, descricao, valor, data, categoria) => {
    transacoes.push({ id: uid(), tipo, descricao, valor, data, categoria });
    salvar(STORAGE_KEY, transacoes);
    filtroAtivo ? aplicarFiltro() : renderTudo();
  };
}

// ── EVENTOS ───────────────────────────────────────
function registrarEventos() {
  btnReceita?.addEventListener('click', () => selTipo('receita'));
  btnDespesa?.addEventListener('click', () => selTipo('despesa'));
  btnAdicionar?.addEventListener('click', adicionar);
  [inputDescricao, inputValor, inputData].forEach(c =>
    c?.addEventListener('keydown', e => e.key === 'Enter' && adicionar())
  );

  // Período rápido
  document.querySelectorAll('.periodo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('periodo-btn--ativo'));
      btn.classList.add('periodo-btn--ativo');
      aplicarPeriodo(+btn.dataset.dias);
    });
  });

  [filtroInicio, filtroFim].forEach(inp =>
    inp?.addEventListener('change', () =>
      document.querySelectorAll('.periodo-btn').forEach(b => b.classList.remove('periodo-btn--ativo'))
    )
  );

  btnFiltrar?.addEventListener('click', aplicarFiltro);
  btnLimparFiltro?.addEventListener('click', limparFiltro);

  window._confirmarApagarTudo = () => {
    abrirModalEx('Deseja apagar TODAS as transações, assinaturas, fontes de renda e categorias criadas? Esta ação não pode ser desfeita.', null);
  };

  // Modal exclusão
  modalCancelar?.addEventListener('click', () => fecharModalEx());
  modalConfirmar?.addEventListener('click', confirmarEx);
  modal?.addEventListener('click', e => { if (e.target === modal) fecharModalEx(); });

  // Modal edição
  editBtnRec?.addEventListener('click', () => selTipoEdit('receita'));
  editBtnDesp?.addEventListener('click', () => selTipoEdit('despesa'));
  $('edit-salvar')?.addEventListener('click', salvarEdicao);
  $('edit-cancelar')?.addEventListener('click', () => fecharM(modalEdicao));
  $('edit-fechar')?.addEventListener('click', () => fecharM(modalEdicao));
  modalEdicao?.addEventListener('click', e => { if (e.target === modalEdicao) fecharM(modalEdicao); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { fecharModalEx(); fecharM(modalEdicao); window._fecharNovaTransacaoMobile?.(); }
  });

  btnTema?.addEventListener('click', alternarTema);
}

// ── PERÍODO ───────────────────────────────────────
function aplicarPeriodo(dias) {
  if (dias === 0) {
    if (filtroInicio) filtroInicio.value = '';
    if (filtroFim)    filtroFim.value    = '';
  } else {
    const d = new Date(); d.setDate(d.getDate() - dias);
    if (filtroInicio) filtroInicio.value = d.toISOString().split('T')[0];
    if (filtroFim)    filtroFim.value    = hoje();
  }
  aplicarFiltro();
}

// ── FILTROS ───────────────────────────────────────
function aplicarFiltro() {
  const ini = filtroInicio?.value || '';
  const fim = filtroFim?.value    || '';
  const cat = filtroCat?.value    || 'todas';
  if (!ini && !fim && cat === 'todas') {
    filtroAtivo = false;
    renderLista(transacoes); resumo(transacoes); grafico(transacoes); return;
  }
  transacoesFiltradas = transacoes.filter(t =>
    (cat === 'todas' || t.categoria === cat) && (!ini || t.data >= ini) && (!fim || t.data <= fim)
  );
  filtroAtivo = true;
  renderLista(transacoesFiltradas); resumo(transacoesFiltradas); grafico(transacoesFiltradas);
}

function limparFiltro() {
  if (filtroInicio) filtroInicio.value = '';
  if (filtroFim)    filtroFim.value    = '';
  if (filtroCat)    filtroCat.value    = filtroCat.options[0]?.value || 'todas';
  filtroAtivo = false;
  document.querySelectorAll('.periodo-btn').forEach(b =>
    b.classList.toggle('periodo-btn--ativo', b.dataset.dias === '28')
  );
  aplicarPeriodo(28);
}

// ── ADICIONAR ─────────────────────────────────────
function adicionar() {
  const descricao = inputDescricao?.value.trim() || '';
  const valorStr  = inputValor?.value || '';
  const data      = inputData?.value  || '';
  const categoria = inputCategoria?.value || 'outros';
  if (!descricao) return erroForm('Informe uma descrição.');
  const valor = parseFloat(valorStr);
  if (!valorStr || isNaN(valor) || valor <= 0) return erroForm('Valor inválido.');
  if (!data) return erroForm('Selecione uma data.');
  transacoes.push({ id: uid(), tipo: tipoSelecionado, descricao, valor, data, categoria });
  salvar(STORAGE_KEY, transacoes);
  if (inputDescricao) inputDescricao.value = '';
  if (inputValor)     inputValor.value     = '';
  if (inputData)      inputData.value      = hoje();
  if (msgErro) msgErro.style.display = 'none';
  toast(`✅ ${tipoSelecionado === 'receita' ? 'Receita' : 'Despesa'} adicionada!`);
  filtroAtivo ? aplicarFiltro() : renderTudo();
  window._fecharNovaTransacaoMobile?.();
}

// ── REMOVER ───────────────────────────────────────
function solicitarExclusao(id) {
  const t = transacoes.find(t => t.id === id); if (!t) return;
  abrirModalEx(`Remover "${t.descricao}" (${moeda(t.valor)})?`, id);
}

function removerTransacao(id) {
  transacoes = transacoes.filter(t => t.id !== id);
  salvar(STORAGE_KEY, transacoes);
  if (filtroAtivo) transacoesFiltradas = transacoesFiltradas.filter(t => t.id !== id);
  filtroAtivo ? aplicarFiltro() : renderTudo();
  toast('🗑️ Transação removida.');
}

function limparTudo() {
  transacoes = []; transacoesFiltradas = []; filtroAtivo = false;
  salvar(STORAGE_KEY, transacoes);
  salvar('carteira_assinaturas', []);
  salvar('carteira_rendas', []);
  window._catsMgr?.resetCats();
  renderTudo();
  window._renderAssinaturas?.();
  window._renderRenda?.();
  toast('🗑️ Tudo removido.');
}

// ── EDITAR ────────────────────────────────────────
function abrirEdicao(id) {
  const t = transacoes.find(t => t.id === id); if (!t) return;
  if (editId)   editId.value   = t.id;
  if (editDesc) editDesc.value = t.descricao;
  if (editVal)  editVal.value  = t.valor;
  if (editDt)   editDt.value   = t.data;
  if (editErro) editErro.style.display = 'none';
  selTipoEdit(t.tipo, t.categoria);
  abrirM(modalEdicao);
  editDesc?.focus();
}

function salvarEdicao() {
  const id  = editId?.value || '';
  const desc = editDesc?.value.trim() || '';
  const vStr = editVal?.value || '';
  const data = editDt?.value  || '';
  const cat  = editCat?.value || 'outros';
  if (!desc) { showEditErr('Informe uma descrição.'); return; }
  const valor = parseFloat(vStr);
  if (!vStr || isNaN(valor) || valor <= 0) { showEditErr('Valor inválido.'); return; }
  if (!data) { showEditErr('Selecione uma data.'); return; }
  const idx = transacoes.findIndex(t => t.id === id); if (idx === -1) return;
  transacoes[idx] = { ...transacoes[idx], tipo: tipoEditando, descricao: desc, valor, data, categoria: cat };
  salvar(STORAGE_KEY, transacoes);
  fecharM(modalEdicao);
  toast('✏️ Transação atualizada!');
  filtroAtivo ? aplicarFiltro() : renderTudo();
}

function showEditErr(txt) {
  if (!editErro) return;
  editErro.textContent = txt; editErro.style.display = 'flex';
}

function selTipoEdit(tipo, categoriaDesejada) {
  tipoEditando = tipo;
  editBtnRec?.classList.toggle('ativo', tipo === 'receita');
  editBtnDesp?.classList.toggle('ativo', tipo === 'despesa');
  window._catsMgr?.populateSelectByTipo('edit-categoria', tipo, categoriaDesejada);
}

// ── MODAIS (style.display — não usa hidden nem classes) ──
function abrirM(el)  { if (!el) return; el.classList.add('modal--aberto'); document.body.classList.add('no-scroll'); }
function fecharM(el) { if (!el) return; el.classList.remove('modal--aberto'); document.body.classList.remove('no-scroll'); }

function abrirModalEx(msg, id, cb) {
  idParaExcluir = id;
  modalCallback = cb || null;
  if (modalMsg) modalMsg.textContent = msg;
  abrirM(modal);
  modalConfirmar?.focus();
}
function fecharModalEx() { fecharM(modal); idParaExcluir = null; modalCallback = null; }
function confirmarEx() {
  const id = idParaExcluir;
  const cb = modalCallback;
  fecharModalEx();
  if (cb) { cb(); return; }
  if (id === null) limparTudo(); else removerTransacao(id);
}

// Expõe para ui.js e categories.js
window._abrirModal    = abrirM;
window._fecharModal   = fecharM;
window._abrirModalExCb = (msg, cb) => abrirModalEx(msg, null, cb);

// ── RENDER ────────────────────────────────────────
function renderTudo() { renderLista(transacoes); resumo(transacoes); grafico(transacoes); }

function renderLista(lista) {
  if (!tabelaBody) return;
  tabelaBody.innerHTML = '';
  const tEl  = $('tabela-transacoes');
  const ini  = filtroInicio?.value || '';
  const fim  = filtroFim?.value    || '';
  const evGs = window._getEventGastos?.(ini || null, fim || null) || [];
  const ord  = [...lista, ...evGs].sort((a, b) => b.data.localeCompare(a.data));
  const vaz  = ord.length === 0;
  if (listaVazia) listaVazia.style.display = vaz ? 'flex' : 'none';
  if (tEl)        tEl.style.display        = vaz ? 'none' : '';
  ord.forEach(t => {
    const _cm = catMap(); const cat = _cm[t.categoria] || _cm.outros || { emoji: '📦', nome: t.categoria };
    const tr  = document.createElement('tr');
    if (t._evNome) {
      tr.innerHTML = `
        <td class="td-data">${fmtD(t.data)}</td>
        <td>${esc(t.descricao)}<br><small class="tx-ev-label">${esc(t._evEmoji)} ${esc(t._evNome)}</small></td>
        <td><span class="chip-categoria tx-ev-chip">📅 evento</span></td>
        <td><span class="badge badge--despesa">↓ despesa</span></td>
        <td class="td-valor valor-despesa">− ${moeda(t.valor)}</td>
        <td style="text-align:right;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px">
          <button class="btn-editar" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
          <button class="btn-excluir" title="Remover">×</button>
        </span></td>`;
      tr.querySelector('.btn-editar' ).addEventListener('click', () => window._abrirGastosEditar?.(t._evId, t._gastoId));
      tr.querySelector('.btn-excluir').addEventListener('click', () => {
        if (confirm(`Remover "${t.descricao}" (${moeda(t.valor)}) do evento ${t._evNome}?`))
          window._excluirGastoExterno?.(t._evId, t._gastoId);
      });
    } else {
      tr.innerHTML = `
        <td class="td-data">${fmtD(t.data)}</td>
        <td>${esc(t.descricao)}</td>
        <td><span class="chip-categoria">${cat.emoji} ${cat.nome}</span></td>
        <td><span class="badge badge--${t.tipo}">${t.tipo === 'receita' ? '↑' : '↓'} ${t.tipo}</span></td>
        <td class="td-valor valor-${t.tipo}">${t.tipo === 'receita' ? '+' : '−'} ${moeda(t.valor)}</td>
        <td class="td-acoes">
          <button class="btn-editar" title="Editar">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </button>
          <button class="btn-excluir" title="Remover">×</button>
        </td>`;
      tr.querySelector('.btn-editar').addEventListener('click', () => abrirEdicao(t.id));
      tr.querySelector('.btn-excluir').addEventListener('click', () => solicitarExclusao(t.id));
    }
    tabelaBody.appendChild(tr);
  });
  const n = lista.length, txt = n === 1 ? '1 transação' : `${n} transações`;
  const label = filtroAtivo ? `${txt} (filtrado)` : txt;
  if (contagem)       contagem.textContent       = label;
  if (contagemRodape) contagemRodape.textContent = label;
}

function resumo(lista) {
  const ini  = filtroInicio?.value || '';
  const fim  = filtroFim?.value    || '';
  const evGs = window._getEventGastos?.(ini || null, fim || null) || [];
  const rec  = lista.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
  const desp = lista.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0)
             + evGs.reduce((a, g) => a + g.valor, 0);
  const s    = rec - desp;
  if (saldoEl)    saldoEl.textContent    = moeda(s);
  if (receitasEl) receitasEl.textContent = moeda(rec);
  if (despesasEl) despesasEl.textContent = moeda(desp);
  const v = document.querySelector('.card-saldo .card-valor');
  const b = document.querySelector('.card-saldo .card-bar-fill--saldo');
  if (v) v.style.color      = s < 0 ? 'var(--color-danger)' : '';
  if (b) b.style.background = s < 0 ? 'var(--color-danger)' : '';
}

function resolverCatDash(cat) {
  if (typeof cat === 'string' && cat.startsWith('__ev_')) {
    const ev = (window._getEventos?.() || []).find(e => '__ev_' + e.id === cat);
    return ev ? { emoji: ev.emoji || '📦', nome: ev.nome } : { emoji: '📦', nome: 'Evento' };
  }
  const cm = catMap(); return cm[cat] || cm.outros || { emoji: '📦', nome: cat };
}

function grafico(lista) {
  if (!canvas || !ctx) return;
  const leg = $('grafico-legenda');
  const vaz = $('grafico-vazio');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (leg) leg.innerHTML = '';
  const ini  = filtroInicio?.value || '';
  const fim  = filtroFim?.value    || '';
  const evGs = window._getEventGastos?.(ini || null, fim || null) || [];
  const desp = lista.filter(t => t.tipo === 'despesa');
  if (!desp.length && !evGs.length) {
    if (vaz) vaz.style.display = 'block'; canvas.style.display = 'none'; return;
  }
  if (vaz) vaz.style.display = 'none'; canvas.style.display = 'block';
  const por = {};
  desp.forEach(t => { por[t.categoria] = (por[t.categoria] || 0) + t.valor; });
  evGs.forEach(g => { const k = '__ev_' + g._evId; por[k] = (por[k] || 0) + g.valor; });
  const total = Object.values(por).reduce((a, b) => a + b, 0);
  const cx = canvas.width/2, cy = canvas.height/2, r = Math.min(cx,cy)-10, ri = r*0.55;
  let ang = -Math.PI/2;
  Object.entries(por).sort((a,b)=>b[1]-a[1]).forEach(([cat,val],i) => {
    const f = (val/total)*2*Math.PI, cor = CORES[i%CORES.length];
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,ang,ang+f); ctx.closePath();
    ctx.fillStyle=cor; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,ri,0,2*Math.PI);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--surface-raised').trim()||'#131622';
    ctx.fill(); ang+=f;
    if (leg) {
      const c=resolverCatDash(cat), d=document.createElement('div');
      d.className='legenda-item';
      d.innerHTML=`<span class="legenda-cor" style="background:${cor}"></span><span>${c.emoji} ${c.nome} (${(val/total*100).toFixed(1)}%)</span>`;
      leg.appendChild(d);
    }
  });
  ctx.font=`700 13px 'Plus Jakarta Sans',sans-serif`;
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()||'#f0f2ff';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Despesas',cx,cy-9);
  ctx.font=`600 13px 'Plus Jakarta Sans',sans-serif`;
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim()||'#FF5C7A';
  ctx.fillText(moeda(total),cx,cy+10);
}

// ── TIPO ──────────────────────────────────────────
function selTipo(tipo) {
  tipoSelecionado = tipo;
  btnReceita?.classList.toggle('ativo', tipo === 'receita');
  btnDespesa?.classList.toggle('ativo', tipo === 'despesa');
  window._catsMgr?.populateSelectByTipo('input-categoria', tipo);
}

// ── TEMA ──────────────────────────────────────────
function alternarTema() {
  const claro = document.documentElement.classList.toggle('claro');
  localStorage.setItem(STORAGE_KEY_TEMA, claro ? 'claro' : 'escuro');
  const ic = btnTema?.querySelector('.tema-icon');
  if (ic) ic.textContent = claro ? 'Tema Claro' : 'Tema Escuro';
  grafico(filtroAtivo ? transacoesFiltradas : transacoes);
}
function aplicarTema(tema) {
  if (tema !== 'claro') return;
  document.documentElement.classList.add('claro');
  const ic = btnTema?.querySelector('.tema-icon');
  if (ic) ic.textContent = 'Tema Claro';
}

// ── ERROS DO FORM ─────────────────────────────────
function erroForm(txt) {
  if (!msgErro) return;
  msgErro.textContent = txt; msgErro.style.display = 'flex';
}

// ── TOAST ─────────────────────────────────────────
function toast(msg, ms=3000) {
  const el = $('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('toast--show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('toast--show'), ms);
}
window._mostrarToast = toast;

// ── STORAGE ───────────────────────────────────────
function salvar(k,d)   { try{ localStorage.setItem(k,JSON.stringify(d)); }catch(e){} }
function carregar(k)   { try{ const v=localStorage.getItem(k); return v?JSON.parse(v):null; }catch(e){return null;} }

// ── UTILS ─────────────────────────────────────────
function uid()    { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,6)); }
function hoje()   { return new Date().toISOString().split('T')[0]; }
function moeda(v) { return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function fmtD(s)  { if(!s)return''; const [a,m,d]=s.split('-'); return `${d}/${m}/${a}`; }
function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

document.addEventListener('DOMContentLoaded', init);
