/* ═══════════════════════════════════════════
   MINHA CARTEIRA — ui.js v2.2
   • Navegação entre views
   • Tema mobile
   • Hamburger / sidebar mobile
   • View Transações (tabela espelho + filtros)
   • View Assinaturas (CRUD completo)
   • View Relatórios
   • Configurações (exportar/importar/apagar)
   • Toast de notificação
═══════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Helpers ── */
  const q  = id => document.getElementById(id);
  window._isModoEmpresa = () => localStorage.getItem('carteira_modo_empresa') === '1';

  // Aplica estado do modo empresa nas categorias logo no startup
  setTimeout(() => {
    window._catsMgr?.renderCatPanel?.();
    window._catsMgr?.populateCatSelects?.();
  }, 0);

  const abrirModal  = el => el && el.classList.add('modal--aberto');
  const fecharModal = el => el && el.classList.remove('modal--aberto');

  function moeda(v) { return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtData(s) { if(!s)return''; const[a,m,d]=s.split('-'); return `${d}/${m}/${a}`; }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function getTransacoes() { try { return JSON.parse(localStorage.getItem('carteira_transacoes'))||[]; } catch{return[];} }

  /* ══════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════ */
  const toastEl = q('toast');
  function mostrarToast(msg, dur=3000) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('toast--show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('toast--show'), dur);
  }
  window._mostrarToast = mostrarToast;

  /* ══════════════════════════════════════════
     NAVEGAÇÃO DE VIEWS
  ══════════════════════════════════════════ */
  const navLinks = document.querySelectorAll('.nav-item[data-view]');
  const views    = document.querySelectorAll('.view');

  function mostrarView(nome) {
    views.forEach(v => v.classList.remove('view--active'));
    navLinks.forEach(l => l.classList.remove('nav-item--active'));
    const ve = q('view-'+nome);
    if (ve) ve.classList.add('view--active');
    const le = document.querySelector(`.nav-item[data-view="${nome}"]`);
    if (le) le.classList.add('nav-item--active');
    toggleSidebar(false);
    if (nome === 'relatorios')  renderRelatorios();
    if (nome === 'transacoes')  renderTabelaTransacoes();
    if (nome === 'assinaturas') renderAssinaturas();
    if (nome === 'renda')       renderRenda();
    if (nome === 'eventos')     window._renderEventos?.();
    if (nome === 'configuracoes') syncTemaConfig();
  }

  navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); mostrarView(l.dataset.view); }));

  /* ══════════════════════════════════════════
     SIDEBAR MOBILE
  ══════════════════════════════════════════ */
  const sidebar = q('sidebar');
  const overlay = q('sidebar-overlay');

  function toggleSidebar(force) {
    const open = force !== undefined ? force : !sidebar.classList.contains('sidebar--open');
    sidebar.classList.toggle('sidebar--open', open);
    overlay.classList.toggle('active', open);
    document.body.classList.toggle('no-scroll', open);
  }

  q('btn-hamburger')?.addEventListener('click', () => toggleSidebar());
  overlay?.addEventListener('click', () => toggleSidebar(false));

  /* ══════════════════════════════════════════
     TEMA
  ══════════════════════════════════════════ */
  q('btn-tema-mobile')?.addEventListener('click', () => q('btn-tema')?.click());
  q('btn-tema-config2')?.addEventListener('click', () => q('btn-tema')?.click());

  function syncTemaConfig() {
    const claro = document.documentElement.classList.contains('claro');
    const lbl = q('config-tema-label');
    if (lbl) lbl.textContent = claro ? 'Claro' : 'Escuro';
  }

  new MutationObserver(() => {
    const claro = document.documentElement.classList.contains('claro');
    const ic = q('btn-tema')?.querySelector('.tema-icon');
    if (ic) ic.textContent = claro ? 'Tema Claro' : 'Tema Escuro';
    const sol = q('btn-tema')?.querySelector('.icon-sol');
    const lua = q('btn-tema')?.querySelector('.icon-lua');
    if (sol) sol.style.display = claro ? 'none' : '';
    if (lua) lua.style.display = claro ? '' : 'none';
    syncTemaConfig();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ══════════════════════════════════════════
     DATA NO CABEÇALHO
  ══════════════════════════════════════════ */
  const anoEl = q('ano');
  if (anoEl) anoEl.textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  /* ══════════════════════════════════════════
     NOVA TRANSAÇÃO — tela cheia no mobile
  ══════════════════════════════════════════ */
  const painelNovaTransacao = q('painel-nova-transacao');

  function abrirNovaTransacaoMobile() {
    painelNovaTransacao?.classList.add('painel--aberto');
    document.body.classList.add('no-scroll');
  }
  function fecharNovaTransacaoMobile() {
    painelNovaTransacao?.classList.remove('painel--aberto');
    document.body.classList.remove('no-scroll');
  }
  window._fecharNovaTransacaoMobile = fecharNovaTransacaoMobile;

  q('btn-abrir-nova-transacao')   ?.addEventListener('click', abrirNovaTransacaoMobile);
  q('btn-fechar-nova-transacao')  ?.addEventListener('click', fecharNovaTransacaoMobile);

  /* ══════════════════════════════════════════
     ATALHO NOVA TRANSAÇÃO
  ══════════════════════════════════════════ */
  q('btn-nova-transacao-atalho')?.addEventListener('click', () => {
    mostrarView('dashboard');
    if (window.matchMedia('(max-width: 860px)').matches) abrirNovaTransacaoMobile();
    setTimeout(() => q('input-descricao')?.focus(), 100);
  });

  /* ══════════════════════════════════════════
     VIEW TRANSAÇÕES — tabela espelho
  ══════════════════════════════════════════ */
  function catMapUI() {
    return window._catsMgr ? window._catsMgr.getCatMap() : { outros: { emoji: '📦', nome: 'Outros' } };
  }

  function renderTabelaTransacoes(lista, ini, fim) {
    if (!lista) lista = getTransacoes();
    ini = ini || '';
    fim = fim || '';
    const corpo  = q('tabela-body2');
    const vazio  = q('lista-vazia2');
    const tabela = q('tabela-transacoes2');
    const badge  = q('contagem2');
    if (!corpo) return;
    corpo.innerHTML = '';
    const catF    = q('filtro2-categoria')?.value || 'todas';
    const buscaRender = (q('filtro2-busca')?.value || '').trim().toLowerCase();
    const clienteRender = q('filtro2-cliente')?.value || 'todos';
    let evGs = catF === 'todas' ? (window._getEventGastos?.(ini || null, fim || null) || []) : [];
    if (buscaRender) evGs = evGs.filter(e => (e.descricao || '').toLowerCase().includes(buscaRender));
    if (clienteRender !== 'todos') evGs = [];
    const sorted = [...lista, ...evGs].sort((a,b)=>b.data.localeCompare(a.data));
    const empty = !sorted.length;
    if (vazio)  vazio.style.display  = empty ? 'flex' : 'none';
    if (tabela) tabela.style.display = empty ? 'none' : '';

    sorted.forEach(t => {
      const _cm = catMapUI(); const cat = _cm[t.categoria]||_cm.outros||{emoji:'📦',nome:t.categoria};
      const tr  = document.createElement('tr');
      if (t._evNome) {
        tr.innerHTML = `
          <td class="td-data">${fmtData(t.data)}</td>
          <td>${esc(t.descricao)}<br><small class="tx-ev-label">${esc(t._evEmoji)} ${esc(t._evNome)}</small></td>
          <td><span class="chip-categoria tx-ev-chip">📅 evento</span></td>
          <td><span class="badge badge--despesa">↓ despesa</span></td>
          <td class="td-valor valor-despesa">− ${moeda(t.valor)}</td>
          <td style="text-align:right;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:4px">
            <button class="btn-editar" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
            <button class="btn-excluir" title="Remover">×</button>
          </span></td>`;
        tr.querySelector('.btn-editar').addEventListener('click', () => window._abrirGastosEditar?.(t._evId, t._gastoId));
        tr.querySelector('.btn-excluir').addEventListener('click', () => {
          if (confirm(`Remover "${t.descricao}" (${moeda(t.valor)}) do evento ${t._evNome}?`)) {
            window._excluirGastoExterno?.(t._evId, t._gastoId);
          }
        });
      } else {
        tr.innerHTML = `
          <td class="td-data">${fmtData(t.data)}</td>
          <td>${esc(t.descricao)}</td>
          <td><span class="chip-categoria">${cat.emoji} ${cat.nome}</span></td>
          <td><span class="badge badge--${t.tipo}">${t.tipo==='receita'?'↑':'↓'} ${t.tipo}</span></td>
          <td class="td-valor valor-${t.tipo}">${t.tipo==='receita'?'+':'−'} ${moeda(t.valor)}</td>
          <td class="td-acoes">
            <button class="btn-editar"  title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
            <button class="btn-excluir" title="Remover">×</button>
          </td>`;
        tr.querySelector('.btn-editar') .addEventListener('click', () => window._abrirEdicao?.(t.id));
        tr.querySelector('.btn-excluir').addEventListener('click', () => window._solicitarExclusao?.(t.id));
      }
      corpo.appendChild(tr);
    });
    if (badge) badge.textContent = `${lista.length}`;
  }

  window._renderTabelaTransacoes = renderTabelaTransacoes;

  /* ── Filtros de transações: estado de período ── */
  let periodoTxDias = 0;
  let periodoTxMes  = '';
  let periodoTxAno  = '';

  function popularAnosTx() {
    const sel = q('sel-ano-tx');
    if (!sel) return;
    const anoAtual = new Date().getFullYear();
    const todas    = getTransacoes();
    const anoMin   = todas.length ? Math.min(...todas.map(t => +t.data.slice(0,4))) : anoAtual;
    const saved    = sel.value;
    sel.innerHTML  = '<option value="">Todos os anos</option>';
    for (let a = anoAtual; a >= anoMin; a--) {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      sel.appendChild(opt);
    }
    if (saved) sel.value = saved;
  }

  function atualizarCatsFiltro2(tipo) {
    const sel = q('filtro2-categoria');
    if (!sel) return;
    const mgr = window._catsMgr;
    if (!mgr) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="todas">Todas</option>';
    const cats = tipo === 'receita'  ? mgr.getCatsByTipo('receita')
               : tipo === 'despesa' ? mgr.getCatsByTipo('despesa')
               : [...mgr.getCatsByTipo('receita'), ...mgr.getCatsByTipo('despesa')];
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.emoji + ' ' + c.nome;
      sel.appendChild(opt);
    });
    if (prev !== 'todas' && [...sel.options].some(o => o.value === prev)) sel.value = prev;
    else sel.value = 'todas';
  }

  function atualizarFiltroCliente() {
    const grupo = q('filtro2-cliente-grupo');
    const sel   = q('filtro2-cliente');
    if (!grupo || !sel) return;
    const emp = window._isModoEmpresa?.() || false;
    if (!emp) { grupo.style.display = 'none'; return; }
    grupo.style.display = '';
    const cats = window._catsMgr?.getCatsByTipo?.('cliente') || [];
    const prev = sel.value;
    sel.innerHTML = '<option value="todos">Todos</option>';
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = `${c.emoji||'👥'} ${c.nome}`;
      sel.appendChild(o);
    });
    const oSem = document.createElement('option');
    oSem.value = '__sem__'; oSem.textContent = '(Sem cliente)';
    sel.appendChild(oSem);
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  }

  function aplicarFiltroTx() {
    popularAnosTx();
    atualizarFiltroCliente();
    const tipo     = q('filtro2-tipo')?.value || 'todos';
    const cat      = q('filtro2-categoria')?.value || 'todas';
    const busca    = (q('filtro2-busca')?.value || '').trim().toLowerCase();
    const clienteF = q('filtro2-cliente')?.value || 'todos';
    let ini = '', fim = '';

    if (periodoTxMes || periodoTxAno) {
      const ano = periodoTxAno || new Date().getFullYear().toString();
      if (periodoTxMes) {
        ini = `${ano}-${periodoTxMes}-01`;
        const lastDay = new Date(+ano, +periodoTxMes, 0).getDate();
        fim = `${ano}-${periodoTxMes}-${String(lastDay).padStart(2,'0')}`;
      } else {
        ini = `${ano}-01-01`;
        fim = `${ano}-12-31`;
      }
    } else if (periodoTxDias > 0) {
      const hoje = new Date();
      fim = hoje.toISOString().slice(0,10);
      const de  = new Date(hoje); de.setDate(de.getDate() - periodoTxDias);
      ini = de.toISOString().slice(0,10);
    }

    const res = getTransacoes().filter(t =>
      (tipo === 'todos' || t.tipo === tipo)
      && (cat === 'todas' || t.categoria === cat)
      && (!ini || t.data >= ini)
      && (!fim || t.data <= fim)
      && (!busca || (t.descricao || '').toLowerCase().includes(busca))
      && (clienteF === 'todos' || (clienteF === '__sem__' ? !t.cliente : t.cliente === clienteF))
    );
    renderTabelaTransacoes(res, ini, fim);
  }

  // Period buttons
  document.querySelectorAll('.periodo-btn-tx').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.periodo-btn-tx').forEach(b => b.classList.remove('periodo-btn--ativo'));
      btn.classList.add('periodo-btn--ativo');
      periodoTxDias = +btn.dataset.dias;
      periodoTxMes  = '';
      periodoTxAno  = '';
      const selM = q('sel-mes-tx'), selA = q('sel-ano-tx');
      if (selM) { selM.value = ''; selM.classList.remove('periodo-sel--ativo'); }
      if (selA) { selA.value = ''; selA.classList.remove('periodo-sel--ativo'); }
      aplicarFiltroTx();
    });
  });

  function handlePeriodoCustomTx() {
    periodoTxMes = q('sel-mes-tx')?.value || '';
    periodoTxAno = q('sel-ano-tx')?.value || '';
    if (periodoTxMes || periodoTxAno) {
      document.querySelectorAll('.periodo-btn-tx').forEach(b => b.classList.remove('periodo-btn--ativo'));
      q('sel-mes-tx')?.classList.toggle('periodo-sel--ativo', !!periodoTxMes);
      q('sel-ano-tx')?.classList.toggle('periodo-sel--ativo', !!periodoTxAno);
    }
    aplicarFiltroTx();
  }
  q('sel-mes-tx')?.addEventListener('change', handlePeriodoCustomTx);
  q('sel-ano-tx')?.addEventListener('change', handlePeriodoCustomTx);

  q('filtro2-tipo')?.addEventListener('change', () => {
    atualizarCatsFiltro2(q('filtro2-tipo').value);
    aplicarFiltroTx();
  });
  q('filtro2-categoria')?.addEventListener('change', aplicarFiltroTx);
  q('filtro2-busca')?.addEventListener('input', aplicarFiltroTx);
  q('filtro2-cliente')?.addEventListener('change', aplicarFiltroTx);

  q('btn-limpar-filtro2')?.addEventListener('click', () => {
    periodoTxDias = 0;
    periodoTxMes  = '';
    periodoTxAno  = '';
    document.querySelectorAll('.periodo-btn-tx').forEach(b => b.classList.remove('periodo-btn--ativo'));
    document.querySelector('.periodo-btn-tx[data-dias="0"]')?.classList.add('periodo-btn--ativo');
    const selM = q('sel-mes-tx'), selA = q('sel-ano-tx');
    if (selM) { selM.value = ''; selM.classList.remove('periodo-sel--ativo'); }
    if (selA) { selA.value = ''; selA.classList.remove('periodo-sel--ativo'); }
    const tipoSel = q('filtro2-tipo');
    if (tipoSel) tipoSel.value = 'todos';
    const buscaInp = q('filtro2-busca');
    if (buscaInp) buscaInp.value = '';
    const clienteInp = q('filtro2-cliente');
    if (clienteInp) clienteInp.value = 'todos';
    atualizarCatsFiltro2('todos');
    aplicarFiltroTx();
  });

  // Inicializa o select de categoria e anos
  atualizarCatsFiltro2('todos');
  aplicarFiltroTx();

  /* ══════════════════════════════════════════
     ASSINATURAS
  ══════════════════════════════════════════ */
  const STORAGE_ASS = 'carteira_assinaturas';
  // Cores fixas para as categorias padrão (mantém o visual já conhecido).
  // Categorias novas/customizadas recebem uma cor automática (hash do id).
  const COR_CAT_ASS = {
    streaming:'#7C6FF7', musica:'#2EC4B6', software:'#5B9CF6',
    cloud:'#30D988', 'servico-digital':'#FFC542', funcionario:'#FF5C7A',
    internet:'#fb923c', seguro:'#f472b6', academia:'#34d399',
    educacao_assinatura:'#94a3b8', outros_assinatura:'#6b7280',
  };
  const PALETA_COR_ASS = ['#7C6FF7','#2EC4B6','#5B9CF6','#30D988','#FFC542','#FF5C7A','#fb923c','#f472b6','#34d399','#94a3b8','#a78bfa','#22d3ee'];

  function catAssInfo(id) {
    const cm = window._catsMgr?.getCatMap() || {};
    return cm[id] || cm['outros_assinatura'] || { emoji: '📦', nome: 'Outros' };
  }

  function corCatAss(id) {
    if (COR_CAT_ASS[id]) return COR_CAT_ASS[id];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PALETA_COR_ASS[hash % PALETA_COR_ASS.length];
  }

  function getAssinaturas() { try { return JSON.parse(localStorage.getItem(STORAGE_ASS))||[]; } catch{return[];} }
  function saveAssinaturas(a) { try { localStorage.setItem(STORAGE_ASS,JSON.stringify(a)); } catch{} }

  function renderAssinaturas() {
    const lista  = getAssinaturas();
    const grid   = q('ass-grid');
    const vazio  = q('ass-vazio');
    const badge  = q('nav-badge-assinaturas');
    if (!grid) return;
    grid.innerHTML = '';

    /* Resumo */
    const totalMensal = lista.reduce((a,s)=>a+calcValorMensalAssinatura(s),0);
    const el1 = q('ass-total-mensal'); if (el1) el1.textContent = moeda(totalMensal);
    const el2 = q('ass-total-anual');  if (el2) el2.textContent = moeda(totalMensal*12);
    const el3 = q('ass-total-qtd');    if (el3) el3.textContent = lista.length;

    /* Badge na nav */
    if (badge) { badge.textContent = lista.length||''; badge.style.display = lista.length ? '' : 'none'; }

    if (!lista.length) {
      if (vazio) vazio.style.display = 'flex';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    /* Ordena por categoria */
    const sorted = [...lista].sort((a,b)=>a.categoria.localeCompare(b.categoria)||a.nome.localeCompare(b.nome));

    sorted.forEach(s => {
      const info    = catAssInfo(s.categoria);
      const cor     = corCatAss(s.categoria);
      const isVar   = s.tipo === 'variavel';
      const valMes  = calcValorMensalAssinatura(s);
      const numEnt  = (s.entradas || []).length;
      const card = document.createElement('div');
      card.className = 'ass-card';
      card.innerHTML = `
        <div class="ass-card-accent" style="background:${cor}"></div>
        <div class="ass-card-body">
          <div class="ass-card-top">
            <div class="ass-card-icon" style="background:${cor}22;color:${cor}">${info.emoji}</div>
            <div class="ass-card-acoes">
              ${isVar ? `<button class="btn-editar ass-btn-var" title="Registros" style="font-size:.75rem;padding:3px 7px">📊</button>` : ''}
              <button class="btn-editar ass-btn-edit" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
              <button class="btn-excluir ass-btn-del" title="Remover">×</button>
            </div>
          </div>
          <h4 class="ass-card-nome">${esc(s.nome)}</h4>
          <span class="ass-card-cat">${info.nome}${isVar ? ' · <em>variável</em>' : ''}</span>
          <div class="ass-card-valores">
            <div><p class="ass-val-label">Média/mês</p><p class="ass-val-num">${moeda(valMes)}</p></div>
            <div><p class="ass-val-label">Por ano</p><p class="ass-val-num">${moeda(valMes*12)}</p></div>
            ${!isVar && s.vencimento ? `<div><p class="ass-val-label">Vence dia</p><p class="ass-val-num">${s.vencimento}</p></div>` : ''}
            ${isVar ? `<div><p class="ass-val-label">Registros</p><p class="ass-val-num">${numEnt}</p></div>` : ''}
          </div>
          ${(!isVar && (s.parcela || s.cobrancaAutomatica)) ? `<div class="ass-card-selos">
            ${s.parcela ? `<span class="ass-selo">📆 Última parcela: ${fmtData(s.dataUltimaParcela)}</span>` : ''}
            ${s.cobrancaAutomatica ? `<span class="ass-selo ass-selo--auto">⚡ Cobrança automática</span>` : ''}
          </div>` : ''}
          ${s.notas ? `<p class="ass-card-notas">${esc(s.notas)}</p>` : ''}
        </div>`;
      card.querySelector('.ass-btn-edit').addEventListener('click', () => abrirModalAssinatura(s.id));
      card.querySelector('.ass-btn-del') .addEventListener('click', () => removerAssinatura(s.id));
      card.querySelector('.ass-btn-var')?.addEventListener('click', () => abrirModalAssVar(s.id));
      grid.appendChild(card);
    });
  }

  /* ── Modal assinatura ── */
  const modalAss = q('modal-assinatura');

  function _assSetTipo(tipo) {
    const isVar = tipo === 'variavel';
    q('ass-tipo-fixo')?.classList.toggle('ativo', !isVar);
    q('ass-tipo-variavel')?.classList.toggle('ativo', isVar);
    const fixoWrap  = q('ass-campos-fixo');
    const parWrap   = q('ass-grupo-parcela');
    const cobWrap   = q('ass-grupo-cobranca');
    const varNota   = q('ass-tipo-variavel-nota');
    if (fixoWrap) fixoWrap.style.display = isVar ? 'none' : '';
    if (parWrap)  parWrap.style.display  = isVar ? 'none' : '';
    if (cobWrap)  cobWrap.style.display  = isVar ? 'none' : '';
    if (varNota)  varNota.style.display  = isVar ? '' : 'none';
  }
  function _assGetTipo() {
    return q('ass-tipo-variavel')?.classList.contains('ativo') ? 'variavel' : 'fixo';
  }
  q('ass-tipo-fixo')?.addEventListener('click', () => _assSetTipo('fixo'));
  q('ass-tipo-variavel')?.addEventListener('click', () => _assSetTipo('variavel'));

  function abrirModalAssinatura(id) {
    const titulo = q('ass-modal-titulo');
    const errEl  = q('ass-msg-erro');
    if (errEl) errEl.style.display = 'none';
    const emp = window._isModoEmpresa?.() || false;
    const tipoWrap = q('ass-tipo-wrap');
    if (tipoWrap) tipoWrap.style.display = emp ? '' : 'none';

    if (id) {
      const ass = getAssinaturas().find(a=>a.id===id);
      if (!ass) return;
      if (titulo)             titulo.textContent = 'Editar Assinatura';
      if (q('ass-edit-id'))   q('ass-edit-id').value   = ass.id;
      if (q('ass-nome'))      q('ass-nome').value       = ass.nome;
      _assSetTipo(ass.tipo || 'fixo');
      if (q('ass-valor'))     q('ass-valor').value      = ass.tipo === 'variavel' ? '' : (ass.valor || '');
      if (q('ass-vencimento'))q('ass-vencimento').value = ass.vencimento||'';
      window._catsMgr?.populateSelectByTipo('ass-categoria', 'despesa', ass.categoria);
      if (q('ass-parcela'))   q('ass-parcela').checked   = !!ass.parcela;
      if (q('ass-data-ultima-parcela')) q('ass-data-ultima-parcela').value = ass.dataUltimaParcela||'';
      if (q('ass-cobranca-automatica')) q('ass-cobranca-automatica').checked = !!ass.cobrancaAutomatica;
      atualizarVisibilidadeParcela();
      if (q('ass-notas'))     q('ass-notas').value      = ass.notas||'';
    } else {
      if (titulo) titulo.textContent = 'Nova Assinatura';
      if (q('ass-edit-id'))   q('ass-edit-id').value   = '';
      if (q('ass-nome'))      q('ass-nome').value       = '';
      _assSetTipo('fixo');
      if (q('ass-valor'))     q('ass-valor').value      = '';
      if (q('ass-vencimento'))q('ass-vencimento').value = '';
      const primeiraAss = window._catsMgr?.getCatsByTipo('despesa')[0]?.id;
      window._catsMgr?.populateSelectByTipo('ass-categoria', 'despesa', primeiraAss);
      if (q('ass-parcela'))   q('ass-parcela').checked   = false;
      if (q('ass-data-ultima-parcela')) q('ass-data-ultima-parcela').value = '';
      if (q('ass-cobranca-automatica')) q('ass-cobranca-automatica').checked = false;
      atualizarVisibilidadeParcela();
      if (q('ass-notas'))     q('ass-notas').value      = '';
    }
    abrirModal(modalAss);
    q('ass-nome')?.focus();
  }

  function atualizarVisibilidadeParcela() {
    const wrap = q('ass-parcela-data-wrap');
    if (wrap) wrap.style.display = q('ass-parcela')?.checked ? '' : 'none';
  }
  q('ass-parcela')?.addEventListener('change', atualizarVisibilidadeParcela);

  function salvarAssinatura() {
    const id    = q('ass-edit-id')?.value    || '';
    const nome  = q('ass-nome')?.value.trim()|| '';
    const tipo  = _assGetTipo();
    const isVar = tipo === 'variavel';
    const vStr  = q('ass-valor')?.value      || '';
    const venc  = q('ass-vencimento')?.value || '';
    const cat   = q('ass-categoria')?.value  || 'outros';
    const nota  = q('ass-notas')?.value.trim()|| '';
    const parcela = !isVar && !!q('ass-parcela')?.checked;
    const dataUltimaParcela = parcela ? (q('ass-data-ultima-parcela')?.value || '') : '';
    const cobrancaAutomatica = !isVar && !!q('ass-cobranca-automatica')?.checked;
    const errEl = q('ass-msg-erro');

    function errAss(msg) { if(errEl){errEl.textContent=msg;errEl.style.display='flex';} }

    if (!nome) return errAss('Informe o nome do serviço.');
    let v = 0;
    if (!isVar) {
      v = parseFloat(vStr);
      if (!vStr||isNaN(v)||v<=0) return errAss('Informe um valor mensal válido.');
    }

    let lista = getAssinaturas();
    if (id) {
      const idx = lista.findIndex(a=>a.id===id);
      if (idx !== -1) {
        const entradas = isVar ? (lista[idx].entradas || []) : [];
        lista[idx] = {...lista[idx], nome, tipo, valor:v, vencimento:venc?+venc:'', categoria:cat, notas:nota, parcela, dataUltimaParcela, cobrancaAutomatica, entradas};
      }
    } else {
      lista.push({ id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,5)), nome, tipo, valor:v, vencimento:venc?+venc:'', categoria:cat, notas:nota, parcela, dataUltimaParcela, cobrancaAutomatica, entradas: [] });
    }
    saveAssinaturas(lista);
    fecharModal(modalAss);
    renderAssinaturas();
    mostrarToast(id ? '✏️ Assinatura atualizada!' : '✅ Assinatura adicionada!');
  }

  function removerAssinatura(id) {
    const lista = getAssinaturas().filter(a=>a.id!==id);
    saveAssinaturas(lista);
    renderAssinaturas();
    mostrarToast('🗑️ Assinatura removida.');
  }

  /* ── Modal assinatura variável ── */
  const modalAssVar = q('modal-ass-var');

  function abrirModalAssVar(assId) {
    const ass = getAssinaturas().find(a=>a.id===assId);
    if (!ass) return;
    q('ass-var-id').value = assId;
    const tituloEl = q('ass-var-titulo');
    if (tituloEl) tituloEl.textContent = `Registros: ${ass.nome}`;
    _assVarResetForm();
    renderAssVarEntradas(ass);
    abrirModal(modalAssVar);
  }

  function renderAssVarEntradas(ass) {
    const entradas = (ass.entradas || []).slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const lista = q('ass-var-lista');
    if (lista) {
      lista.innerHTML = '';
      if (!entradas.length) {
        lista.innerHTML = '<p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:12px 0">Nenhum registro ainda.</p>';
      } else {
        entradas.forEach(e => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-subtle)';
          row.innerHTML = `
            <span style="color:var(--text-secondary);font-size:.82rem">${fmtData(e.data)}</span>
            <span style="font-weight:600;color:var(--color-danger)">${moeda(e.valor)}</span>
            <button style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:1.1rem;padding:0 4px" data-eid="${esc(e.id)}" title="Remover">×</button>`;
          row.querySelector('button').addEventListener('click', () => removerAssVarEntrada(ass.id, e.id));
          lista.appendChild(row);
        });
      }
    }
    // Atualizar resumo — média de médias mensais (soma/qtd por mês, depois média entre meses)
    const byMonth = {};
    entradas.forEach(e => {
      const ym = (e.data || '').slice(0, 7); if (!ym) return;
      if (!byMonth[ym]) byMonth[ym] = { soma: 0, qtd: 0 };
      byMonth[ym].soma += (e.valor || 0);
      byMonth[ym].qtd  += 1;
    });
    const mediaMeses = Object.values(byMonth).map(m => m.soma / m.qtd);
    const media = mediaMeses.length ? mediaMeses.reduce((a, v) => a + v, 0) / mediaMeses.length : 0;
    const mediaEl = q('ass-var-media'); if (mediaEl) mediaEl.textContent = moeda(media);
    const numEl = q('ass-var-num-meses'); if (numEl) numEl.textContent = mediaMeses.length;
  }

  function salvarAssVarEntrada() {
    const assId = q('ass-var-id')?.value || '';
    const vStr  = q('ass-var-valor')?.value || '';
    const data  = q('ass-var-data')?.value || '';
    const errEl = q('ass-var-erro');
    function errVar(msg) { if(errEl){errEl.textContent=msg;errEl.style.display='flex';} }
    const v = parseFloat(vStr);
    if (!vStr||isNaN(v)||v<=0) return errVar('Informe um valor válido.');
    if (!data) return errVar('Informe a data.');
    if (errEl) errEl.style.display = 'none';

    const lista = getAssinaturas();
    const idx = lista.findIndex(a=>a.id===assId);
    if (idx === -1) return;
    const ass = lista[idx];
    const txId = _gerarId();
    const entradas = ass.entradas || [];
    entradas.push({ id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36), valor: v, data, txId });
    lista[idx] = {...ass, entradas};
    saveAssinaturas(lista);
    // Lança transação de despesa vinculada
    const txs = getTransacoes();
    txs.push({ id: txId, tipo: 'despesa', descricao: ass.nome, valor: v, data, categoria: ass.categoria || 'outros' });
    localStorage.setItem('carteira_transacoes', JSON.stringify(txs));
    window._recarregarTransacoes?.();
    _assVarResetForm();
    renderAssVarEntradas(lista[idx]);
    renderAssinaturas();
    mostrarToast('✅ Registro adicionado!');
  }

  function removerAssVarEntrada(assId, entradaId) {
    const lista = getAssinaturas();
    const idx = lista.findIndex(a=>a.id===assId);
    if (idx === -1) return;
    const entrada = (lista[idx].entradas || []).find(e=>e.id===entradaId);
    lista[idx] = {...lista[idx], entradas: (lista[idx].entradas || []).filter(e=>e.id!==entradaId)};
    saveAssinaturas(lista);
    // Remove transação vinculada, se existir
    if (entrada?.txId) {
      const txs = getTransacoes().filter(t=>t.id!==entrada.txId);
      localStorage.setItem('carteira_transacoes', JSON.stringify(txs));
      window._recarregarTransacoes?.();
    }
    renderAssVarEntradas(lista[idx]);
    renderAssinaturas();
    mostrarToast('🗑️ Registro removido.');
  }

  function _assVarResetForm() {
    if (q('ass-var-valor')) q('ass-var-valor').value = '';
    if (q('ass-var-data'))  q('ass-var-data').value  = new Date().toISOString().slice(0, 10);
    const errEl = q('ass-var-erro'); if (errEl) errEl.style.display = 'none';
  }

  q('ass-var-fechar')?.addEventListener('click', () => fecharModal(modalAssVar));
  q('ass-var-cancelar')?.addEventListener('click', () => fecharModal(modalAssVar));
  q('ass-var-salvar')?.addEventListener('click', salvarAssVarEntrada);

  /* ── Cobrança automática ──────────────────── */

  function diasAteVencimentoAss(diaVenc) {
    const agora = new Date();
    const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const cand  = new Date(agora.getFullYear(), agora.getMonth(), diaVenc);
    if (diaVenc < agora.getDate()) cand.setMonth(cand.getMonth() + 1);
    return Math.round((cand - hoje) / 86400000);
  }

  // Tenta achar uma categoria de despesa com o mesmo nome da categoria de
  // assinatura (ex.: "Educação"); se não achar, usa "Outros" (despesa).
  function categoriaDespesaParaAssinatura(assCategoriaId) {
    const cm = window._catsMgr?.getCatMap() || {};
    const assCat = cm[assCategoriaId];
    if (!assCat) return 'outros';
    const despesas = window._catsMgr?.getCatsByTipo('despesa') || [];
    const match = despesas.find(d => d.nome === assCat.nome);
    return match ? match.id : 'outros';
  }

  function verificarCobrancasAutomaticas() {
    const lista  = getAssinaturas();
    const hoje   = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    let mudou = false;

    lista.forEach(ass => {
      if (!ass.cobrancaAutomatica || !ass.vencimento) return;
      if (ass.ultimaCobrancaAutomatica === hojeStr) return; // já lançada hoje
      if (ass.parcela && ass.dataUltimaParcela && hojeStr > ass.dataUltimaParcela) return; // parcelamento já terminou

      const diff = diasAteVencimentoAss(Number(ass.vencimento));
      if (diff === 0) {
        const categoria = categoriaDespesaParaAssinatura(ass.categoria);
        window._adicionarTransacaoAutomatica?.('despesa', ass.nome, ass.valor, hojeStr, categoria);
        ass.ultimaCobrancaAutomatica = hojeStr;
        mudou = true;
        mostrarToast(`⚡ ${ass.nome}: cobrança lançada automaticamente!`);
      }
    });

    if (mudou) saveAssinaturas(lista);
  }

  window._renderAssinaturas = renderAssinaturas;
  window._verificarCobrancasAutomaticas = verificarCobrancasAutomaticas;

  q('btn-nova-assinatura')?.addEventListener('click', () => abrirModalAssinatura(null));
  q('ass-modal-salvar')   ?.addEventListener('click', salvarAssinatura);
  q('ass-modal-cancelar') ?.addEventListener('click', () => fecharModal(modalAss));
  q('ass-modal-fechar')   ?.addEventListener('click', () => fecharModal(modalAss));
  modalAss?.addEventListener('click', e => { if(e.target===modalAss) fecharModal(modalAss); });

  /* ══════════════════════════════════════════
     RENDA (fontes de renda)
  ══════════════════════════════════════════ */
  const STORAGE_RENDA = 'carteira_rendas';
  const COR_CAT_RENDA = { salario:'#30D988', freelance:'#5B9CF6', investimento:'#7C6FF7', outros_receita:'#94a3b8' };
  const PALETA_COR_RENDA = ['#30D988','#5B9CF6','#7C6FF7','#2EC4B6','#FFC542','#34d399','#a78bfa','#22d3ee','#fb923c','#f472b6'];

  // diasMes = turnos de trabalho por mês em ciclo de 30 dias
  const ESCALA_CONFIG = {
    '5x2':          { label: '5×2',    diasMes: 30 * 5/7,    horasTurnoDefault: 8  },
    '6x1':          { label: '6×1',    diasMes: 30 * 6/7,    horasTurnoDefault: 8  },
    '12x36':        { label: '12×36',  diasMes: 720 / 48,    horasTurnoDefault: 12 },
    '24x48':        { label: '24×48',  diasMes: 720 / 72,    horasTurnoDefault: 24 },
    'personalizada':{ label: 'Custom', diasMes: null,         horasTurnoDefault: 8  },
  };

  function calcHorasMesTrabalhador(renda) {
    const cfg      = ESCALA_CONFIG[renda.escala] || ESCALA_CONFIG['5x2'];
    const diasMes  = renda.escala === 'personalizada' ? (renda.diasMesPersonalizado || 0) : cfg.diasMes;
    const horasTurno = renda.horasTurno || cfg.horasTurnoDefault;
    return diasMes * horasTurno;
  }

  function calcRendaHora(renda) {
    if (renda.perfil === 'vendedor') {
      const sess = renda.sessoes || [];
      const totalGanho = sess.reduce((a, s) => a + (s.ganho || 0), 0);
      const totalHoras = sess.reduce((a, s) => a + (s.horas || 0), 0);
      return totalHoras > 0 ? totalGanho / totalHoras : 0;
    }
    const hMes = calcHorasMesTrabalhador(renda);
    return hMes > 0 ? (renda.valor || 0) / hMes : 0;
  }

  function fmtHora(v) {
    if (!v) return '—';
    return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/h';
  }

  function catRendaInfo(id) {
    const cm = window._catsMgr?.getCatMap() || {};
    return cm[id] || cm['outros_receita'] || { emoji: '💰', nome: 'Outros' };
  }

  function corCatRenda(id) {
    if (COR_CAT_RENDA[id]) return COR_CAT_RENDA[id];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PALETA_COR_RENDA[hash % PALETA_COR_RENDA.length];
  }

  function getRendas() { try { return JSON.parse(localStorage.getItem(STORAGE_RENDA))||[]; } catch{return[];} }
  function saveRendas(a) { try { localStorage.setItem(STORAGE_RENDA,JSON.stringify(a)); } catch{} }

  function renderRenda() {
    const lista  = getRendas();
    const grid   = q('renda-grid');
    const vazio  = q('renda-vazio');
    const badge  = q('nav-badge-renda');
    if (!grid) return;
    grid.innerHTML = '';

    const totalMensal = lista.reduce((a,s)=>a+s.valor,0);
    const el1 = q('renda-total-mensal'); if (el1) el1.textContent = moeda(totalMensal);
    const el2 = q('renda-total-anual');  if (el2) el2.textContent = moeda(totalMensal*12);
    const el3 = q('renda-total-qtd');    if (el3) el3.textContent = lista.length;
    const emp = window._isModoEmpresa?.() || false;
    const labelH = q('renda-media-hora-label');
    const elH    = q('renda-media-hora');
    if (emp) {
      if (labelH) labelH.textContent = 'Fat. médio/mês';
      // Fat. médio/mês geral: pool de todas as sessões de todos os vendedores
      const hojeSum = new Date();
      const todasSessoes = lista.filter(r => r.perfil === 'vendedor').flatMap(r => r.sessoes || []);
      let totalMesSum = 0, numMSum = 0;
      for (let i = 0; i < 3; i++) {
        const d  = new Date(hojeSum.getFullYear(), hojeSum.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const sessMes = todasSessoes.filter(s => (s.data||'').slice(0,7) === ym);
        if (!sessMes.length) continue;
        totalMesSum += sessMes.reduce((a,s)=>a+(s.ganho||0),0);
        numMSum++;
      }
      const somaFatMes = numMSum > 0 ? totalMesSum / numMSum : 0;
      if (elH) elH.textContent = somaFatMes > 0 ? moeda(somaFatMes) : '—';
    } else {
      if (labelH) labelH.textContent = 'Média por hora';
      const horasTotal = lista.reduce((a, r) => {
        if (r.perfil === 'vendedor') return a + (r.sessoes || []).reduce((b, s) => b + (s.horas || 0), 0);
        return a + calcHorasMesTrabalhador(r);
      }, 0);
      if (elH) elH.textContent = horasTotal > 0 ? fmtHora(totalMensal / horasTotal) : '—';
    }

    if (badge) { badge.textContent = lista.length||''; badge.style.display = lista.length ? '' : 'none'; }

    if (!lista.length) {
      if (vazio) vazio.style.display = 'flex';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    const sorted = [...lista].sort((a,b)=>a.categoria.localeCompare(b.categoria)||a.nome.localeCompare(b.nome));

    sorted.forEach(s => {
      const esVendedor = s.perfil === 'vendedor';
      // In empresa mode, only show vendedor cards
      if (emp && !esVendedor) return;
      const info = catRendaInfo(s.categoria);
      const cor  = corCatRenda(s.categoria);
      const card = document.createElement('div');
      card.className = 'ass-card';
      const rendaHora  = calcRendaHora(s);
      const numSess        = (s.sessoes||[]).length;
      const totalSessHoras = (s.sessoes||[]).reduce((a,x)=>a+(x.horas||0),0);
      const totalSessGanho = (s.sessoes||[]).reduce((a,x)=>a+(x.ganho||0),0);
      // Fat. médio/dia: média das sessões de cada dia nos últimos 30 dias, somadas e divididas por 30
      const hojeCard = new Date();
      let somaMedDiasCard = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(hojeCard.getFullYear(), hojeCard.getMonth(), hojeCard.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const sessDay = (s.sessoes||[]).filter(x => (x.data||'').slice(0,10) === iso);
        if (sessDay.length) somaMedDiasCard += sessDay.reduce((a,x)=>a+(x.ganho||0),0) / sessDay.length;
      }
      const fatDia = somaMedDiasCard / 30;

      // Fat. médio/mês: soma dos meses com dado / qtd meses com dado
      let totalMesCard = 0, numMesesCard = 0;
      for (let i = 0; i < 3; i++) {
        const d  = new Date(hojeCard.getFullYear(), hojeCard.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const sessMes = (s.sessoes||[]).filter(x => (x.data||'').slice(0,7) === ym);
        if (!sessMes.length) continue;
        totalMesCard += sessMes.reduce((a,x)=>a+(x.ganho||0),0);
        numMesesCard++;
      }
      const fatMes = numMesesCard > 0 ? totalMesCard / numMesesCard : 0;
      const fatAno = fatMes * 12;
      const cfg = ESCALA_CONFIG[s.escala] || ESCALA_CONFIG['5x2'];
      const escalaLabel = s.escala && !esVendedor && !emp
        ? `${cfg.label} · ${s.horasTurno||cfg.horasTurnoDefault}h/turno`
        : '';
      card.innerHTML = `
        <div class="ass-card-accent" style="background:${cor}"></div>
        <div class="ass-card-body">
          <div class="ass-card-top">
            <div class="ass-card-icon" style="background:${cor}22;color:${cor}">${info.emoji}</div>
            <div class="ass-card-acoes">
              ${esVendedor || emp ? `<button class="btn-secundario renda-btn-sessoes" title="Registrar dia" style="font-size:12px;padding:4px 10px">📅 Registrar${emp ? ' venda' : ' dia'}</button>` : ''}
              <button class="btn-editar renda-btn-edit" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
              <button class="btn-excluir renda-btn-del" title="Remover">×</button>
            </div>
          </div>
          <h4 class="ass-card-nome">${esc(s.nome)}</h4>
          <span class="ass-card-cat">${info.nome}${escalaLabel ? ` · <span class="renda-escala-badge">${escalaLabel}</span>` : ''}</span>
          <div class="ass-card-valores">
            ${!emp && s.valor ? `<div><p class="ass-val-label">Por mês</p><p class="ass-val-num">${moeda(s.valor)}</p></div>` : ''}
            ${!emp && s.valor ? `<div><p class="ass-val-label">Por ano</p><p class="ass-val-num">${moeda(s.valor*12)}</p></div>` : ''}
            ${!emp && esVendedor && totalSessHoras > 0 ? `<div><p class="ass-val-label">Horas totais</p><p class="ass-val-num">${totalSessHoras.toLocaleString('pt-BR', {maximumFractionDigits:1})}h</p></div>` : ''}
            ${!emp && esVendedor && totalSessGanho > 0 ? `<div><p class="ass-val-label">Ganho total</p><p class="ass-val-num">${moeda(totalSessGanho)}</p></div>` : ''}
            ${!emp && rendaHora > 0 ? `<div class="renda-hora-destaque"><p class="ass-val-label">Ganho por hora</p><p class="ass-val-num renda-hora-val">${fmtHora(rendaHora)}</p></div>` : ''}
            ${emp && numSess > 0 ? `<div><p class="ass-val-label">Vendas registradas</p><p class="ass-val-num">${numSess}</p></div>` : ''}
            ${emp && fatDia > 0 ? `<div><p class="ass-val-label">Fat. médio/dia</p><p class="ass-val-num">${moeda(fatDia)}</p></div>` : ''}
            ${emp && fatMes > 0 ? `<div class="renda-hora-destaque"><p class="ass-val-label">Fat. médio/mês</p><p class="ass-val-num renda-hora-val">${moeda(fatMes)}</p></div>` : ''}
            ${emp && fatAno > 0 ? `<div><p class="ass-val-label">Fat. médio/ano</p><p class="ass-val-num">${moeda(fatAno)}</p></div>` : ''}
            ${!emp && s.diaRecebimento ? `<div><p class="ass-val-label">Recebe dia</p><p class="ass-val-num">${s.diaRecebimento}</p></div>` : ''}
          </div>
          ${s.recebimentoAutomatico && !emp ? `<div class="ass-card-selos"><span class="ass-selo ass-selo--auto">⚡ Recebimento automático</span></div>` : ''}
          ${s.notas ? `<p class="ass-card-notas">${esc(s.notas)}</p>` : ''}
        </div>`;
      card.querySelector('.renda-btn-edit').addEventListener('click', () => abrirModalRenda(s.id));
      card.querySelector('.renda-btn-del') .addEventListener('click', () => removerRenda(s.id));
      card.querySelector('.renda-btn-sessoes')?.addEventListener('click', () => abrirSessoesVendedor(s.id));
      grid.appendChild(card);
    });
  }

  const modalRenda = q('modal-renda');

  function selRendaPerfil(perfil) {
    const isTrab = perfil !== 'vendedor';
    q('renda-campos-trabalhador').style.display  = isTrab ? '' : 'none';
    q('renda-campos-vendedor').style.display     = isTrab ? 'none' : '';
    q('renda-perfil-trabalhador').classList.toggle('ativo', isTrab);
    q('renda-perfil-vendedor').classList.toggle('ativo', !isTrab);
    // Campos que não fazem sentido para vendedor
    if (q('renda-campo-valor-dia'))   q('renda-campo-valor-dia').style.display   = isTrab ? '' : 'none';
    if (q('renda-campo-recebimento')) q('renda-campo-recebimento').style.display = isTrab ? '' : 'none';
    atualizarPreviewHora();
  }

  function atualizarPreviewHora() {
    const escala = q('renda-escala')?.value || '5x2';
    const cfg    = ESCALA_CONFIG[escala] || ESCALA_CONFIG['5x2'];
    const horas  = parseFloat(q('renda-horas-turno')?.value || cfg.horasTurnoDefault);
    const dias   = escala === 'personalizada'
      ? parseFloat(q('renda-dias-mes')?.value || 0)
      : cfg.diasMes;
    const valor  = parseFloat(q('renda-valor')?.value || 0);
    const el     = q('renda-preview-hora');
    if (!el) return;
    if (q('renda-perfil-vendedor')?.classList.contains('ativo')) { el.textContent = ''; return; }
    const hMes   = dias * horas;
    el.textContent = hMes > 0 && valor > 0
      ? `≈ ${fmtHora(valor / hMes)} com base nos dados acima`
      : '';
  }

  function abrirModalRenda(id) {
    const titulo = q('renda-modal-titulo');
    const errEl  = q('renda-msg-erro');
    if (errEl) errEl.style.display = 'none';

    if (id) {
      const r = getRendas().find(a=>a.id===id);
      if (!r) return;
      if (titulo)              titulo.textContent = 'Editar Fonte de Renda';
      if (q('renda-edit-id'))  q('renda-edit-id').value = r.id;
      if (q('renda-nome'))     q('renda-nome').value     = r.nome;
      if (q('renda-valor'))    q('renda-valor').value    = r.valor||'';
      if (q('renda-dia'))      q('renda-dia').value      = r.diaRecebimento||'';
      window._catsMgr?.populateSelectByTipo('renda-categoria', 'receita', r.categoria);
      if (q('renda-recebimento-automatico')) q('renda-recebimento-automatico').checked = !!r.recebimentoAutomatico;
      if (q('renda-notas'))    q('renda-notas').value    = r.notas||'';
      const perfil = r.perfil || 'trabalhador';
      selRendaPerfil(perfil);
      if (perfil === 'trabalhador') {
        const escala = r.escala || '5x2';
        if (q('renda-escala'))      q('renda-escala').value      = escala;
        const cfg = ESCALA_CONFIG[escala] || ESCALA_CONFIG['5x2'];
        if (q('renda-horas-turno')) q('renda-horas-turno').value = r.horasTurno || cfg.horasTurnoDefault;
        if (escala === 'personalizada') {
          q('renda-escala-pers').style.display = '';
          if (q('renda-dias-mes')) q('renda-dias-mes').value = r.diasMesPersonalizado||'';
        } else {
          q('renda-escala-pers').style.display = 'none';
        }
        atualizarPreviewHora();
      }
    } else {
      if (titulo) titulo.textContent = 'Nova Fonte de Renda';
      if (q('renda-edit-id'))  q('renda-edit-id').value = '';
      if (q('renda-nome'))     q('renda-nome').value     = '';
      if (q('renda-valor'))    q('renda-valor').value    = '';
      if (q('renda-dia'))      q('renda-dia').value      = '';
      const primeiraRenda = window._catsMgr?.getCatsByTipo('receita')[0]?.id;
      window._catsMgr?.populateSelectByTipo('renda-categoria', 'receita', primeiraRenda);
      if (q('renda-recebimento-automatico')) q('renda-recebimento-automatico').checked = false;
      if (q('renda-notas'))    q('renda-notas').value    = '';
      selRendaPerfil('trabalhador');
      if (q('renda-escala'))      q('renda-escala').value      = '5x2';
      if (q('renda-horas-turno')) q('renda-horas-turno').value = 8;
      q('renda-escala-pers').style.display = 'none';
      atualizarPreviewHora();
    }
    // Empresa mode: force vendedor profile, hide profile toggle
    const emp = window._isModoEmpresa?.() || false;
    const perfilField = q('renda-campo-perfil');
    if (emp) {
      if (perfilField) perfilField.style.display = 'none';
      selRendaPerfil('vendedor');
    } else {
      if (perfilField) perfilField.style.display = '';
    }
    abrirModal(modalRenda);
    q('renda-nome')?.focus();
  }

  function salvarRenda() {
    const id    = q('renda-edit-id')?.value    || '';
    const nome  = q('renda-nome')?.value.trim()|| '';
    const vStr  = q('renda-valor')?.value      || '';
    const dia   = q('renda-dia')?.value        || '';
    const cat   = q('renda-categoria')?.value  || 'outros_receita';
    const nota  = q('renda-notas')?.value.trim()|| '';
    const recebimentoAutomatico = !!q('renda-recebimento-automatico')?.checked;
    const errEl = q('renda-msg-erro');
    const perfil = q('renda-perfil-vendedor')?.classList.contains('ativo') ? 'vendedor' : 'trabalhador';

    function errRenda(msg) { if(errEl){errEl.textContent=msg;errEl.style.display='flex';} }

    if (!nome) return errRenda('Informe o nome da fonte.');

    const v = vStr ? parseFloat(vStr) : 0;
    if (vStr && (isNaN(v) || v < 0)) return errRenda('Valor mensal inválido.');
    if (perfil === 'trabalhador' && (!vStr || v <= 0)) return errRenda('Informe um valor mensal válido.');

    const escala = perfil === 'trabalhador' ? (q('renda-escala')?.value || '5x2') : '';
    const cfg    = ESCALA_CONFIG[escala] || ESCALA_CONFIG['5x2'];
    const horasTurno = perfil === 'trabalhador'
      ? (parseFloat(q('renda-horas-turno')?.value) || cfg.horasTurnoDefault) : 0;
    const diasMesPersonalizado = (perfil === 'trabalhador' && escala === 'personalizada')
      ? (parseFloat(q('renda-dias-mes')?.value) || 0) : 0;

    let lista = getRendas();
    const base = { nome, valor: v||0, diaRecebimento: dia?+dia:'', categoria: cat, notas: nota,
                   recebimentoAutomatico, perfil, escala, horasTurno, diasMesPersonalizado };
    if (id) {
      const idx = lista.findIndex(a=>a.id===id);
      if (idx !== -1) lista[idx] = {...lista[idx], ...base};
    } else {
      lista.push({ id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,5)),
                   ...base, sessoes: [] });
    }
    saveRendas(lista);
    fecharModal(modalRenda);
    renderRenda();
    mostrarToast(id ? '✏️ Fonte de renda atualizada!' : '✅ Fonte de renda adicionada!');
  }

  function removerRenda(id) {
    const lista = getRendas().filter(a=>a.id!==id);
    saveRendas(lista);
    renderRenda();
    mostrarToast('🗑️ Fonte de renda removida.');
  }

  /* ── Sessões do vendedor ─────────────────── */

  let _vsessRendaId  = null;
  let _vsessEditId   = null; // sessão sendo editada (null = modo adicionar)
  const modalVsess   = q('modal-vendedor-sessoes');

  function _gerarId() {
    return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  }

  function _vsessResetForm() {
    const hoje = new Date().toISOString().split('T')[0];
    if (q('vsess-data'))  q('vsess-data').value  = hoje;
    if (q('vsess-ganho')) q('vsess-ganho').value = '';
    if (q('vsess-horas')) q('vsess-horas').value = '';
    if (q('vsess-nome'))  q('vsess-nome').value  = '';
    if (q('vsess-erro'))  q('vsess-erro').style.display = 'none';
    _vsessEditId = null;
    const btn = q('vsess-btn-add');
    if (btn) btn.textContent = 'Adicionar';
  }

  function abrirSessoesVendedor(rendaId) {
    _vsessRendaId = rendaId;
    const renda = getRendas().find(r=>r.id===rendaId);
    if (!renda) return;
    q('vsess-titulo').textContent = renda.nome;
    _vsessResetForm();
    renderSessoes(renda);
    abrirModal(modalVsess);
  }

  function renderSessoes(renda) {
    const sess = renda.sessoes || [];
    const lista = q('vsess-lista');
    const vazio = q('vsess-vazio');
    const emp = window._isModoEmpresa?.() || false;
    const totalGanho = sess.reduce((a,s)=>a+(s.ganho||0),0);
    const totalHoras = sess.reduce((a,s)=>a+(s.horas||0),0);
    const mediaHora  = totalHoras > 0 ? totalGanho/totalHoras : 0;
    const numSess    = sess.length;

    // Fat. médio/dia: para cada dia dos últimos 30, calcula média das sessões daquele dia,
    // soma todas as médias diárias e divide por 30
    const hoje30 = new Date();
    let somaMedDias = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje30.getFullYear(), hoje30.getMonth(), hoje30.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const sessDay = sess.filter(s => (s.data||'').slice(0,10) === iso);
      if (sessDay.length) {
        const somaDia = sessDay.reduce((a,s)=>a+(s.ganho||0),0);
        somaMedDias += somaDia / sessDay.length;
      }
    }
    const fatDia = somaMedDias / 30;

    // Fat. médio/mês: média das sessões de cada um dos 3 últimos meses (soma/qtd),
    // depois soma essas 3 médias e divide por 3
    const hojeM = new Date();
    let totalMesFat = 0, numMesesFat = 0;
    for (let i = 0; i < 3; i++) {
      const d  = new Date(hojeM.getFullYear(), hojeM.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const sessMes = sess.filter(s => (s.data||'').slice(0,7) === ym);
      if (!sessMes.length) continue;
      totalMesFat += sessMes.reduce((a,s)=>a+(s.ganho||0),0);
      numMesesFat++;
    }
    const fatMes = numMesesFat > 0 ? totalMesFat / numMesesFat : 0;
    q('vsess-total-ganho').textContent = moeda(totalGanho);
    // Toggle horas/media stats vs faturamento stats
    const elStatHoras = q('vsess-stat-horas');
    const elStatMedia = q('vsess-stat-media');
    const elStatFatDia = q('vsess-stat-fat-dia');
    const elStatFatMes = q('vsess-stat-fat-mes');
    if (emp) {
      if (elStatHoras)  elStatHoras.style.display  = 'none';
      if (elStatMedia)  elStatMedia.style.display  = 'none';
      if (elStatFatDia) elStatFatDia.style.display = '';
      if (elStatFatMes) elStatFatMes.style.display = '';
      if (q('vsess-fat-dia')) q('vsess-fat-dia').textContent = fatDia > 0 ? moeda(fatDia) : '—';
      if (q('vsess-fat-mes')) q('vsess-fat-mes').textContent = fatMes > 0 ? moeda(fatMes) : '—';
    } else {
      if (elStatHoras)  elStatHoras.style.display  = '';
      if (elStatMedia)  elStatMedia.style.display  = '';
      if (elStatFatDia) elStatFatDia.style.display = 'none';
      if (elStatFatMes) elStatFatMes.style.display = 'none';
      q('vsess-total-horas').textContent = totalHoras.toLocaleString('pt-BR',{maximumFractionDigits:1})+'h';
      q('vsess-media-hora').textContent  = mediaHora > 0 ? fmtHora(mediaHora) : '—';
    }
    // Toggle form fields
    const campoHoras    = q('vsess-campo-horas');
    const campoCliente  = q('vsess-campo-cliente');
    const campoNome     = q('vsess-campo-nome');
    if (campoHoras)   campoHoras.style.display   = emp ? 'none' : '';
    if (campoCliente) campoCliente.style.display = emp ? ''     : 'none';
    if (campoNome)    campoNome.style.display    = emp ? ''     : 'none';
    if (!lista) return;
    lista.innerHTML = '';
    if (!sess.length) { if(vazio) vazio.style.display=''; return; }
    if (vazio) vazio.style.display = 'none';
    const sorted = [...sess].sort((a,b)=> (b.data||'').localeCompare(a.data||''));
    sorted.forEach(s => {
      const row = document.createElement('div');
      row.className = 'vsess-row';
      const dataFmt = s.data ? new Date(s.data+'T12:00:00').toLocaleDateString('pt-BR') : '—';
      if (emp) {
        const clienteNome = s.cliente
          ? (window._catsMgr?.getCatMap?.()[s.cliente]?.nome || s.cliente)
          : '—';
        row.innerHTML = `
          <span class="vsess-row-data">${dataFmt}</span>
          <span class="vsess-row-ganho">${moeda(s.ganho||0)}</span>
          ${s.nome ? `<span class="vsess-row-nome">${esc(s.nome)}</span>` : ''}
          <span class="vsess-row-cliente">${esc(clienteNome)}</span>
          <div class="vsess-row-acoes">
            <button class="vsess-row-edit btn-editar" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
            <button class="vsess-row-del btn-excluir" title="Remover">×</button>
          </div>`;
      } else {
        row.innerHTML = `
          <span class="vsess-row-data">${dataFmt}</span>
          <span class="vsess-row-ganho">${moeda(s.ganho||0)}</span>
          <span class="vsess-row-horas">${(s.horas||0).toLocaleString('pt-BR',{maximumFractionDigits:1})}h</span>
          <span class="vsess-row-hora">${s.horas > 0 ? fmtHora((s.ganho||0)/s.horas) : '—'}</span>
          <div class="vsess-row-acoes">
            <button class="vsess-row-edit btn-editar" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
            <button class="vsess-row-del btn-excluir" title="Remover">×</button>
          </div>`;
      }
      row.querySelector('.vsess-row-edit').addEventListener('click', () => editarSessao(renda.id, s.id));
      row.querySelector('.vsess-row-del').addEventListener('click',  () => removerSessao(renda.id, s.id));
      lista.appendChild(row);
    });
  }

  function editarSessao(rendaId, sessaoId) {
    const renda = getRendas().find(r=>r.id===rendaId);
    if (!renda) return;
    const s = (renda.sessoes||[]).find(x=>x.id===sessaoId);
    if (!s) return;
    _vsessEditId = sessaoId;
    if (q('vsess-data'))    q('vsess-data').value    = s.data    || '';
    if (q('vsess-ganho'))   q('vsess-ganho').value   = s.ganho   || '';
    if (q('vsess-horas'))   q('vsess-horas').value   = s.horas   || '';
    if (q('vsess-nome'))    q('vsess-nome').value    = s.nome    || '';
    if (q('vsess-cliente')) q('vsess-cliente').value = s.cliente || '';
    if (q('vsess-erro'))    q('vsess-erro').style.display = 'none';
    const btn = q('vsess-btn-add');
    if (btn) btn.textContent = 'Salvar edição';
    q('vsess-data')?.focus();
  }

  function salvarSessao() {
    const errEl  = q('vsess-erro');
    const emp    = window._isModoEmpresa?.() || false;
    const data   = q('vsess-data')?.value  || '';
    const ganho  = parseFloat(q('vsess-ganho')?.value || '');
    const horas  = emp ? 0 : parseFloat(q('vsess-horas')?.value || '');
    const cliente = emp ? (q('vsess-cliente')?.value || '') : '';
    const nome    = emp ? (q('vsess-nome')?.value.trim() || '') : '';
    function errV(m) { if(errEl){errEl.textContent=m;errEl.style.display='flex';} }
    if (!data)                 return errV('Informe a data.');
    if (isNaN(ganho)||ganho<0) return errV('Informe o valor ganho.');
    if (!emp && (isNaN(horas)||horas<=0)) return errV('Informe as horas trabalhadas.');
    if (errEl) errEl.style.display = 'none';

    const lista = getRendas();
    const idx   = lista.findIndex(r=>r.id===_vsessRendaId);
    if (idx === -1) return;
    if (!lista[idx].sessoes) lista[idx].sessoes = [];
    const renda = lista[idx];

    if (_vsessEditId) {
      // Editar sessão existente
      const sIdx = renda.sessoes.findIndex(s=>s.id===_vsessEditId);
      if (sIdx !== -1) {
        const old = renda.sessoes[sIdx];
        renda.sessoes[sIdx] = {...old, data, ganho, horas, ...(emp ? {cliente, ...(nome ? {nome} : {})} : {})};
        // Atualiza transação vinculada se existir
        if (old.txId) {
          const txs = getTransacoes();
          const tIdx = txs.findIndex(t=>t.id===old.txId);
          if (tIdx !== -1) {
            const descricao = (emp && nome) ? nome : renda.nome;
            txs[tIdx] = {...txs[tIdx], descricao, valor: ganho, data, categoria: renda.categoria||'outros_receita', ...(emp && cliente ? {cliente} : {})};
            localStorage.setItem('carteira_transacoes', JSON.stringify(txs));
            window._recarregarTransacoes?.();
          }
        }
      }
      mostrarToast('✏️ Venda atualizada!');
    } else {
      // Nova sessão
      const txId = _gerarId();
      renda.sessoes.push({ id: _gerarId(), data, ganho, horas, txId, ...(emp ? {cliente, ...(nome ? {nome} : {})} : {}) });
      // Lança transação
      const txs = getTransacoes();
      const descricao = (emp && nome) ? nome : renda.nome;
      txs.push({ id: txId, tipo: 'receita', descricao, valor: ganho, data, categoria: renda.categoria||'outros_receita', ...(emp && cliente ? {cliente} : {}) });
      localStorage.setItem('carteira_transacoes', JSON.stringify(txs));
      window._recarregarTransacoes?.();
      mostrarToast(emp ? '✅ Venda registrada!' : '✅ Dia registrado!');
    }

    saveRendas(lista);
    _vsessResetForm();
    renderSessoes(lista[idx]);
    renderRenda();
  }

  function removerSessao(rendaId, sessaoId) {
    const lista = getRendas();
    const idx   = lista.findIndex(r=>r.id===rendaId);
    if (idx === -1) return;
    const sess = lista[idx].sessoes || [];
    const s    = sess.find(x=>x.id===sessaoId);
    // Remove transação vinculada
    if (s?.txId) {
      const txs = getTransacoes().filter(t=>t.id!==s.txId);
      localStorage.setItem('carteira_transacoes', JSON.stringify(txs));
      window._recarregarTransacoes?.();
    }
    lista[idx].sessoes = sess.filter(x=>x.id!==sessaoId);
    saveRendas(lista);
    if (_vsessEditId === sessaoId) _vsessResetForm();
    renderSessoes(lista[idx]);
    renderRenda();
    mostrarToast('🗑️ Dia removido.');
  }

  /* ── Recebimento automático ──────────────────── */

  function diasAteRecebimento(diaRec) {
    const agora = new Date();
    const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const cand  = new Date(agora.getFullYear(), agora.getMonth(), diaRec);
    if (diaRec < agora.getDate()) cand.setMonth(cand.getMonth() + 1);
    return Math.round((cand - hoje) / 86400000);
  }

  function verificarRecebimentosAutomaticos() {
    const lista  = getRendas();
    const hojeStr = new Date().toISOString().split('T')[0];
    let mudou = false;

    lista.forEach(r => {
      if (!r.recebimentoAutomatico || !r.diaRecebimento) return;
      if (r.ultimoRecebimentoAutomatico === hojeStr) return; // já lançado hoje

      const diff = diasAteRecebimento(Number(r.diaRecebimento));
      if (diff === 0) {
        window._adicionarTransacaoAutomatica?.('receita', r.nome, r.valor, hojeStr, r.categoria || 'outros_receita');
        r.ultimoRecebimentoAutomatico = hojeStr;
        mudou = true;
        mostrarToast(`⚡ ${r.nome}: receita lançada automaticamente!`);
      }
    });

    if (mudou) saveRendas(lista);
  }

  window._renderRenda = renderRenda;
  window._verificarRecebimentosAutomaticos = verificarRecebimentosAutomaticos;

  q('btn-nova-renda')      ?.addEventListener('click', () => abrirModalRenda(null));
  q('renda-modal-salvar')  ?.addEventListener('click', salvarRenda);
  q('renda-modal-cancelar')?.addEventListener('click', () => fecharModal(modalRenda));
  q('renda-modal-fechar')  ?.addEventListener('click', () => fecharModal(modalRenda));
  modalRenda?.addEventListener('click', e => { if(e.target===modalRenda) fecharModal(modalRenda); });

  q('renda-perfil-trabalhador')?.addEventListener('click', () => selRendaPerfil('trabalhador'));
  q('renda-perfil-vendedor')   ?.addEventListener('click', () => selRendaPerfil('vendedor'));

  q('renda-escala')?.addEventListener('change', () => {
    const escala = q('renda-escala').value;
    const cfg    = ESCALA_CONFIG[escala] || ESCALA_CONFIG['5x2'];
    q('renda-escala-pers').style.display = escala === 'personalizada' ? '' : 'none';
    if (q('renda-horas-turno') && !q('renda-horas-turno').value) {
      q('renda-horas-turno').value = cfg.horasTurnoDefault;
    } else if (q('renda-horas-turno')) {
      q('renda-horas-turno').value = cfg.horasTurnoDefault;
    }
    atualizarPreviewHora();
  });
  q('renda-horas-turno')?.addEventListener('input', atualizarPreviewHora);
  q('renda-dias-mes')   ?.addEventListener('input', atualizarPreviewHora);
  q('renda-valor')      ?.addEventListener('input', atualizarPreviewHora);

  q('vsess-btn-add')?.addEventListener('click', salvarSessao);
  q('vsess-fechar') ?.addEventListener('click', () => fecharModal(modalVsess));
  modalVsess?.addEventListener('click', e => { if(e.target===modalVsess) fecharModal(modalVsess); });

  /* ── Patch notes (exibe uma única vez) ── */
  const PATCH_KEY      = 'money360_patch_empresa_update';
  const modalPatch     = q('modal-patch-notes');
  if (modalPatch && !localStorage.getItem(PATCH_KEY)) {
    setTimeout(() => abrirModal(modalPatch), 600);
  }
  function fecharPatch() {
    localStorage.setItem(PATCH_KEY, '1');
    fecharModal(modalPatch);
  }
  q('patch-btn-fechar')?.addEventListener('click', fecharPatch);
  modalPatch?.addEventListener('click', e => { if (e.target === modalPatch) fecharPatch(); });

  /* ══════════════════════════════════════════
     RELATÓRIOS
  ══════════════════════════════════════════ */
  const CORES_REL = ['#7C6FF7','#2EC4B6','#FF5C7A','#FFC542','#5B9CF6','#30D988','#fb923c','#f472b6','#34d399','#94a3b8'];

  let periodoRel    = 28;  // dias; 0 = todo período
  let periodoRelMes = '';  // '01'..'12' ou ''
  let periodoRelAno = '';  // '2026' etc. ou ''

  function filtrarTransacoesPorPeriodo(dias) {
    const todas = getTransacoes();
    // Modo período personalizado (mês/ano) tem prioridade
    if (periodoRelMes || periodoRelAno) {
      return todas.filter(t => {
        if (periodoRelMes && periodoRelAno) return t.data.startsWith(periodoRelAno + '-' + periodoRelMes);
        if (periodoRelAno)  return t.data.startsWith(periodoRelAno);
        if (periodoRelMes)  return t.data.slice(5, 7) === periodoRelMes;
        return true;
      });
    }
    if (dias === 0) return todas;
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const limiteStr = limite.toISOString().split('T')[0];
    return todas.filter(t => t.data >= limiteStr);
  }

  function filtrarGastosPorPeriodo(gastos) {
    if (periodoRelMes || periodoRelAno) {
      return gastos.filter(g => {
        if (periodoRelMes && periodoRelAno) return g.data.startsWith(periodoRelAno + '-' + periodoRelMes);
        if (periodoRelAno) return g.data.startsWith(periodoRelAno);
        if (periodoRelMes) return g.data.slice(5, 7) === periodoRelMes;
        return true;
      });
    }
    if (periodoRel === 0) return gastos;
    const limite = new Date();
    limite.setDate(limite.getDate() - periodoRel);
    const limiteStr = limite.toISOString().split('T')[0];
    return gastos.filter(g => g.data >= limiteStr);
  }

  function resolverCat(cat) {
    if (typeof cat === 'string' && cat.startsWith('__ev_')) {
      const ev = (window._getEventos?.() || []).find(e => '__ev_' + e.id === cat);
      return ev ? { emoji: ev.emoji || '📦', nome: ev.nome } : { emoji: '📦', nome: 'Evento' };
    }
    const cm = catMapUI(); return cm[cat] || cm.outros || { emoji: '📦', nome: cat };
  }

  function popularAnosRel() {
    const sel = q('sel-ano-rel');
    if (!sel) return;
    const anoAtual = new Date().getFullYear();
    const todas    = getTransacoes();
    const anoMin   = todas.length
      ? Math.min(...todas.map(t => parseInt(t.data.slice(0, 4))))
      : anoAtual;
    const saved = sel.value;
    sel.innerHTML = '<option value="">Todos os anos</option>';
    for (let a = anoAtual; a >= anoMin; a--) {
      const opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      sel.appendChild(opt);
    }
    if (saved) sel.value = saved;
  }

  function handlePeriodoCustom() {
    periodoRelMes = q('sel-mes-rel')?.value || '';
    periodoRelAno = q('sel-ano-rel')?.value || '';
    if (periodoRelMes || periodoRelAno) {
      document.querySelectorAll('.periodo-btn-rel').forEach(b => b.classList.remove('periodo-btn--ativo'));
      q('sel-mes-rel')?.classList.toggle('periodo-sel--ativo', !!periodoRelMes);
      q('sel-ano-rel')?.classList.toggle('periodo-sel--ativo', !!periodoRelAno);
    }
    renderRelatorios();
  }
  q('sel-mes-rel')?.addEventListener('change', handlePeriodoCustom);
  q('sel-ano-rel')?.addEventListener('change', handlePeriodoCustom);

  // Liga botões de período dos relatórios
  document.querySelectorAll('.periodo-btn-rel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.periodo-btn-rel').forEach(b => b.classList.remove('periodo-btn--ativo'));
      btn.classList.add('periodo-btn--ativo');
      periodoRel    = +btn.dataset.dias;
      periodoRelMes = '';
      periodoRelAno = '';
      const selM = q('sel-mes-rel'), selA = q('sel-ano-rel');
      if (selM) { selM.value = ''; selM.classList.remove('periodo-sel--ativo'); }
      if (selA) { selA.value = ''; selA.classList.remove('periodo-sel--ativo'); }
      renderRelatorios();
    });
  });

  const NOMES_MESES_PROJ = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Parcelas terminam na data da última parcela: a assinatura deixa de
  // entrar na despesa de meses posteriores a esse mês/ano.
  function assinaturaAtivaEm(ass, ano, mesIdx) {
    if (!ass.parcela || !ass.dataUltimaParcela) return true;
    const d = new Date(ass.dataUltimaParcela + 'T00:00:00');
    return (ano * 12 + mesIdx) <= (d.getFullYear() * 12 + d.getMonth());
  }

  function calcValorMensalAssinatura(a) {
    if (a.tipo !== 'variavel') return a.valor || 0;
    const entradas = a.entradas || [];
    if (!entradas.length) return 0;
    const hojeC = new Date();
    let totalMesAss = 0, numMesesAss = 0;
    for (let i = 0; i < 3; i++) {
      const d  = new Date(hojeC.getFullYear(), hojeC.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const entsDoMes = entradas.filter(e => (e.data||'').slice(0,7) === ym);
      if (!entsDoMes.length) continue;
      totalMesAss += entsDoMes.reduce((s, e) => s + (e.valor||0), 0);
      numMesesAss++;
    }
    return numMesesAss > 0 ? totalMesAss / numMesesAss : 0;
  }

  function renderProjecao() {
    const todasTx     = getTransacoes();
    const recTotal    = todasTx.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
    const despTotal   = todasTx.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
    const saldoAtual  = recTotal - despTotal;

    const hojeP = new Date();
    const assinaturas = getAssinaturas();
    const emp = window._isModoEmpresa?.() || false;

    let rendaMensal;
    if (emp) {
      // Calcula fatMes de cada vendedor individualmente e soma
      rendaMensal = getRendas().filter(r => r.perfil === 'vendedor').reduce((total, r) => {
        let totalMes = 0, numMeses = 0;
        for (let i = 0; i < 3; i++) {
          const d  = new Date(hojeP.getFullYear(), hojeP.getMonth() - i, 1);
          const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const sessMes = (r.sessoes||[]).filter(s => (s.data||'').slice(0,7) === ym);
          if (!sessMes.length) continue;
          totalMes += sessMes.reduce((a,s)=>a+(s.ganho||0),0);
          numMeses++;
        }
        return total + (numMeses > 0 ? totalMes / numMeses : 0);
      }, 0);
    } else {
      rendaMensal = getRendas().reduce((a, r) => a + (r.valor || 0), 0);
    }

    const despesaMensal = assinaturas
      .filter(a => assinaturaAtivaEm(a, hojeP.getFullYear(), hojeP.getMonth()))
      .filter(a => emp || a.tipo !== 'variavel')
      .reduce((a, s) => a + calcValorMensalAssinatura(s), 0);
    const sobraMensal   = rendaMensal - despesaMensal;

    const elSaldo = q('proj-saldo-atual'), elRenda = q('proj-renda-mensal'),
          elDesp  = q('proj-despesa-mensal'), elSobra = q('proj-sobra-mensal');
    if (elSaldo)  { elSaldo.textContent  = moeda(saldoAtual);  elSaldo.className  = 'ass-resumo-valor ' + (saldoAtual  >= 0 ? 'valor-receita' : 'valor-despesa'); }
    if (elRenda)    elRenda.textContent    = moeda(rendaMensal);
    if (elDesp)     elDesp.textContent     = moeda(despesaMensal);
    if (elSobra) { elSobra.textContent = moeda(sobraMensal); elSobra.className = 'ass-resumo-valor ' + (sobraMensal >= 0 ? 'valor-receita' : 'valor-despesa'); }

    const meses = [];
    let saldoAcumulado = saldoAtual;
    for (let m = 1; m <= 12; m++) {
      const d = new Date(hojeP.getFullYear(), hojeP.getMonth() + m, 1);
      const rendaMes   = rendaMensal;
      const despesaMes = assinaturas
        .filter(a => assinaturaAtivaEm(a, d.getFullYear(), d.getMonth()))
        .filter(a => emp || a.tipo !== 'variavel')
        .reduce((a, s) => a + calcValorMensalAssinatura(s), 0);
      saldoAcumulado += (rendaMes - despesaMes);
      meses.push({
        label: NOMES_MESES_PROJ[d.getMonth()] + '/' + String(d.getFullYear()).slice(2),
        renda: rendaMes, despesa: despesaMes, saldo: saldoAcumulado,
      });
    }

    const cvP = q('grafico-projecao'), vazP = q('proj-vazio'), listaP = q('proj-lista');
    const semDados = !rendaMensal && !despesaMensal;

    if (cvP) {
      if (semDados) {
        cvP.style.display = 'none';
        if (vazP) vazP.style.display = 'block';
        if (listaP) listaP.innerHTML = '';
      } else {
        cvP.style.display = 'block';
        if (vazP) vazP.style.display = 'none';

        const ctxP = cvP.getContext('2d');
        ctxP.clearRect(0, 0, cvP.width, cvP.height);
        const cs = getComputedStyle(document.documentElement);
        const clrSuccess = cs.getPropertyValue('--color-success').trim() || '#30D988';
        const clrDanger  = cs.getPropertyValue('--color-danger').trim()  || '#FF5C7A';
        const clrGrid    = cs.getPropertyValue('--border-subtle').trim() || '#2a2d3d';
        const clrText    = cs.getPropertyValue('--text-tertiary').trim()|| '#9094a8';

        const padL = 58, padR = 14, padT = 16, padB = 28;
        const w = cvP.width - padL - padR, h = cvP.height - padT - padB;
        const valores = meses.map(m => m.saldo);
        const maxV = Math.max(...valores, 0), minV = Math.min(...valores, 0);
        const span = (maxV - minV) || 1;
        const zeroY = padT + h - ((0 - minV) / span) * h;

        /* ── Eixo Y: ticks + grid tracejado ── */
        const NICE = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000,20000,25000,50000,100000,200000,500000];
        const yStep = NICE.find(s => s >= span / 5) || NICE[NICE.length - 1];
        function fmtY(v) {
          const a = Math.abs(v);
          if (a >= 1000) return 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
          return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        }
        const tickStart = Math.ceil(minV / yStep) * yStep;
        ctxP.font = `500 9px 'Plus Jakarta Sans',sans-serif`;
        ctxP.textAlign = 'right';
        for (let v = tickStart; v <= maxV + yStep * 0.1; v += yStep) {
          const yPos = padT + h - ((v - minV) / span) * h;
          if (yPos < padT - 4 || yPos > padT + h + 4) continue;
          ctxP.strokeStyle = clrGrid; ctxP.lineWidth = 1; ctxP.setLineDash([3, 4]);
          ctxP.beginPath(); ctxP.moveTo(padL, yPos); ctxP.lineTo(padL + w, yPos); ctxP.stroke();
          ctxP.setLineDash([]);
          ctxP.fillStyle = clrText;
          ctxP.fillText(fmtY(v), padL - 6, yPos + 3.5);
        }

        /* ── Linha do zero (sólida) ── */
        ctxP.strokeStyle = clrGrid; ctxP.lineWidth = 1;
        ctxP.beginPath(); ctxP.moveTo(padL, zeroY); ctxP.lineTo(padL + w, zeroY); ctxP.stroke();

        /* ── Barras + labels X ── */
        const barStep = w / meses.length, barW = barStep * 0.6;
        meses.forEach((m, i) => {
          const x = padL + barStep * i + (barStep - barW) / 2;
          const barH = Math.max(Math.abs(m.saldo) / span * h, 1);
          const y = m.saldo >= 0 ? zeroY - barH : zeroY;
          ctxP.fillStyle = m.saldo >= 0 ? clrSuccess : clrDanger;
          ctxP.fillRect(x, y, barW, barH);
          ctxP.fillStyle = clrText;
          ctxP.font = `600 10px 'Plus Jakarta Sans',sans-serif`;
          ctxP.textAlign = 'center';
          ctxP.fillText(m.label, x + barW / 2, padT + h + 18);
        });
      }

      if (listaP) {
        listaP.innerHTML = meses.map(m => `
          <div class="proj-row">
            <span class="proj-row-mes">${m.label}</span>
            <div class="proj-row-valores">
              <span class="valor-receita">+${moeda(m.renda)}</span>
              <span class="valor-despesa">−${moeda(m.despesa)}</span>
              <span class="proj-row-saldo ${m.saldo >= 0 ? 'valor-receita' : 'valor-despesa'}">${moeda(m.saldo)}</span>
            </div>
          </div>`).join('');
      }
    }
  }

  function filtrarSessoesPorPeriodo(sessoes) {
    return sessoes.filter(s => {
      if (!s.data) return true;
      if (periodoRelMes || periodoRelAno) {
        if (periodoRelMes && periodoRelAno) return s.data.startsWith(periodoRelAno + '-' + periodoRelMes);
        if (periodoRelAno) return s.data.startsWith(periodoRelAno);
        if (periodoRelMes) return s.data.slice(5, 7) === periodoRelMes;
        return true;
      }
      if (periodoRel === 0) return true;
      const limite = new Date();
      limite.setDate(limite.getDate() - periodoRel);
      return s.data >= limite.toISOString().slice(0, 10);
    });
  }

  function renderRelatoriosEmpresa() {
    const emp = window._isModoEmpresa?.() || false;
    const fatWrap      = q('rel-empresa-fat');
    const clientesWrap = q('rel-empresa-clientes');
    if (!fatWrap || !clientesWrap) return;
    if (!emp) {
      fatWrap.style.display      = 'none';
      clientesWrap.style.display = 'none';
      return;
    }
    fatWrap.style.display      = '';
    clientesWrap.style.display = '';

    const rendas = getRendas().filter(r => r.perfil === 'vendedor');
    const fatLista = q('rel-fat-lista');
    const fatVazio = q('rel-fat-vazio');
    if (fatLista) {
      fatLista.innerHTML = '';
      const rows = rendas.map(r => {
        const sess  = filtrarSessoesPorPeriodo(r.sessoes || []);
        const total = sess.reduce((a, s) => a + (s.ganho || 0), 0);
        return { r, total, num: sess.length };
      }).filter(x => x.total > 0).sort((a, b) => b.total - a.total);
      const grandTotal = rows.reduce((a, x) => a + x.total, 0);
      if (!rows.length) {
        if (fatVazio) fatVazio.style.display = '';
      } else {
        if (fatVazio) fatVazio.style.display = 'none';
        rows.forEach(({ r, total, num }) => {
          const pct = grandTotal > 0 ? (total / grandTotal * 100).toFixed(1) : '0';
          const row = document.createElement('div'); row.className = 'rel-cat-row';
          row.innerHTML = `
            <div class="rel-cat-nome"><span class="rel-cat-emoji">🛒</span><span>${esc(r.nome)}</span></div>
            <div class="rel-cat-barras">
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--receita" style="width:${pct}%"></div></div>
              <div class="rel-barra-wrap" style="visibility:hidden"><div></div></div>
            </div>
            <div class="rel-cat-valores">
              <span class="valor-receita">+${moeda(total)}</span>
              <span class="valor-despesa">${num} venda${num!==1?'s':''}</span>
              <span class="rel-cat-saldo valor-receita">${pct}%</span>
            </div>`;
          fatLista.appendChild(row);
        });
      }
    }

    const clientesLista = q('rel-clientes-lista');
    const clientesVazio = q('rel-clientes-vazio');
    if (clientesLista) {
      clientesLista.innerHTML = '';
      const mapaCliente = {};
      rendas.forEach(r => {
        filtrarSessoesPorPeriodo(r.sessoes || []).forEach(s => {
          const key = s.cliente || '__sem_cliente__';
          if (!mapaCliente[key]) mapaCliente[key] = { total: 0, num: 0 };
          mapaCliente[key].total += s.ganho || 0;
          mapaCliente[key].num++;
        });
      });
      const catMap = window._catsMgr?.getCatMap?.() || {};
      const entriesC = Object.entries(mapaCliente).sort((a, b) => b[1].total - a[1].total);
      const grandC = entriesC.reduce((a, [, v]) => a + v.total, 0);
      if (!entriesC.length || grandC === 0) {
        if (clientesVazio) clientesVazio.style.display = '';
      } else {
        if (clientesVazio) clientesVazio.style.display = 'none';
        entriesC.forEach(([clienteId, { total, num }]) => {
          const pct = grandC > 0 ? (total / grandC * 100).toFixed(1) : '0';
          const catInfo = catMap[clienteId];
          const nome = catInfo ? `${catInfo.emoji||'👥'} ${catInfo.nome}` : '(sem cliente)';
          const row = document.createElement('div'); row.className = 'rel-cat-row';
          row.innerHTML = `
            <div class="rel-cat-nome"><span>${nome}</span></div>
            <div class="rel-cat-barras">
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--receita" style="width:${pct}%"></div></div>
              <div class="rel-barra-wrap" style="visibility:hidden"><div></div></div>
            </div>
            <div class="rel-cat-valores">
              <span class="valor-receita">+${moeda(total)}</span>
              <span class="valor-despesa">${num} venda${num!==1?'s':''}</span>
              <span class="rel-cat-saldo valor-receita">${pct}%</span>
            </div>`;
          clientesLista.appendChild(row);
        });
      }
    }
  }

  /* ── Gráfico Histórico ── */
  let _histMode = '3m';
  let _histAno  = new Date().getFullYear();
  let _histComp = null;

  function _histGetMeses() {
    const hoje = new Date();
    if (_histMode === '3m') {
      return Array.from({length: 3}, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 2 + i, 1);
        return { ano: d.getFullYear(), mes: d.getMonth() };
      });
    }
    if (_histMode === '12m') {
      return Array.from({length: 12}, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
        return { ano: d.getFullYear(), mes: d.getMonth() };
      });
    }
    return Array.from({length: 12}, (_, mes) => ({ ano: _histAno, mes }));
  }

  function _histDadosMes(ano, mes) {
    const prefix = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    const tx = getTransacoes().filter(t => (t.data || '').startsWith(prefix));
    return {
      rec: tx.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0),
      des: tx.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0),
    };
  }

  function renderGraficoHistorico() {
    const emp    = window._isModoEmpresa?.() || false;
    const painel = q('painel-historico');
    if (painel) painel.style.display = emp ? '' : 'none';
    if (!emp) return;

    const cv  = q('grafico-historico');
    const leg = q('historico-legenda');
    const vaz = q('historico-vazio');
    const lst = q('historico-lista');
    if (!cv) return;

    const meses = _histGetMeses();
    const dados = meses.map(({ ano, mes }) => {
      const d = _histDadosMes(ano, mes);
      return { label: NOMES_MESES_PROJ[mes] + '/' + String(ano).slice(2), rec: d.rec, des: d.des, saldo: d.rec - d.des };
    });
    let dadosComp = null;
    if (_histComp) {
      dadosComp = meses.map(({ mes }) => { const d = _histDadosMes(_histComp, mes); return { rec: d.rec, des: d.des }; });
    }

    const temDados = dados.some(d => d.rec > 0 || d.des > 0) || (dadosComp && dadosComp.some(d => d.rec > 0 || d.des > 0));
    if (!temDados) {
      cv.style.display = 'none';
      if (vaz) vaz.style.display = 'block';
      if (leg) leg.innerHTML = '';
      if (lst) lst.innerHTML = '';
      return;
    }
    cv.style.display = 'block';
    if (vaz) vaz.style.display = 'none';

    // Canvas DPR setup
    const dpr  = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    const W    = Math.max(rect.width  || 600, 200);
    const H    = Math.max(rect.height || 200, 120);
    cv.width   = W * dpr;
    cv.height  = H * dpr;
    const ctx  = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const cs        = getComputedStyle(document.documentElement);
    const clrGreen  = cs.getPropertyValue('--color-success').trim() || '#30D988';
    const clrRed    = cs.getPropertyValue('--color-danger').trim()  || '#FF5C7A';
    const clrViolet = '#9B6DFF';
    const clrGrid   = cs.getPropertyValue('--border-subtle').trim() || '#2a2d3d';
    const clrText   = cs.getPropertyValue('--text-tertiary').trim() || '#9094a8';
    const clrText2  = cs.getPropertyValue('--text-secondary').trim()|| '#c5c8dd';

    const padL = 56, padR = 10, padT = 20, padB = 26;
    const w = W - padL - padR, h = H - padT - padB;

    // Bars always go UP from zero; saldo line can go below zero
    const allBars  = dados.flatMap(d => [d.rec, d.des]);
    if (dadosComp) dadosComp.forEach(d => allBars.push(d.rec, d.des));
    const allSaldo = dados.map(d => d.saldo);
    const maxV = Math.max(...allBars, ...allSaldo, 1);
    const minV = Math.min(...allSaldo, 0);
    const span = (maxV - minV) || 1;
    const zeroY = padT + h - ((0 - minV) / span) * h;

    // Bar layout
    const hasComp = !!dadosComp;
    const slotW   = w / dados.length;
    const barW    = Math.min(Math.max(slotW * (hasComp ? 0.18 : 0.33), 4), hasComp ? 20 : 32);
    const barGap  = 2;
    const groupW  = hasComp ? (barW + barGap) * 4 - barGap : (barW + barGap) * 2 - barGap;

    function fmtY(v) {
      const a = Math.abs(v);
      return a >= 1000 ? 'R$' + (v/1000).toFixed(1) + 'k' : 'R$' + v.toFixed(0);
    }
    function fmtShort(v) {
      if (v === 0) return '';
      return Math.abs(v) >= 1000 ? (v/1000).toFixed(1) + 'k' : String(Math.round(v));
    }

    function drawChart(hoverIdx = -1) {
      ctx.clearRect(0, 0, W, H);

      // Y-axis ticks + grid
      const NICE = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000,20000,25000,50000,100000];
      const yStep = NICE.find(s => s >= span / 5) || NICE[NICE.length - 1];
      ctx.font = `500 9px 'Plus Jakarta Sans',sans-serif`; ctx.textAlign = 'right';
      for (let v = Math.ceil(minV / yStep) * yStep; v <= maxV + yStep * 0.1; v += yStep) {
        const yPos = padT + h - ((v - minV) / span) * h;
        if (yPos < padT - 4 || yPos > padT + h + 4) continue;
        ctx.strokeStyle = clrGrid; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(padL, yPos); ctx.lineTo(padL + w, yPos); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = clrText; ctx.fillText(fmtY(v), padL - 4, yPos + 3.5);
      }
      ctx.strokeStyle = clrGrid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(padL + w, zeroY); ctx.stroke();

      // Bars
      dados.forEach((d, i) => {
        const slotX = padL + slotW * i;
        const baseX = slotX + (slotW - groupW) / 2;
        const isHov = hoverIdx === i;

        if (isHov) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(slotX, padT, slotW, h);
        }

        let bx = baseX;
        // comparison bars (lighter)
        if (hasComp && dadosComp[i]) {
          const c = dadosComp[i];
          ctx.globalAlpha = 0.28;
          const crH = Math.max(c.rec / span * h, 1);
          ctx.fillStyle = clrGreen; ctx.fillRect(bx, zeroY - crH, barW, crH); bx += barW + barGap;
          const cdH = Math.max(c.des / span * h, 1);
          ctx.fillStyle = clrRed;   ctx.fillRect(bx, zeroY - cdH, barW, cdH); bx += barW + barGap;
          ctx.globalAlpha = 1;
        }

        // rec bar (green, goes UP)
        const rH = Math.max(d.rec / span * h, 1);
        ctx.globalAlpha = isHov ? 1 : 0.85;
        ctx.fillStyle = clrGreen;
        ctx.fillRect(bx, zeroY - rH, barW, rH);
        const recCx = bx + barW / 2;
        bx += barW + barGap;

        // des bar (red, goes UP)
        const dH = Math.max(d.des / span * h, 1);
        ctx.fillStyle = clrRed;
        ctx.fillRect(bx, zeroY - dH, barW, dH);
        const desCx = bx + barW / 2;
        ctx.globalAlpha = 1;

        // hover values above bars
        if (isHov) {
          ctx.font = `700 9px 'Plus Jakarta Sans',sans-serif`; ctx.textAlign = 'center';
          if (d.rec > 0) {
            ctx.fillStyle = clrGreen;
            ctx.fillText(fmtShort(d.rec), recCx, Math.max(zeroY - rH - 3, padT + 9));
          }
          if (d.des > 0) {
            ctx.fillStyle = clrRed;
            ctx.fillText(fmtShort(d.des), desCx, Math.max(zeroY - dH - 3, padT + 9));
          }
        }

        // month label
        ctx.fillStyle = isHov ? clrText2 : clrText;
        ctx.font = `${isHov ? '700' : '600'} ${isHov ? 10 : 9}px 'Plus Jakarta Sans',sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(d.label, slotX + slotW / 2, padT + h + 18);
      });

      // Saldo line (violet, can dip below zero)
      ctx.strokeStyle = clrViolet; ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.beginPath();
      dados.forEach((d, i) => {
        const cx = padL + slotW * i + slotW / 2;
        const cy = padT + h - ((d.saldo - minV) / span) * h;
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      dados.forEach((d, i) => {
        const cx = padL + slotW * i + slotW / 2;
        const cy = padT + h - ((d.saldo - minV) / span) * h;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
        ctx.fillStyle = clrViolet; ctx.fill();
      });
    }

    drawChart();

    // Hover / touch handlers
    function canvasPos(e) {
      const r = cv.getBoundingClientRect();
      return (e.clientX - r.left) * W / r.width;
    }
    function getIdx(px) {
      if (px < padL || px > padL + w) return -1;
      return Math.min(dados.length - 1, Math.floor((px - padL) / slotW));
    }

    if (cv._hoverFn) cv.removeEventListener('mousemove',  cv._hoverFn);
    if (cv._leaveFn) cv.removeEventListener('mouseleave', cv._leaveFn);
    if (cv._touchFn) cv.removeEventListener('touchstart', cv._touchFn);

    cv._hoverFn = e => { const idx = getIdx(canvasPos(e)); drawChart(idx >= 0 ? idx : -1); };
    cv._leaveFn = () => drawChart();
    cv._touchFn = e => { e.preventDefault(); const idx = getIdx(canvasPos(e.touches[0])); if (idx >= 0) drawChart(idx); };
    cv.addEventListener('mousemove',  cv._hoverFn);
    cv.addEventListener('mouseleave', cv._leaveFn);
    cv.addEventListener('touchstart', cv._touchFn, { passive: false });

    // Legend
    if (leg) {
      leg.innerHTML = `
        <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${clrGreen}"></span>Receitas</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${clrRed}"></span>Despesas</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:3px;border-radius:2px;background:${clrViolet}"></span>Saldo</span>
        ${dadosComp ? `<span style="display:flex;align-items:center;gap:4px;opacity:.5"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${clrGreen}"></span>Mesmo período em ${_histComp}</span>` : ''}`;
    }

    // Table below (like projection)
    if (lst) {
      lst.innerHTML = dados.map(d => `
        <div class="proj-row">
          <span class="proj-row-mes">${d.label}</span>
          <div class="proj-row-valores">
            <span class="valor-receita">+${moeda(d.rec)}</span>
            <span class="valor-despesa">−${moeda(d.des)}</span>
            <span class="proj-row-saldo ${d.saldo >= 0 ? 'valor-receita' : 'valor-despesa'}">${d.saldo >= 0 ? '+' : '−'}${moeda(Math.abs(d.saldo))}</span>
          </div>
        </div>`).join('');
    }
  }

  function _histPopularAnos() {
    const anos = new Set(getTransacoes().map(t => (t.data || '').slice(0, 4)).filter(Boolean));
    anos.add(String(new Date().getFullYear()));
    const arrAnos = [...anos].sort().reverse();

    const selAno  = q('historico-ano-sel');
    const selComp = q('historico-compare-sel');
    if (selAno) {
      const prevA = selAno.value;
      selAno.innerHTML = arrAnos.map(a => `<option value="${a}">${a}</option>`).join('');
      if (prevA && arrAnos.includes(prevA)) selAno.value = prevA;
      else { selAno.value = String(_histAno); _histAno = Number(selAno.value); }
    }
    if (selComp) {
      const prevC = selComp.value;
      selComp.innerHTML = `<option value="">Sem comparação</option>` + arrAnos.map(a => `<option value="${a}">${a}</option>`).join('');
      if (prevC && (prevC === '' || arrAnos.includes(prevC))) selComp.value = prevC;
      else selComp.value = '';
    }
  }

  // Listeners para o gráfico histórico
  q('historico-modos')?.querySelectorAll('.historico-modo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      q('historico-modos')?.querySelectorAll('.historico-modo-btn').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      _histMode = btn.dataset.modo;
      const wrap = q('historico-ano-wrap');
      if (wrap) wrap.style.display = _histMode === 'ano' ? 'flex' : 'none';
      renderGraficoHistorico();
    });
  });
  q('historico-ano-sel')?.addEventListener('change', e => { _histAno = Number(e.target.value); renderGraficoHistorico(); });
  q('historico-compare-sel')?.addEventListener('change', e => { _histComp = e.target.value ? Number(e.target.value) : null; renderGraficoHistorico(); });

  function renderRelatorios() {
    popularAnosRel();
    _histPopularAnos();
    renderGraficoHistorico();
    renderProjecao();
    const tx = filtrarTransacoesPorPeriodo(periodoRel);
    /* Mapa de gastos de eventos no período */
    const evMapNoP = {};
    (window._getEventos?.() || []).forEach(ev => {
      const tot = filtrarGastosPorPeriodo(ev.gastos || []).reduce((a, g) => a + (g.valor || 0), 0);
      if (tot > 0) evMapNoP['__ev_' + ev.id] = tot;
    });
    /* Balanço por categoria */
    const divCat = q('rel-categorias');
    const relVaz = q('rel-vazio');
    if (divCat) {
      divCat.innerHTML = '';
      const mapa = {};
      tx.forEach(t => {
        if (!mapa[t.categoria]) mapa[t.categoria]={rec:0,des:0};
        mapa[t.categoria][t.tipo==='receita'?'rec':'des'] += t.valor;
      });
      Object.entries(evMapNoP).forEach(([k, des]) => {
        if (!mapa[k]) mapa[k] = { rec: 0, des: 0 };
        mapa[k].des += des;
      });
      const entradas = Object.entries(mapa).sort((a,b)=>(b[1].rec+b[1].des)-(a[1].rec+a[1].des));
      if (!entradas.length) { if(relVaz) relVaz.style.display='block'; }
      else {
        if(relVaz) relVaz.style.display='none';
        entradas.forEach(([cat,v])=>{
          const info = resolverCat(cat);
          const saldo = v.rec-v.des, max = Math.max(v.rec,v.des,1);
          const row = document.createElement('div'); row.className='rel-cat-row';
          row.innerHTML=`
            <div class="rel-cat-nome"><span class="rel-cat-emoji">${info.emoji}</span><span>${info.nome}</span></div>
            <div class="rel-cat-barras">
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--receita" style="width:${(v.rec/max*100).toFixed(1)}%"></div></div>
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--despesa" style="width:${(v.des/max*100).toFixed(1)}%"></div></div>
            </div>
            <div class="rel-cat-valores">
              <span class="valor-receita">+${moeda(v.rec)}</span>
              <span class="valor-despesa">−${moeda(v.des)}</span>
              <span class="rel-cat-saldo ${saldo>=0?'valor-receita':'valor-despesa'}">${saldo>=0?'+':'−'}${moeda(Math.abs(saldo))}</span>
            </div>`;
          divCat.appendChild(row);
        });
      }
    }
    /* Gráfico */
    const cv2 = q('grafico-pizza2'), leg2 = q('grafico-legenda2'), vaz2 = q('grafico-vazio2');
    if (cv2 && leg2) {
      const ctx2 = cv2.getContext('2d');
      ctx2.clearRect(0,0,cv2.width,cv2.height); leg2.innerHTML='';
      // Remove listeners anteriores antes de re-renderizar
      if (cv2._hoverFn)   { cv2.removeEventListener('mousemove',  cv2._hoverFn);  cv2._hoverFn=null; }
      if (cv2._leaveFn)   { cv2.removeEventListener('mouseleave', cv2._leaveFn);  cv2._leaveFn=null; }
      if (cv2._touchFn)   { cv2.removeEventListener('touchstart', cv2._touchFn);  cv2._touchFn=null; }
      const desp = tx.filter(t=>t.tipo==='despesa');
      if (!desp.length && !Object.keys(evMapNoP).length) { if(vaz2) vaz2.style.display='block'; cv2.style.display='none'; }
      else {
        if(vaz2) vaz2.style.display='none'; cv2.style.display='block';
        const map={};
        desp.forEach(t=>{ map[t.categoria]=(map[t.categoria]||0)+t.valor; });
        Object.entries(evMapNoP).forEach(([k,v])=>{ map[k]=(map[k]||0)+v; });
        const total=Object.values(map).reduce((a,b)=>a+b,0);
        const cxP=cv2.width/2,cyP=cv2.height/2,r=Math.min(cxP,cyP)-10,ri=r*.55;
        const cs=getComputedStyle(document.documentElement);
        const clrHole=cs.getPropertyValue('--surface-raised').trim()||'#131622';
        const clrText=cs.getPropertyValue('--text-primary').trim()||'#f0f2ff';
        const clrDanger=cs.getPropertyValue('--color-danger').trim()||'#FF5C7A';

        const slices=[]; let ang=-Math.PI/2;
        Object.entries(map).sort((a,b)=>b[1]-a[1]).forEach(([cat,val],i)=>{
          const fatia=(val/total)*2*Math.PI,cor=CORES_REL[i%CORES_REL.length];
          const sa=ang, ea=ang+fatia;
          ctx2.beginPath();ctx2.moveTo(cxP,cyP);ctx2.arc(cxP,cyP,r,sa,ea);ctx2.closePath();
          ctx2.fillStyle=cor;ctx2.fill();
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ang=ea;
          const c=resolverCat(cat),pct=((val/total)*100).toFixed(1);
          slices.push({sa,ea,val,cor,emoji:c.emoji,nome:c.nome,pct});
          const li=document.createElement('div');li.className='legenda-item';
          li.innerHTML=`<span class="legenda-cor" style="background:${cor}"></span><span>${c.emoji} ${c.nome} (${pct}%)</span>`;
          leg2.appendChild(li);
        });

        function drawCenterDefault() {
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri-1,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ctx2.textAlign='center';ctx2.textBaseline='middle';
          ctx2.font=`700 13px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.fillText('Despesas',cxP,cyP-9);
          ctx2.font=`600 13px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrDanger;
          ctx2.fillText(moeda(total),cxP,cyP+10);
        }

        function drawCenterSlice(s) {
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri-1,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ctx2.textAlign='center';ctx2.textBaseline='middle';
          const label=(s.nome.length>11?s.nome.slice(0,11)+'…':s.nome);
          ctx2.font=`500 11px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.globalAlpha=.85;ctx2.fillText(s.emoji+' '+label,cxP,cyP-17);
          ctx2.font=`700 12px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=s.cor;
          ctx2.globalAlpha=1;ctx2.fillText(moeda(s.val),cxP,cyP-1);
          ctx2.font=`500 11px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.globalAlpha=.55;ctx2.fillText(s.pct+'%',cxP,cyP+14);
          ctx2.globalAlpha=1;
        }

        function hitTest(px,py) {
          const dx=px-cxP,dy=py-cyP,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<ri||dist>r) return null;
          let a=Math.atan2(dy,dx); if(a<-Math.PI/2) a+=2*Math.PI;
          return slices.find(s=>a>=s.sa&&a<s.ea)||slices[slices.length-1]||null;
        }

        function canvasPos(e) {
          const rect=cv2.getBoundingClientRect();
          return [(e.clientX-rect.left)*cv2.width/rect.width,(e.clientY-rect.top)*cv2.height/rect.height];
        }

        drawCenterDefault();

        cv2._hoverFn = e => { const [px,py]=canvasPos(e),s=hitTest(px,py); cv2.style.cursor=s?'pointer':'default'; s?drawCenterSlice(s):drawCenterDefault(); };
        cv2._leaveFn = () => { cv2.style.cursor='default'; drawCenterDefault(); };
        cv2._touchFn = e => { e.preventDefault(); const t=e.touches[0]; const [px,py]=canvasPos(t); const s=hitTest(px,py); if(s) drawCenterSlice(s); };
        cv2.addEventListener('mousemove',  cv2._hoverFn);
        cv2.addEventListener('mouseleave', cv2._leaveFn);
        cv2.addEventListener('touchstart', cv2._touchFn, {passive:false});
      }
    }
    /* Stats */
    const sd = q('rel-stats');
    if (sd) {
      const empR = window._isModoEmpresa?.() || false;
      const rec = tx.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
      const des = tx.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);
      const sal = rec-des;
      const mR  = tx.filter(t=>t.tipo==='receita').sort((a,b)=>b.valor-a.valor)[0];
      const mD  = tx.filter(t=>t.tipo==='despesa').sort((a,b)=>b.valor-a.valor)[0];
      const eco = rec>0?((sal/rec)*100).toFixed(1):'0';
      const evts = window._getEventos?.() || [];
      const totEv = ev => window._totalEvento?.(ev) || 0;
      const maiorEv = evts.length ? evts.reduce((a,b) => totEv(a) >= totEv(b) ? a : b) : null;
      if (empR) {
        // Empresa stats: faturamento from sessoes filtered by period
        const rendas = getRendas().filter(r => r.perfil === 'vendedor');
        const todasSess = rendas.flatMap(r => filtrarSessoesPorPeriodo(r.sessoes || []));
        const fatTotal = todasSess.reduce((a, s) => a + (s.ganho || 0), 0);
        const numVendas = todasSess.length;
        const fatMedio  = numVendas > 0 ? fatTotal / numVendas : 0;
        const maiorVenda = todasSess.sort((a, b) => (b.ganho || 0) - (a.ganho || 0))[0];
        const fontesMaisVendas = rendas.map(r => {
          const sess = filtrarSessoesPorPeriodo(r.sessoes || []);
          return { nome: r.nome, total: sess.reduce((a, s) => a + (s.ganho || 0), 0), num: sess.length };
        }).filter(x => x.total > 0).sort((a, b) => b.total - a.total)[0];
        sd.innerHTML = `
          <div class="stat-item"><span class="stat-label">Faturamento total</span><span class="stat-valor valor-receita">+${moeda(fatTotal)}</span></div>
          <div class="stat-item"><span class="stat-label">Total de vendas</span><span class="stat-valor">${numVendas}</span></div>
          <div class="stat-item"><span class="stat-label">Ticket médio</span><span class="stat-valor valor-receita">${fatMedio>0?moeda(fatMedio):'—'}</span></div>
          ${maiorVenda?`<div class="stat-item"><span class="stat-label">Maior venda</span><span class="stat-valor valor-receita">${moeda(maiorVenda.ganho||0)}</span></div>`:''}
          ${fontesMaisVendas?`<div class="stat-item"><span class="stat-label">Melhor fonte</span><span class="stat-valor valor-receita">${moeda(fontesMaisVendas.total)}</span><span class="stat-desc">${esc(fontesMaisVendas.nome)}</span></div>`:''}
          <div class="stat-item"><span class="stat-label">Total de despesas</span><span class="stat-valor valor-despesa">−${moeda(des)}</span></div>
          <div class="stat-item"><span class="stat-label">Saldo</span><span class="stat-valor ${sal>=0?'valor-receita':'valor-despesa'}">${moeda(sal)}</span></div>`;
      } else {
        sd.innerHTML=`
          <div class="stat-item"><span class="stat-label">Total de registros</span><span class="stat-valor">${tx.length}</span></div>
          <div class="stat-item"><span class="stat-label">Maior receita</span><span class="stat-valor valor-receita">${mR?moeda(mR.valor):'—'}</span>${mR?`<span class="stat-desc">${esc(mR.descricao)}</span>`:''}</div>
          <div class="stat-item"><span class="stat-label">Maior despesa</span><span class="stat-valor valor-despesa">${mD?moeda(mD.valor):'—'}</span>${mD?`<span class="stat-desc">${esc(mD.descricao)}</span>`:''}</div>
          ${maiorEv?`<div class="stat-item"><span class="stat-label">Maior evento</span><span class="stat-valor valor-despesa">${moeda(totEv(maiorEv))}</span><span class="stat-desc">${esc(maiorEv.emoji||'📦')} ${esc(maiorEv.nome)}</span></div>`:''}
          <div class="stat-item"><span class="stat-label">Taxa de economia</span><span class="stat-valor ${sal>=0?'valor-receita':'valor-despesa'}">${eco}%</span></div>
          <div class="stat-item"><span class="stat-label">Saldo total</span><span class="stat-valor ${sal>=0?'valor-receita':'valor-despesa'}">${moeda(sal)}</span></div>`;
      }
    }
    renderRelatoriosEmpresa();
  }

  /* ══════════════════════════════════════════
     CONFIGURAÇÕES
  ══════════════════════════════════════════ */

  // Empresa mode toggle — init checkbox state and listen for changes
  const empToggle = q('config-modo-empresa');
  if (empToggle) {
    empToggle.checked = window._isModoEmpresa?.() || false;
    empToggle.addEventListener('change', () => {
      localStorage.setItem('carteira_modo_empresa', empToggle.checked ? '1' : '0');
      window._catsMgr?.renderCatPanel?.();
      window._catsMgr?.populateCatSelects?.();
      renderRenda?.();
      mostrarToast(empToggle.checked ? '🏢 Modo empresa ativado!' : '👤 Modo pessoal ativado!');
    });
  }

  q('btn-exportar')?.addEventListener('click', () => {
    let categorias = [];
    try { categorias = JSON.parse(localStorage.getItem('carteira_categorias') || '[]'); } catch {}
    const payload = {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      transacoes: getTransacoes(),
      assinaturas: getAssinaturas(),
      rendas: getRendas(),
      categorias,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `money360_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    mostrarToast('✅ Dados exportados!');
  });

  q('btn-importar')?.addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        // Novo formato: { transacoes: [], assinaturas: [], ... }
        if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.transacoes)) {
          localStorage.setItem('carteira_transacoes', JSON.stringify(d.transacoes));
          if (Array.isArray(d.assinaturas)) {
            localStorage.setItem('carteira_assinaturas', JSON.stringify(d.assinaturas));
          }
          if (Array.isArray(d.rendas)) {
            localStorage.setItem('carteira_rendas', JSON.stringify(d.rendas));
          }
          if (Array.isArray(d.categorias) && d.categorias.length) {
            localStorage.setItem('carteira_categorias', JSON.stringify(d.categorias));
          }
          const nAss = (d.assinaturas||[]).length;
          mostrarToast(`✅ ${d.transacoes.length} transações e ${nAss} assinatura(s) importadas! Recarregando…`);
        }
        // Formato antigo: array de transações
        else if (Array.isArray(d)) {
          localStorage.setItem('carteira_transacoes', JSON.stringify(d));
          mostrarToast(`✅ ${d.length} transações importadas! Recarregando…`);
        } else {
          throw new Error('formato inválido');
        }
        setTimeout(() => location.reload(), 1200);
      } catch { mostrarToast('❌ Arquivo inválido.'); }
    };
    r.readAsText(f); e.target.value='';
  });

  q('btn-limpar-tudo-config')?.addEventListener('click', () => window._confirmarApagarTudo?.());

  /* ══════════════════════════════════════════
     AUTO-SYNC: atualiza views abertas
  ══════════════════════════════════════════ */
  let _lastLen = -1;
  setInterval(() => {
    const d = getTransacoes();
    if (d.length !== _lastLen) {
      _lastLen = d.length;
      if (q('view-transacoes')?.classList.contains('view--active'))  renderTabelaTransacoes();
      if (q('view-relatorios')?.classList.contains('view--active'))  renderRelatorios();
      if (q('view-assinaturas')?.classList.contains('view--active')) renderAssinaturas();
      if (q('view-renda')?.classList.contains('view--active'))       renderRenda();
    }
  }, 600);

  /* ── Renderiza badges ao carregar ── */
  renderAssinaturas();
  renderRenda();
  verificarCobrancasAutomaticas();
  verificarRecebimentosAutomaticos();

});
