// ================= VARIÁVEIS GLOBAIS =================
const URL_SALVAR = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/13/workflows/348016b3bde54a47b4159b6b45544cba/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=NlhP96NiVsK85m-VTk7gLW9qbFpsnTqMR-YP6R5ZO60';
const URL_LISTAR = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/23/workflows/3fbf1a2a119441dabcb8c284dcae4cfe/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OdpmDoJPfT2zixNtGYBbnkZJkWrhs2pyVKgk1oPtOUI';
const URL_VALIDAR_USUARIO = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/08/workflows/b299d152bc6b4bc2a1865e21ab01b5fb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5z2scHhFAcu_y4_t8jARTGu4cZNyH5dqPuiR_oV69XQ';
const DOMINIO_PERMITIDO = '@totalexpress.com.br';

const form = document.getElementById('formPlano');
const ICONE_CALENDARIO = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>';

let idEmEdicao = null;
let todosOsItens = [];
let filtroAtual = 'todos';
const POR_PAGINA = 5;
let paginaAtual = 1;
let idFormulario = '';
let isTelaCriacao = true;

// VARIÁVEIS DE ACESSO
let emailLogado = "";
let isAdmin = false;
let regionalDoUsuario = "";

// MAPEAMENTO DE ACESSOS
const MAPA_REGIONAIS = {
  'igor.pinheiro@totalexpress.com.br': 'NE',
  'robson.santos@totalexpress.com.br': 'MG/RJ/ES',
  'adriele.costa@totalexpress.com.br': 'SUL',
  'debora.medici@totalexpress.com.br': 'SP',
  'giovanna.gomes@totalexpress.com.br': 'CO/N'
};
const EMAIL_ADMIN = 'ronady.santos@totalexpress.com.br';

// ================= LOGIN =================
const telaLogin = document.getElementById('telaLogin');
const formLogin = document.getElementById('formLogin');
const loginEmail = document.getElementById('loginEmail');
const loginErro = document.getElementById('loginErro');

if (sessionStorage.getItem('usuarioAutenticado')) {
  liberarAcesso(sessionStorage.getItem('usuarioAutenticado'));
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();

  if (!email.endsWith(DOMINIO_PERMITIDO)) {
    mostrarErroLogin('Use seu e-mail corporativo ' + DOMINIO_PERMITIDO);
    return;
  }

  const botao = formLogin.querySelector('button');
  const textoOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24" style="animation: girar 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Verificando...';
  loginErro.hidden = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(URL_VALIDAR_USUARIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const dados = await resp.json();

    if (dados.valido) {
      sessionStorage.setItem('usuarioAutenticado', email); 
      liberarAcesso(email); 
    } else {
      mostrarErroLogin(dados.mensagem || 'E-mail não encontrado ou conta inativa.');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      mostrarErroLogin('O servidor demorou muito para responder. Tente novamente.');
    } else {
      mostrarErroLogin('E-mail não corporativo ou conta inativa.');
    }
  } finally {
    clearTimeout(timeoutId);
    botao.disabled = false;
    botao.innerHTML = textoOriginal;
  }
});

function liberarAcesso(nomeUsuario) {
  telaLogin.hidden = true;
  telaLogin.style.display = 'none';
  
  emailLogado = nomeUsuario.toLowerCase();
  
  if (emailLogado === EMAIL_ADMIN) {
    isAdmin = true;
    regionalDoUsuario = "TODAS";
    mostrarTelaCriacao();
  } else if (MAPA_REGIONAIS[emailLogado]) {
    isAdmin = false;
    regionalDoUsuario = MAPA_REGIONAIS[emailLogado];
    
    // Trava o select de regional para esta pessoa
    const selectRegional = form.elements['regional'];
    selectRegional.innerHTML = `<option>${regionalDoUsuario}</option>`;
    selectRegional.classList.add('bloqueado');
    
    const urlParams = new URLSearchParams(window.location.search);
    const idDaUrl = urlParams.get('id');
    
    if (idDaUrl) {
      carregarFormularios(idDaUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      mostrarTelaLista();
    }
  } else {
    alert('Acesso negado. Seu e-mail não possui permissão de acesso.\nContate o administrador.');
    sessionStorage.removeItem('usuarioAutenticado');
    window.location.reload();
  }
}

function mostrarErroLogin(msg) {
  loginErro.textContent = msg;
  loginErro.hidden = false;
}

// ================= FUNÇÕES AUXILIARES =================
async function chamarFluxo(payload, url) {
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resposta.ok) throw new Error(await resposta.text());
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : {};
}

function lerCampos() {
  return Object.fromEntries(new FormData(form).entries());
}

function atualizarContadores() {
  form.querySelectorAll('textarea').forEach(t => {
    t.parentElement.querySelector('.contador').textContent = t.value.length + '/' + t.maxLength;
  });
}

function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function gerarIdFormulario() {
  let id;
  do {
    id = String(Math.floor(100000 + Math.random() * 900000));
  } while (todosOsItens.some(item => lerIdFormulario(item) === id));
  return id;
}

function lerIdFormulario(item) {
  for (const chave of Object.keys(item)) {
    if (chave.toLowerCase().replace(/[^a-z]/g, '') === 'idformulario' && item[chave]) {
      return String(item[chave]);
    }
  }
  return '';
}

function mostrarId() {
  document.getElementById('idForm').textContent = idFormulario;
}

function formatarData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function formatarDataSimples(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR');
}

// ================= FILTRO DE PERMISSÃO =================
function normalizarRegional(v) {
  return String(v || '').trim().toUpperCase().replace(/\s+/g, '');
}

function lerRegionalItem(item) {
  const chaves = Object.keys(item);
  const chave = chaves.find(c => c.toLowerCase() === 'regional') ||
                chaves.find(c => c.toLowerCase().includes('regional'));
  if (!chave) return null;
  const v = item[chave];
  return (v && typeof v === 'object') ? (v.Value || '') : v;
}

function filtrarPorPermissao(itens) {
  if (isAdmin) return itens;
  const minha = normalizarRegional(regionalDoUsuario);
  if (!minha) return [];
  return itens.filter(i => {
    const reg = lerRegionalItem(i);
    if (reg === null) return true;
    return normalizarRegional(reg) === minha;
  });
}

// ================= CONTROLE DE TELAS =================
function mostrarTelaCriacao() {
  if (!isAdmin) return;
  
  isTelaCriacao = true;
  form.reset();
  idEmEdicao = null;
  idFormulario = gerarIdFormulario();
  mostrarId();
  atualizarContadores();
  
  form.querySelectorAll('.bloqueado').forEach(c => c.classList.remove('bloqueado'));
  form.querySelectorAll('input, select, textarea').forEach(c => { c.readOnly = false; c.disabled = false; });

  document.getElementById('tituloFormulario').textContent = 'Nova Ocorrência';
  document.getElementById('camposExtras').style.display = 'none';
  
  document.getElementById('painelLista').style.display = 'none';
  document.querySelector('.layout').classList.add('sem-lista');
  
  // CONTROLE DE BOTÕES AQUI
  document.getElementById('btnVerLista').style.display = 'inline-flex';
  document.getElementById('btnEnviarOcorrencia').style.display = 'inline-flex';
  document.getElementById('btnVoltarLista').style.display = 'none';
  document.getElementById('btnConcluir').style.display = 'none';
  document.getElementById('btnSalvarProgresso').style.display = 'none';
  
  document.getElementById('avisoEdicao').hidden = true;
}

function mostrarTelaLista() {
  isTelaCriacao = false;
  document.getElementById('painelLista').style.display = 'block'; 
  document.querySelector('.layout').classList.remove('sem-lista');
  
  document.getElementById('tituloFormulario').textContent = 'Detalhes da Ocorrência';
  document.getElementById('camposExtras').style.display = 'block';
  
  // CONTROLE DE BOTÕES AQUI
  document.getElementById('btnVerLista').style.display = 'none';
  document.getElementById('btnEnviarOcorrencia').style.display = 'none';
  document.getElementById('btnSalvarProgresso').style.display = 'none';
  document.getElementById('btnConcluir').style.display = 'none';
  
  if (isAdmin) {
    document.getElementById('btnVoltarLista').style.display = 'inline-flex';
  } else {
    document.getElementById('btnVoltarLista').style.display = 'none';
  }
  
  carregarFormularios();
}

// ================= LISTAGEM =================
document.querySelectorAll('.filtros button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filtros button').forEach(b => b.classList.remove('ativo'));
    e.target.classList.add('ativo');
    filtroAtual = e.target.dataset.filtro;
    paginaAtual = 1;
    desenharLista();
  });
});

async function carregarFormularios(idParaAbrir = null) {
  const lista = document.getElementById('listaFormularios');
  lista.innerHTML = '<p class="vazio">Carregando...</p>';
  try {
    const res = await chamarFluxo({ acao: 'listar', emailLogado: emailLogado }, URL_LISTAR);
    const dadosBrutos = res.value || res.itens || res;
    const validos = dadosBrutos.filter(item => item && (JSON.stringify(item).includes('problema') || JSON.stringify(item).includes('Problema')));

    todosOsItens = filtrarPorPermissao(validos);
    todosOsItens.sort((a, b) => Number(b.ID || b.id || 0) - Number(a.ID || a.id || 0));

    if (idParaAbrir) {
      const item = todosOsItens.find(i => lerIdFormulario(i) === idParaAbrir);
      if (item) {
        abrirFormulario(item);
      } else {
        alert('Ocorrência não encontrada ou você não tem permissão para acessá-la.');
        mostrarTelaLista();
      }
    } else {
      desenharLista();
    }
  } catch (erro) {
    console.error(erro);
    lista.innerHTML = '<p class="vazio">Não foi possível carregar a lista.</p>';
  }
}

function desenharLista() {
  const lista = document.getElementById('listaFormularios');
  lista.innerHTML = '';

  const pegarValor = (item, nomes) => {
    for (let n of nomes) if (item[n] !== undefined && item[n] !== null && String(item[n]).trim() !== '') return item[n];
    for (let chave of Object.keys(item)) if (nomes.some(n => chave.toLowerCase().includes(n.toLowerCase()))) return item[chave];
    return null;
  };

  const base = filtrarPorPermissao(todosOsItens);

  let itensFiltrados = base;
  if (filtroAtual === 'pendente') itensFiltrados = base.filter(i => pegarValor(i, ['Situacao', 'situacao', 'Status', 'status']) !== 'Finalizado');
  else if (filtroAtual === 'finalizado') itensFiltrados = base.filter(i => pegarValor(i, ['Situacao', 'situacao', 'Status', 'status']) === 'Finalizado');

  if (itensFiltrados.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhuma ocorrência encontrada.</p>';
    return;
  }

  const totalPaginas = Math.ceil(itensFiltrados.length / POR_PAGINA);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  const itensDaPagina = itensFiltrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  itensDaPagina.forEach(item => {
    const idItem = pegarValor(item, ['ID', 'id', 'Id']) || 'N/A';
    const statusItem = pegarValor(item, ['Situacao', 'situacao', 'Status', 'status']) || 'Pendente';
    const problemaItem = pegarValor(item, ['Problema', 'problema']) || 'Sem problema';
    const regionalItem = pegarValor(item, ['Regional', 'regional']) || 'N/D';
    const areaItem = pegarValor(item, ['Area', 'area']) || 'N/D';

    const cartao = criar('div', 'item' + (String(idItem) === String(idEmEdicao) ? ' ativo' : ''));
    const info = criar('div');
    const isFinalizado = String(statusItem).toLowerCase() === 'finalizado' || String(statusItem).toLowerCase() === 'concluído';

    info.append(
      criar('span', 'badge ' + (isFinalizado ? 'finalizado' : 'pendente'), isFinalizado ? 'Concluído' : 'Pendente'),
      criar('strong', '', String(problemaItem).length > 45 ? String(problemaItem).slice(0, 45) + '...' : String(problemaItem)),
      criar('p', '', 'Reg: ' + regionalItem + ' • Área: ' + areaItem + ' • ID: ' + (lerIdFormulario(item) || idItem))
    );

    const data = formatarData(pegarValor(item, ['criadoEm', 'CriadoEm', 'Data', 'Created', 'Criado']));
    if (data) {
      const linhaData = criar('p', 'data');
      linhaData.insertAdjacentHTML('beforeend', ICONE_CALENDARIO);
      linhaData.append('Aberto em: ' + data);
      info.append(linhaData);
    }

    // ===== LINHA DE DATAS DO PLANO =====
    const dPrevIni  = pegarValor(item, ['DataPrevisaoInicio',    'dataPrevisaoInicio',    'PrevisaoInicio']);
    const dIniReal  = pegarValor(item, ['DataInicioReal',        'dataInicioReal',        'InicioReal']);
    const dPrevFim  = pegarValor(item, ['DataPrevisaoConclusao', 'dataPrevisaoConclusao', 'PrevisaoConclusao', 'Prazo', 'prazo']);
    const dFimReal  = pegarValor(item, ['DataConclusaoReal',     'dataConclusaoReal',     'ConclusaoReal',     'DataConclusao', 'dataConclusao']);

    const pedacos = [];
    if (dPrevIni) pedacos.push('Prev. início: ' + formatarDataSimples(dPrevIni));
    if (dIniReal) pedacos.push('Início real: ' + formatarDataSimples(dIniReal));
    if (dPrevFim) pedacos.push('Prev. fim: '    + formatarDataSimples(dPrevFim));
    if (dFimReal) pedacos.push('Fim real: '     + formatarDataSimples(dFimReal));

    if (pedacos.length) {
      const linhaPlano = criar('p', 'data plano');
      linhaPlano.insertAdjacentHTML('beforeend', ICONE_CALENDARIO);
      linhaPlano.append(pedacos.join(' • '));
      info.append(linhaPlano);
    }

    const botao = criar('button', 'b-azul', isFinalizado ? 'Visualizar' : 'Continuar');
    botao.type = 'button';
    botao.addEventListener('click', () => abrirFormulario(item));

    cartao.append(info, botao);
    lista.appendChild(cartao);
  });

  if (totalPaginas > 1) {
    const nav = criar('div', 'paginacao');
    const ant = criar('button', '', '← Anterior'); ant.type = 'button'; ant.disabled = paginaAtual === 1; ant.addEventListener('click', () => { paginaAtual--; desenharLista(); });
    const txt = criar('span', '', 'Página ' + paginaAtual + ' de ' + totalPaginas);
    const prox = criar('button', '', 'Próxima →'); prox.type = 'button'; prox.disabled = paginaAtual === totalPaginas; prox.addEventListener('click', () => { paginaAtual++; desenharLista(); });
    nav.append(ant, txt, prox);
    lista.appendChild(nav);
  }
}

// ================= ABRIR E PREENCHER FORMULÁRIO =================
function abrirFormulario(item) {
  const pegarValor = (nomes) => {
    for (let n of nomes) if (item[n] !== undefined && item[n] !== null && String(item[n]).trim() !== '') return item[n];
    for (let c of Object.keys(item)) if (nomes.some(n => c.toLowerCase().includes(n.toLowerCase()))) return item[c];
    return '';
  };

  form.reset();
  idEmEdicao = pegarValor(['ID', 'id', 'Id']);
  idFormulario = lerIdFormulario(item) || (idEmEdicao ? String(idEmEdicao) : gerarIdFormulario());
  mostrarId();
  atualizarContadores();

  // Carrega dados de texto
  form.elements['regional'].value = pegarValor(['Regional', 'regional']);
  form.elements['area'].value = pegarValor(['Area', 'area', 'Área']);
  form.elements['problema'].value = pegarValor(['Problema', 'problema']);
  form.elements['causa'].value = pegarValor(['Causa', 'causa', 'Causa Raiz']);
  form.elements['plano'].value = pegarValor(['Plano', 'plano']);
  form.elements['responsavel'].value = pegarValor(['Responsavel', 'responsavel', 'Responsável']);
  form.elements['status'].value = pegarValor(['Status', 'status']) || 'Pendente de preenchimento';
  form.elements['comentario'].value = pegarValor(['Comentario', 'comentario', 'Comentário']);
  
  // Carrega as 4 datas (com fallback para os nomes antigos)
  const mapaDatas = {
    dataPrevisaoInicio:    ['DataPrevisaoInicio',    'dataPrevisaoInicio',    'PrevisaoInicio'],
    dataInicioReal:        ['DataInicioReal',        'dataInicioReal',        'InicioReal'],
    dataPrevisaoConclusao: ['DataPrevisaoConclusao', 'dataPrevisaoConclusao', 'PrevisaoConclusao', 'Prazo', 'prazo'],
    dataConclusaoReal:     ['DataConclusaoReal',     'dataConclusaoReal',     'ConclusaoReal',     'DataConclusao', 'dataConclusao']
  };

  Object.keys(mapaDatas).forEach(campo => {
    const valor = pegarValor(mapaDatas[campo]);
    if (valor && form.elements[campo]) form.elements[campo].value = String(valor).slice(0, 10);
  });

  // Muda a tela
  document.getElementById('tituloFormulario').textContent = 'Tratativa da Ocorrência';
  document.getElementById('camposExtras').style.display = 'block';
  document.getElementById('painelLista').style.display = 'none';
  document.querySelector('.layout').classList.add('sem-lista');
  
  // CONTROLE DE BOTÕES NA TELA DE TRATATIVA
  document.getElementById('btnVerLista').style.display = 'none';
  document.getElementById('btnEnviarOcorrencia').style.display = 'none';
  
  if (isAdmin) {
    document.getElementById('btnVoltarLista').style.display = 'inline-flex';
  } else {
    document.getElementById('btnVoltarLista').style.display = 'none';
  }

  // Regras de Bloqueio
  const situacao = String(pegarValor(['Situacao', 'situacao', 'Status', 'status'])).toLowerCase();
  
  form.querySelectorAll('.bloqueado').forEach(c => c.classList.remove('bloqueado'));
  form.querySelectorAll('input, select, textarea').forEach(c => { c.readOnly = false; c.disabled = false; });
  document.getElementById('avisoEdicao').hidden = true;

  if (!isAdmin) {
    const selectRegional = form.elements['regional'];
    selectRegional.classList.add('bloqueado');
    selectRegional.disabled = true;
  }

  if (situacao === 'pendente de preenchimento' || situacao === 'pendente') {
    ['regional', 'area', 'problema'].forEach(id => {
      const campo = form.elements[id];
      campo.classList.add('bloqueado');
      if (campo.tagName !== 'SELECT') campo.readOnly = true;
    });
    document.getElementById('textoAvisoEdicao').textContent = 'Os campos iniciais estão bloqueados. Preencha a tratativa.';
    document.getElementById('avisoEdicao').hidden = false;
    document.getElementById('btnConcluir').style.display = 'inline-flex';
  } else if (situacao === 'finalizado' || situacao === 'concluído') {
    ['regional', 'area', 'problema', 'causa', 'plano', 'responsavel',
     'dataPrevisaoInicio', 'dataInicioReal', 'dataPrevisaoConclusao', 'dataConclusaoReal'].forEach(id => {
      const campo = form.elements[id];
      campo.classList.add('bloqueado');
      if (campo.tagName !== 'SELECT') campo.readOnly = true;
    });
    document.getElementById('textoAvisoEdicao').textContent = 'Ocorrência finalizada. Apenas Status e Comentários podem ser alterados.';
    document.getElementById('avisoEdicao').hidden = false;
    document.getElementById('btnConcluir').style.display = 'inline-flex';
  } else {
    document.getElementById('btnConcluir').style.display = 'inline-flex';
  }

  const btnSalvar = document.getElementById('btnSalvarProgresso');
  const jaFinalizado = (situacao === 'finalizado' || situacao === 'concluído');
  btnSalvar.style.display = (!isAdmin && !jaFinalizado) ? 'inline-flex' : 'none';

  document.getElementById('formPlano').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ================= ENVIOS (CRIAR E CONCLUIR) =================
document.getElementById('btnVerLista').addEventListener('click', mostrarTelaLista);
document.getElementById('btnVoltarLista').addEventListener('click', mostrarTelaCriacao);
document.getElementById('btnAtualizar').addEventListener('click', () => carregarFormularios());

// ================= SALVAR PROGRESSO (REGIONAIS) =================
document.getElementById('btnSalvarProgresso').addEventListener('click', async function () {
  if (isAdmin || !idEmEdicao) return;

  const botao = this;
  const htmlOriginal = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = 'Salvando...';

  try {
    const campoStatus = form.elements['status'];
    if (campoStatus.value === 'Pendente de preenchimento') campoStatus.value = 'Em Andamento';

    await chamarFluxo({
      ...lerCampos(),
      acao: 'atualizar',
      id: idEmEdicao,
      idFormulario: idFormulario,
      situacao: 'Em Andamento'
    }, URL_SALVAR);

    alert('Progresso salvo com sucesso! A ocorrência continua em andamento.');
    carregarFormularios();
  } catch (erro) {
    console.error(erro);
    alert('Erro ao salvar o progresso: ' + erro.message);
  }

  botao.disabled = false;
  botao.innerHTML = htmlOriginal;
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  
  // Se for a tela de criação (Nova Ocorrência)
  if (isTelaCriacao) {
    if (!form.elements['regional'].value || !form.elements['area'].value || !form.elements['problema'].value) {
      alert('Preencha a Regional, Área e o Problema identificado.');
      return;
    }
    
    const botao = document.getElementById('btnEnviarOcorrencia');
    botao.disabled = true;
    botao.innerHTML = 'Enviando...';

    try {
      const resposta = await chamarFluxo({ 
        ...lerCampos(), 
        acao: 'criar', 
        idFormulario: idFormulario, 
        situacao: 'Pendente de preenchimento' 
      }, URL_SALVAR);
      
      if (resposta && resposta.sucesso === false) {
        alert(resposta.mensagem); 
      } else {
        alert('Ocorrência enviada com sucesso! O e-mail foi disparado para a Regional.');
        mostrarTelaLista();
      }
    } catch (erro) {
      console.error("ERRO COMPLETO:", erro);
      alert('Erro ao salvar: ' + erro.message);
    }
    botao.disabled = false;
    botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Ocorrência';
  } 
  // Se for a tela de Tratativa (Concluir)
  else {
    const botao = document.getElementById('btnConcluir');
    botao.disabled = true;
    botao.innerHTML = 'Salvando...';

    // VALIDAÇÃO DAS DATAS
    const dPrevisaoInicio    = form.elements['dataPrevisaoInicio'].value;
    const dInicioReal        = form.elements['dataInicioReal'].value;
    const dPrevisaoConclusao = form.elements['dataPrevisaoConclusao'].value;
    const dConclusaoReal     = form.elements['dataConclusaoReal'].value;

    const compara = (a, b, msg) => {
      if (a && b && a > b) { alert(msg); throw new Error(msg); }
    };

    try {
      compara(dPrevisaoInicio,    dPrevisaoConclusao, 'A previsão de início não pode ser depois da previsão de conclusão.');
      compara(dPrevisaoInicio,    dInicioReal,        'A previsão de início não pode ser depois do início real.');
      compara(dInicioReal,        dConclusaoReal,     'O início real não pode ser depois da conclusão real.');
      compara(dPrevisaoConclusao, dConclusaoReal,     'A previsão de conclusão não pode ser depois da conclusão real.');
    } catch (e) {
      botao.disabled = false;
      botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Concluir Tratativa';
      return;
    }

    try {
      await chamarFluxo({ 
        ...lerCampos(), 
        acao: 'atualizar', 
        id: idEmEdicao, 
        idFormulario: idFormulario, 
        situacao: 'Finalizado' 
      }, URL_SALVAR);
      alert('Tratativa concluída com sucesso!');
      mostrarTelaLista();
    } catch (erro) {
      console.error("ERRO COMPLETO:", erro);
      alert('Erro ao salvar tratativa: ' + erro.message);
    }
    botao.disabled = false;
    botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Concluir Tratativa';
  }
});

// Adiciona a animação do spinner no CSS
const style = document.createElement('style');
style.innerHTML = `@keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

// Inicia
idFormulario = gerarIdFormulario();
mostrarId();
atualizarContadores();
