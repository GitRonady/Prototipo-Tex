
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
      sessionStorage.setItem('usuarioAutenticado', dados.nome || email);
      liberarAcesso(dados.nome || email);
    } else {
      mostrarErroLogin(dados.mensagem || 'E-mail não encontrado ou conta inativa.');
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      mostrarErroLogin('O servidor demorou muito para responder. Tente novamente.');
    } else {
      mostrarErroLogin('Erro de conexão. Verifique sua internet.');
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
  
  const urlParams = new URLSearchParams(window.location.search);
  const idDaUrl = urlParams.get('id');
  
  if (idDaUrl) {
    setTimeout(() => {
      carregarFormularios(idDaUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 1000);
  } else {
    mostrarTelaCriacao();
  }
}

function mostrarErroLogin(msg) {
  loginErro.textContent = msg;
  loginErro.hidden = false;
}

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

function mostrarTelaCriacao() {
  isTelaCriacao = true;
  form.reset();
  idEmEdicao = null;
  idFormulario = gerarIdFormulario();
  mostrarId();
  atualizarContadores();
  
  form.querySelectorAll('.bloqueado').forEach(c => c.classList.remove('bloqueado'));
  form.querySelectorAll('input, select, textarea').forEach(c => c.readOnly = false);

  document.getElementById('tituloFormulario').textContent = 'Nova Ocorrência';
  document.getElementById('camposExtras').style.display = 'none'; 
  
  document.getElementById('campoResponsavel').style.display = 'none';
  document.getElementById('campoPrazo').style.display = 'none';
  
  document.getElementById('painelLista').style.display = 'none';
  document.querySelector('.layout').classList.add('sem-lista');
  
  document.getElementById('btnVerLista').style.display = 'inline-flex';
  document.getElementById('btnEnviarOcorrencia').style.display = 'inline-flex';
  document.getElementById('btnVoltarLista').style.display = 'none';
  document.getElementById('btnConcluir').style.display = 'none';
  
  document.getElementById('avisoEdicao').hidden = true;
}

function mostrarTelaLista() {
  isTelaCriacao = false;
  document.getElementById('painelLista').style.display = 'block'; 
  document.querySelector('.layout').classList.remove('sem-lista');
  
  document.getElementById('tituloFormulario').textContent = 'Detalhes da Ocorrência';
  document.getElementById('camposExtras').style.display = 'block';
  
  document.getElementById('campoResponsavel').style.display = 'block';
  document.getElementById('campoPrazo').style.display = 'block';
  
  document.getElementById('btnVerLista').style.display = 'none';
  document.getElementById('btnEnviarOcorrencia').style.display = 'none';
  document.getElementById('btnVoltarLista').style.display = 'inline-flex';
  
  carregarFormularios();
}

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
    const res = await chamarFluxo({ acao: 'listar' }, URL_LISTAR);
    const dadosBrutos = res.value || res.itens || res;
    todosOsItens = dadosBrutos.filter(item => item && (JSON.stringify(item).includes('problema') || JSON.stringify(item).includes('Problema')));
    todosOsItens.sort((a, b) => Number(b.ID || b.id || 0) - Number(a.ID || a.id || 0));

    if (idParaAbrir) {
      const item = todosOsItens.find(i => lerIdFormulario(i) === idParaAbrir);
      if (item) {
        abrirFormulario(item);
      } else {
        alert('Ocorrência não encontrada.');
        mostrarTelaCriacao();
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

  let itensFiltrados = todosOsItens;
  if (filtroAtual === 'pendente') itensFiltrados = todosOsItens.filter(i => pegarValor(i, ['Situacao', 'situacao', 'Status', 'status']) !== 'Finalizado');
  else if (filtroAtual === 'finalizado') itensFiltrados = todosOsItens.filter(i => pegarValor(i, ['Situacao', 'situacao', 'Status', 'status']) === 'Finalizado');

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

function formatarData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

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

  form.elements['regional'].value = pegarValor(['Regional', 'regional']);
  form.elements['area'].value = pegarValor(['Area', 'area', 'Área']);
  form.elements['problema'].value = pegarValor(['Problema', 'problema']);
  form.elements['causa'].value = pegarValor(['Causa', 'causa', 'Causa Raiz']);
  form.elements['plano'].value = pegarValor(['Plano', 'plano']);
  form.elements['responsavel'].value = pegarValor(['Responsavel', 'responsavel', 'Responsável']);
  form.elements['status'].value = pegarValor(['Status', 'status']) || 'Pendente de preenchimento';
  form.elements['comentario'].value = pegarValor(['Comentario', 'comentario', 'Comentário']);
  
  const prazo = pegarValor(['Prazo', 'prazo']);
  if (prazo) form.elements['prazo'].value = String(prazo).slice(0, 10);
  const dataConc = pegarValor(['DataConclusao', 'dataConclusao']);
  if (dataConc) form.elements['dataConclusao'].value = String(dataConc).slice(0, 10);

  document.getElementById('tituloFormulario').textContent = 'Tratativa da Ocorrência';
  document.getElementById('camposExtras').style.display = 'block';
  
  document.getElementById('campoResponsavel').style.display = 'block';
  document.getElementById('campoPrazo').style.display = 'block';
  
  document.getElementById('painelLista').style.display = 'none';
  document.querySelector('.layout').classList.add('sem-lista');
  
  document.getElementById('btnVerLista').style.display = 'none';
  document.getElementById('btnEnviarOcorrencia').style.display = 'none';
  document.getElementById('btnVoltarLista').style.display = 'inline-flex';

  const situacao = String(pegarValor(['Situacao', 'situacao', 'Status', 'status'])).toLowerCase();
  
  form.querySelectorAll('.bloqueado').forEach(c => c.classList.remove('bloqueado'));
  form.querySelectorAll('input, select, textarea').forEach(c => c.readOnly = false);
  document.getElementById('avisoEdicao').hidden = true;

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
    ['regional', 'area', 'problema', 'causa', 'plano', 'responsavel', 'prazo'].forEach(id => {
      const campo = form.elements[id];
      campo.classList.add('bloqueado');
      if (campo.tagName !== 'SELECT') campo.readOnly = true;
    });
    document.getElementById('textoAvisoEdicao').textContent = 'Ocorrência finalizada. Apenas o Status e Comentários podem ser alterados.';
    document.getElementById('avisoEdicao').hidden = false;
    document.getElementById('btnConcluir').style.display = 'inline-flex';
  } else {
    document.getElementById('btnConcluir').style.display = 'inline-flex';
  }

  document.getElementById('formPlano').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('btnVerLista').addEventListener('click', mostrarTelaLista);
document.getElementById('btnVoltarLista').addEventListener('click', mostrarTelaCriacao);
document.getElementById('btnAtualizar').addEventListener('click', () => carregarFormularios());

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  
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
      alert('Erro ao salvar. Verifique a conexão.');
    }
    botao.disabled = false;
    botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Ocorrência';
  } 
  else {
    if (!form.elements['responsavel'].value) {
      alert('Preencha o Responsável pela Execução.');
      return;
    }
    
    const botao = document.getElementById('btnConcluir');
    botao.disabled = true;
    botao.innerHTML = 'Salvando...';

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
      alert('Erro ao salvar tratativa.');
    }
    botao.disabled = false;
    botao.innerHTML = '<svg class="ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Concluir Tratativa';
  }
});

const style = document.createElement('style');
style.innerHTML = `@keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

idFormulario = gerarIdFormulario();
mostrarId();
atualizarContadores();
