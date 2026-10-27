const URL_SALVAR = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/13/workflows/348016b3bde54a47b4159b6b45544cba/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=NlhP96NiVsK85m-VTk7gLW9qbFpsnTqMR-YP6R5ZO60';
const URL_LISTAR = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/23/workflows/3fbf1a2a119441dabcb8c284dcae4cfe/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OdpmDoJPfT2zixNtGYBbnkZJkWrhs2pyVKgk1oPtOUI';

const form = document.getElementById('formPlano');
const ICONE_CALENDARIO = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>';

let idEmEdicao = null;
let todosOsItens = [];
let filtroAtual = 'todos';

const POR_PAGINA = 5;
let paginaAtual = 1;

let idFormulario = '';


const CAMPOS_FIXOS_CONCLUIDO = ['area', 'problema', 'causa', 'plano', 'responsavel', 'prazo'];
let formularioConcluido = false;
let dadosOriginais = null;

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
form.addEventListener('input', atualizarContadores);
form.addEventListener('input', e => e.target.classList.remove('faltando'));

document.querySelectorAll('.filtros button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filtros button').forEach(b => b.classList.remove('ativo'));
    e.target.classList.add('ativo');
    filtroAtual = e.target.dataset.filtro;
    paginaAtual = 1;
    desenharLista();
  });
});

function formatarData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d)) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

async function carregarFormularios() {
  const lista = document.getElementById('listaFormularios');
  lista.innerHTML = '<p class="vazio">Carregando...</p>';
  try {
    const res = await chamarFluxo({ acao: 'listar' }, URL_LISTAR);
    const dadosBrutos = res.value || res.itens || res;

    todosOsItens = dadosBrutos.filter(item => {
      if (!item) return false;
      const texto = JSON.stringify(item);
      return texto.includes('problema') || texto.includes('Problema') || texto.includes('area') || texto.includes('Area');
    });

    todosOsItens.sort((a, b) => Number(b.ID || b.id || 0) - Number(a.ID || a.id || 0));

    if (!idEmEdicao && todosOsItens.some(item => lerIdFormulario(item) === idFormulario)) {
      idFormulario = gerarIdFormulario();
      mostrarId();
    }

    desenharLista();
  } catch (erro) {
    console.error(erro);
    lista.innerHTML = '<p class="vazio">Não foi possível carregar a lista.</p>';
  }
}

function desenharLista() {
  const lista = document.getElementById('listaFormularios');
  lista.innerHTML = '';

  const pegarValor = (item, nomesPossiveis) => {
    for (let nome of nomesPossiveis) {
      if (item[nome] !== undefined && item[nome] !== null && String(item[nome]).trim() !== '') {
        return item[nome];
      }
    }
    const chaves = Object.keys(item);
    for (let chave of chaves) {
      if (nomesPossiveis.some(nome => chave.toLowerCase().includes(nome.toLowerCase()))) {
        if (item[chave] !== undefined && item[chave] !== null && String(item[chave]).trim() !== '') {
          return item[chave];
        }
      }
    }
    return null;
  };

  let itensFiltrados = todosOsItens;
  if (filtroAtual === 'pendente') {
    itensFiltrados = todosOsItens.filter(item => {
      const status = pegarValor(item, ['Situacao', 'situacao', 'Status', 'status']) || 'Pendente';
      return status !== 'Finalizado';
    });
  } else if (filtroAtual === 'finalizado') {
    itensFiltrados = todosOsItens.filter(item => {
      const status = pegarValor(item, ['Situacao', 'situacao', 'Status', 'status']);
      return status === 'Finalizado';
    });
  }

  if (itensFiltrados.length === 0) {
    lista.innerHTML = '<p class="vazio">Nenhum formulário encontrado.</p>';
    return;
  }

  const totalPaginas = Math.ceil(itensFiltrados.length / POR_PAGINA);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const itensDaPagina = itensFiltrados.slice(inicio, inicio + POR_PAGINA);

  itensDaPagina.forEach(item => {
    const idItem = pegarValor(item, ['ID', 'id', 'Id']) || 'N/A';
    const statusItem = pegarValor(item, ['Situacao', 'situacao', 'Status', 'status']) || 'Pendente';
    const problemaItem = pegarValor(item, ['Problema', 'problema']) || 'Sem problema descrito';
    const areaItem = pegarValor(item, ['Area', 'area', 'Área', 'área']) || 'não definida';

    const cartao = criar('div', 'item' + (String(idItem) === String(idEmEdicao) ? ' ativo' : ''));

    const info = criar('div');
    const isFinalizado = String(statusItem).toLowerCase() === 'finalizado';

    const badge = criar('span', 'badge ' + (isFinalizado ? 'finalizado' : 'pendente'), isFinalizado ? 'Concluído' : 'Incompleto');

    info.append(
      badge,
      criar('strong', '', String(problemaItem).length > 45 ? String(problemaItem).slice(0, 45) + '...' : String(problemaItem)),
      criar('p', '', 'Área: ' + areaItem + '  •  ID: ' + (lerIdFormulario(item) || idItem))
    );

    const data = formatarData(pegarValor(item, ['criadoEm', 'CriadoEm', 'Data']));
    if (data) {
      const linhaData = criar('p', 'data');
      linhaData.insertAdjacentHTML('beforeend', ICONE_CALENDARIO);
      linhaData.append(data);
      info.append(linhaData);
    }
    const prazo = pegarValor(item, ['Prazo', 'prazo', 'Prazo Previsto']);
    if (prazo) {
      const linhaPrazo = criar('p', 'data');
      linhaPrazo.insertAdjacentHTML('beforeend', ICONE_CALENDARIO);
      const dataFormatada = new Date(prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      linhaPrazo.append('Prazo: ' + dataFormatada);
      info.append(linhaPrazo);
    }
    
    const dataConclusao = pegarValor(item, ['DataConclusao', 'dataConclusao', 'Data de Conclusão']);
    if (dataConclusao) {
      const linhaConclusao = criar('p', 'data');
      linhaConclusao.insertAdjacentHTML('beforeend', ICONE_CALENDARIO);
      const dataFormatada = new Date(dataConclusao).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      linhaConclusao.append('Concluído em: ' + dataFormatada);
      info.append(linhaConclusao);
    }
    const botao = criar('button', 'b-azul', isFinalizado ? 'Visualizar' : 'Continuar');
    botao.type = 'button';
    botao.addEventListener('click', () => abrirFormulario(item));

    cartao.append(info, botao);
    lista.appendChild(cartao);
  });

  if (totalPaginas > 1) {
    const nav = criar('div', 'paginacao');

    const anterior = criar('button', '', '← Anterior');
    anterior.type = 'button';
    anterior.disabled = paginaAtual === 1;
    anterior.addEventListener('click', () => { paginaAtual--; desenharLista(); });

    const texto = criar('span', '', 'Página ' + paginaAtual + ' de ' + totalPaginas);

    const proxima = criar('button', '', 'Próxima →');
    proxima.type = 'button';
    proxima.disabled = paginaAtual === totalPaginas;
    proxima.addEventListener('click', () => { paginaAtual++; desenharLista(); });

    nav.append(anterior, texto, proxima);
    lista.appendChild(nav);
  }
}

function lerIdFormulario(item) {
  for (const chave of Object.keys(item)) {
    if (chave.toLowerCase().replace(/[^a-z]/g, '') === 'idformulario' && item[chave]) {
      return String(item[chave]);
    }
  }
  return '';
}

function gerarIdFormulario() {
  let id;
  do {
    id = String(Math.floor(100000 + Math.random() * 900000));
  } while (todosOsItens.some(item => lerIdFormulario(item) === id));
  return id;
}

const ORDEM_CAMPOS = ['area', 'problema', 'causa', 'plano', 'responsavel', 'prazo', 'dataConclusao', 'comentario'];
const OBRIGATORIOS = ['area', 'problema', 'causa', 'plano', 'responsavel'];

const CAMPOS_TRAVAVEIS = ['area', 'problema', 'causa', 'plano', 'responsavel', 'prazo', 'dataConclusao'];


function limparAvisoEdicao() {
  document.getElementById('avisoEdicao').hidden = true;
  document.getElementById('textoAvisoEdicao').textContent = '';
}

function salvarIdStorage(id) {
  try { sessionStorage.setItem('idFormulario', id); } catch (e) {}
}

function limparBloqueios() {
  form.querySelectorAll('.bloqueado, .faltando').forEach(c => {
    c.classList.remove('bloqueado', 'faltando');
    if (c.tagName !== 'SELECT') c.readOnly = false;
    c.removeAttribute('tabindex');
  });
  formularioConcluido = false;
  dadosOriginais = null;
  document.getElementById('btnIncompleto').style.display = '';
  document.getElementById('btnConcluir').lastChild.textContent = ' Concluir formulário';
}

function destravarCampos() {
  if (formularioConcluido) return; 
  limparBloqueios();
}

function aplicarBloqueioConcluido() {
  formularioConcluido = true;
  dadosOriginais = lerCampos(); 

  CAMPOS_FIXOS_CONCLUIDO.forEach(nome => {
    const campo = form.elements[nome];
    campo.classList.remove('faltando');
    campo.classList.add('bloqueado');
    if (campo.tagName !== 'SELECT') campo.readOnly = true;
    campo.tabIndex = -1;
  });

 
  document.getElementById('btnIncompleto').style.display = 'none';
  document.getElementById('btnConcluir').lastChild.textContent = ' Salvar alterações';

  document.getElementById('textoAvisoEdicao').textContent =
    'Formulário ID ' + idFormulario + ' concluído. Somente Status, Data de conclusão e Comentário podem ser alterados.';
  document.getElementById('avisoEdicao').hidden = false;
  document.getElementById('btnLiberar').hidden = true;
}

function aplicarRegrasDeBloqueio() {
  ['area', 'problema'].forEach(nome => {
    const campo = form.elements[nome];
    if (campo.value.trim() !== '') {
      campo.classList.add('bloqueado');
      if (campo.tagName !== 'SELECT') campo.readOnly = true;
      campo.tabIndex = -1;
    } else {
      campo.classList.remove('bloqueado');
      if (campo.tagName !== 'SELECT') campo.readOnly = false;
      campo.removeAttribute('tabindex');
    }
  });

  ['causa', 'plano', 'responsavel'].forEach(nome => {
    const campo = form.elements[nome];
    if (campo.value.trim() === '') {
      campo.classList.add('faltando');
    } else {
      campo.classList.remove('faltando');
    }
  });
}

function focarOndeParou() {
  limparAvisoEdicao();
  aplicarRegrasDeBloqueio();

  const primeiroVazio = ORDEM_CAMPOS.find(nome => form.elements[nome].value.trim() === '');
  const alvo = form.elements[primeiroVazio || 'comentario'];

  const aviso = document.getElementById('avisoEdicao');
  document.getElementById('textoAvisoEdicao').textContent = 'Continuando o formulário ID ' + idFormulario + '. Os campos em cinza estão bloqueados. Os campos em amarelo precisam ser preenchidos.';
  aviso.hidden = false;

  document.getElementById('btnLiberar').hidden = true;

  alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  alvo.focus({ preventScroll: true });
}

function mostrarId() {
  document.getElementById('idForm').textContent = idFormulario;
}

function abrirFormulario(item) {
  form.reset();
  limparBloqueios();

  const pegarValor = (nomes) => {
    for (let nome of nomes) {
      if (item[nome] !== undefined && item[nome] !== null && String(item[nome]).trim() !== '') {
        return item[nome];
      }
    }

    const chaves = Object.keys(item);
    for (let chave of chaves) {
      if (nomes.some(nome => chave.toLowerCase().includes(nome.toLowerCase()))) {
        if (item[chave] !== undefined && item[chave] !== null && String(item[chave]).trim() !== '') {
          return item[chave];
        }
      }
    }
    return '';
  };

  form.elements['area'].value = pegarValor(['Area', 'area', 'Área', 'área']);
  form.elements['problema'].value = pegarValor(['Problema', 'problema']);
  form.elements['causa'].value = pegarValor(['Causa', 'causa', 'Causa Raiz']);
  form.elements['plano'].value = pegarValor(['Plano', 'plano', 'Plano de ação', 'Plano de acao']);
  form.elements['responsavel'].value = pegarValor(['Responsavel', 'responsavel', 'Responsável']);
  form.elements['status'].value = pegarValor(['Status', 'status']) || 'Aberto';
  form.elements['comentario'].value = pegarValor(['Comentario', 'comentario', 'Comentário']);

  const prazo = pegarValor(['Prazo', 'prazo', 'Prazo Previsto']);
  if (prazo) form.elements['prazo'].value = String(prazo).slice(0, 10);

  const dataConclusao = pegarValor(['DataConclusao', 'dataConclusao', 'Data de Conclusão']);
  if (dataConclusao) form.elements['dataConclusao'].value = String(dataConclusao).slice(0, 10);

  idEmEdicao = pegarValor(['ID', 'id', 'Id']);
  idFormulario = lerIdFormulario(item) || (idEmEdicao ? String(idEmEdicao) : gerarIdFormulario());

  salvarIdStorage(idFormulario);

  mostrarId();
  atualizarContadores();
  desenharLista();

  const situacao = String(pegarValor(['Situacao', 'situacao'])).toLowerCase();
  if (situacao === 'finalizado') {
    aplicarBloqueioConcluido();
  } else {
    focarOndeParou(); 
  }
}

function novoFormulario() {
  form.reset();
  limparBloqueios();
  
  limparAvisoEdicao();
  idEmEdicao = null;
  idFormulario = gerarIdFormulario();
  salvarIdStorage(idFormulario);
  mostrarId();
  atualizarContadores();
  desenharLista();
}

document.getElementById('btnNovo').addEventListener('click', novoFormulario);
document.getElementById('btnLiberar').addEventListener('click', () => {
  destravarCampos();
  document.getElementById('btnLiberar').hidden = true;
});
document.getElementById('btnAtualizar').addEventListener('click', carregarFormularios);

document.getElementById('btnIncompleto').addEventListener('click', async function () {
  const dados = lerCampos();
  if (!dados.area && !dados.problema) {
    alert('Preencha pelo menos a área ou o problema.');
    return;
  }
  this.disabled = true;
  try {
    await chamarFluxo({ ...dados, acao: idEmEdicao ? 'atualizar' : 'criar', id: idEmEdicao, idFormulario: idFormulario, situacao: 'Pendente' }, URL_SALVAR);
    alert('Formulário salvo como incompleto.');
    aplicarRegrasDeBloqueio();

    carregarFormularios();
  } catch (erro) {
    console.error(erro);
    alert('Não foi possível salvar. Tente novamente.');
  }
  this.disabled = false;
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const botao = document.getElementById('btnConcluir');
  botao.disabled = true;
  try {
    const dados = formularioConcluido
      ? {
          ...dadosOriginais,
          status: form.elements['status'].value,
          dataConclusao: form.elements['dataConclusao'].value,
          comentario: form.elements['comentario'].value
        }
      : lerCampos();

    await chamarFluxo({ ...dados, acao: idEmEdicao ? 'atualizar' : 'criar', id: idEmEdicao, idFormulario: idFormulario, situacao: 'Finalizado' }, URL_SALVAR);
    alert(formularioConcluido ? 'Alterações salvas com sucesso!' : 'Plano de ação salvo com sucesso!');
    if (!formularioConcluido) aplicarRegrasDeBloqueio();

    carregarFormularios();
  } catch (erro) {
    console.error('Erro:', erro);
    alert('Erro ao salvar. Verifique o console.');
  }
  botao.disabled = false;
});

idFormulario = gerarIdFormulario();
mostrarId();
atualizarContadores();
carregarFormularios();

const URL_VALIDAR_USUARIO = 'https://defaultb61d49822acd47e681e86b2c66e20b.13.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/08/workflows/b299d152bc6b4bc2a1865e21ab01b5fb/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5z2scHhFAcu_y4_t8jARTGu4cZNyH5dqPuiR_oV69XQ';


const DOMINIO_PERMITIDO = '@totalexpress.com.br';

const telaLogin  = document.getElementById('telaLogin');
const formLogin  = document.getElementById('formLogin');
const loginEmail = document.getElementById('loginEmail');
const loginErro  = document.getElementById('loginErro');


const usuarioSalvo = sessionStorage.getItem('usuarioAutenticado');
if (usuarioSalvo) {
  liberarAcesso(usuarioSalvo);
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
  botao.textContent = 'Verificando...';
  loginErro.hidden = true;

  try {
    const resp = await fetch(URL_VALIDAR_USUARIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    const dados = await resp.json();

    if (dados.valido) {
      sessionStorage.setItem('usuarioAutenticado', dados.nome || email);
      liberarAcesso(dados.nome || email);
    } else {
      mostrarErroLogin(dados.mensagem || 'E-mail não encontrado ou conta inativa.');
    }
  } catch (err) {
    console.error('Erro na validação:', err);
    mostrarErroLogin('Erro ao verificar o e-mail. Tente novamente em instantes.');
  } finally {
    botao.disabled = false;
    botao.innerHTML = textoOriginal;
  }
});

function liberarAcesso(nomeUsuario) {
  telaLogin.hidden = true;
  console.log('✅ Acesso liberado para:', nomeUsuario);
 
}

function mostrarErroLogin(msg) {
  loginErro.textContent = msg;
  loginErro.hidden = false;
}

