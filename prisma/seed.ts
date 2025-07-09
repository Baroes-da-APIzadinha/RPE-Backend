import { PrismaClient, Prisma, avaliacaoTipo, preenchimentoStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o processo de seed...');

  await seedCriterios();

  const dataPath = path.join(__dirname, 'data');
  const files = fs.readdirSync(dataPath).filter(file => file.endsWith('.XLSX'));

  if (files.length === 0) {
    console.log('Nenhum arquivo .xlsx encontrado na pasta prisma/data. Encerrando.');
    return;
  }
  console.log(`🔍 Encontrados ${files.length} arquivos para processar...`);

  for (const file of files) {
    await processarPlanilha(path.join(dataPath, file));
  }

  console.log('\nProcesso de seed concluído com sucesso!');
}

async function processarPlanilha(filePath: string) {
  console.log(`\n--- Processando: ${path.basename(filePath)} ---`);
  const workbook = xlsx.readFile(filePath);

  // --- 1. PROCESSAR ABA 'Perfil' ---
  const perfilSheet = workbook.Sheets['Perfil'];
  if (!perfilSheet) {
    console.warn(`Aba 'Perfil' não encontrada em ${filePath}. Pulando este arquivo.`);
    return;
  }
  const perfilData = xlsx.utils.sheet_to_json(perfilSheet) as any[];
  const perfil = perfilData[0]; 

  if (!perfil || !perfil.Email) {
    console.warn(`Email não encontrado na aba 'Perfil' de ${filePath}. Pulando.`);
    return;
  }
  if (!perfil['Nome ( nome.sobrenome )']) {
    console.warn(`Nome ( nome.sobrenome ) não encontrado na aba 'Perfil' de ${filePath}. Pulando.`);
    return;
  }
  if (!perfil['Unidade']) {
    console.warn(`Unidade não encontrada na aba 'Perfil' de ${filePath}. Pulando.`);
    return;
  }

  // Cria ou atualiza o colaborador pelo email (único)
  const colaboradorExistente = await prisma.colaborador.findUnique({ where: { email: perfil.Email } });
  let colaborador;
  if (colaboradorExistente) {
    colaborador = await prisma.colaborador.update({
      where: { email: perfil.Email },
      data: {
        nomeCompleto: perfil['Nome ( nome.sobrenome )'],
        unidade: perfil['Unidade'],
      },
    });
  } else {
    colaborador = await prisma.colaborador.create({
      data: {
        nomeCompleto: perfil['Nome ( nome.sobrenome )'],
        email: perfil.Email,
        unidade: perfil['Unidade'],
        senha: 'senha123', 
      },
    });
  }
  console.log(`Colaborador garantido no banco: ${colaborador.nomeCompleto} (${colaborador.unidade})`);

  // --- 2. PROCESSAR CICLO ---
  const cicloNome = perfil['Ciclo (ano.semestre)'];
  if (!cicloNome) {
    console.warn(`Nome do ciclo não encontrado na aba 'Perfil' de ${filePath}. Pulando.`);
    return;
  }

  const ciclo = await prisma.cicloAvaliacao.findFirst({ where: { nomeCiclo: cicloNome } });
  let cicloId: string;
  let cicloObj;
  if (!ciclo) {
    let ano = '2024';
    const match = cicloNome.match(/(\d{4})/);
    if (match) ano = match[1];
    const novoCiclo = await prisma.cicloAvaliacao.create({
      data: {
        nomeCiclo: cicloNome,
        dataInicio: new Date(`${ano}-01-01`),
        dataFim: new Date(`${ano}-03-31`),
        status: 'FECHADO',
        duracaoEmAndamentoDias: 31,
        duracaoEmRevisaoDias: 30,
        duracaoEmEqualizacaoDias: 30,
      },
    });
    cicloId = novoCiclo.idCiclo;
    cicloObj = novoCiclo;
  } else {
    cicloId = ciclo.idCiclo;
    cicloObj = ciclo;
  }
  console.log(`  - Ciclo: ${cicloId} [OK]`);

  await prisma.colaboradorCiclo.upsert({
      where: { idColaborador_idCiclo: { idColaborador: colaborador.idColaborador, idCiclo: cicloId } },
      update: {},
      create: { idColaborador: colaborador.idColaborador, idCiclo: cicloId }
  });

  // --- 3. PROCESSAR A ABA 'Autoavaliação' ---
  const respostasAuto = extrairDadosDaAba(workbook, 'Autoavaliação');
  if (respostasAuto.length > 0) {
    await criarAutoAvaliacaoComCards(cicloId, colaborador.idColaborador, respostasAuto);
    console.log(`  - Autoavaliação importada.`);
  }

  // --- 4. PROCESSAR A ABA 'Avaliação 360' ---
  const respostas360 = extrairDadosDaAba(workbook, 'Avaliação 360');
  if (respostas360.length > 0) {
    const avaliacoesPorAvaliado = agruparPorChave(respostas360, 'EMAIL DO AVALIADO ( nome.sobrenome )');
    for (const emailAvaliado in avaliacoesPorAvaliado) {
      if (!emailAvaliado || emailAvaliado === 'undefined') continue;
      const avaliado = await prisma.colaborador.upsert({
        where: { email: emailAvaliado },
        update: {},
        create: {
          nomeCompleto: `Avaliado - ${emailAvaliado}`,
          email: emailAvaliado,
          unidade: 'Desconhecida',
          senha: 'senha123', 
        },
      });
      const dadosAvaliacao = avaliacoesPorAvaliado[emailAvaliado];
      for (const linha of dadosAvaliacao) {
        const nomeProjeto = linha['PROJETO EM QUE ATUARAM JUNTOS - OBRIGATÓRIO TEREM ATUADOS JUNTOS'];
        const periodo = linha['PERÍODO'];
        let diasTrabalhadosJuntos = 0;
        if (periodo && typeof periodo === 'string') {
          // Espera-se formato tipo "45 dias" ou só número
          const match = periodo.match(/(\d+)/);
          if (match) diasTrabalhadosJuntos = parseInt(match[1], 10);
        }
        if (nomeProjeto && cicloObj) {
          const projeto = await upsertProjeto(nomeProjeto);
          await upsertAlocacao(avaliado.idColaborador, projeto.idProjeto, cicloObj.dataInicio, cicloObj.dataFim);
          await upsertAlocacao(colaborador.idColaborador, projeto.idProjeto, cicloObj.dataInicio, cicloObj.dataFim);
          // Cria ou atualiza o par com diasTrabalhadosJuntos
          await prisma.pares.upsert({
            where: {
              idColaborador1_idColaborador2_idCiclo: {
                idColaborador1: colaborador.idColaborador,
                idColaborador2: avaliado.idColaborador,
                idCiclo: cicloId,
              },
            },
            update: { idProjeto: projeto.idProjeto, diasTrabalhadosJuntos },
            create: {
              idColaborador1: colaborador.idColaborador,
              idColaborador2: avaliado.idColaborador,
              idCiclo: cicloId,
              idProjeto: projeto.idProjeto,
              diasTrabalhadosJuntos,
            },
          });
        }
      }
      await criarAvaliacaoDePares(cicloId, avaliado.idColaborador, colaborador.idColaborador, dadosAvaliacao);
      console.log(`  - Avaliação 360 para ${emailAvaliado} importada.`);
    }
  }

  // --- 5. Processar Pesquisa de Referências ---
  const referencias = extrairDadosDaAba(workbook, 'Pesquisa de Referências');
  if (referencias.length > 0) {
    let refsCriadas = 0;
    for (const ref of referencias) {
      // Busca a coluna de e-mail de referência de forma flexível
      const nomeColunaEmailReferencia = Object.keys(ref).find(k => k.replace(/\s+/g, ' ').toLowerCase().includes('email da referência'));
      const emailIndicado = nomeColunaEmailReferencia ? ref[nomeColunaEmailReferencia] : undefined;
      const justificativa = ref['JUSTIFICATIVA'];
      /* const referencias = extrairDadosDaAba(workbook, 'Pesquisa de Referências');
      console.log('Colunas da aba Pesquisa de Referências:', referencias[0] ? Object.keys(referencias[0]) : 'Sem dados');
      console.log('Primeira linha:', referencias[0]);*/ 

      if (!emailIndicado) continue;

      try {
        // Garante que a pessoa indicada (a referência) exista no banco
        const indicado = await prisma.colaborador.upsert({
          where: { email: emailIndicado },
          update: {},
          create: {
            nomeCompleto: `Indicado - ${emailIndicado}`,
            email: emailIndicado,
            unidade: 'Desconhecida',
            senha: 'senha123',
          },
        });
        // Garante que ciclo existe
        if (!ciclo) throw new Error('Ciclo não encontrado para referência.');
        // Cria o registro na tabela de indicações
        await prisma.indicacaoReferencia.create({
          data: {
            idCiclo: ciclo.idCiclo,
            idIndicador: colaborador.idColaborador, // Quem indica
            idIndicado: indicado.idColaborador,   // Quem é indicado
            tipo: 'GERAL', // Tipo padrão, já que não vem da planilha
            justificativa: justificativa || 'Nenhuma justificativa fornecida.',
          }
        });
        refsCriadas++;
      } catch (error) {
        console.error(`  - ❌ Falha ao criar Indicação de Referência para ${emailIndicado}. Erro:`, error);
      }
    }
    console.log(`  - ✔️ ${refsCriadas} Indicações de Referência importadas.`);
  }
}

async function seedCriterios() {
  console.log('✅ Garantindo a existência dos critérios base (nova nomenclatura)...');

  const criteriosNovos = [
    { nome: 'Organização no Trabalho', pilar: 'Comportamento' },
    { nome: 'Atender aos prazos', pilar: 'Execucao' },
    { nome: 'Sentimento de Dono', pilar: 'Comportamento' },
    { nome: 'Resiliência nas adversidades', pilar: 'Comportamento' },
    { nome: 'Capacidade de aprender', pilar: 'Comportamento' },
    { nome: 'Ser "team player"', pilar: 'Comportamento' },
    { nome: 'Fazer mais com menos', pilar: 'Execucao' },
    { nome: 'Entregar com qualidade', pilar: 'Execucao' },
    { nome: 'Pensar fora da caixa', pilar: 'Execucao' },
    { nome: 'Gente', pilar: 'Gestao_e_Lideranca' },
    { nome: 'Resultados', pilar: 'Gestao_e_Lideranca' },
    { nome: 'Evolução da Rocket Corp', pilar: 'Gestao_e_Lideranca' },
  ];

  for (const crit of criteriosNovos) {
    await prisma.criterioAvaliativo.upsert({
      where: { nomeCriterio: crit.nome },
      update: {},
      create: {
        nomeCriterio: crit.nome,
        pilar: crit.pilar as any,
      },
    });
  }
  console.log(`  - ${criteriosNovos.length} critérios garantidos no banco de dados.`);
}

function agruparPorChave(array: any[], chave: string) {
  return array.reduce((acc, obj) => {
    const valorChave = obj[chave];
    if (!acc[valorChave]) acc[valorChave] = [];
    acc[valorChave].push(obj);
    return acc;
  }, {});
}

const MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS = {
  'Organização': 'Organização no Trabalho',
  'Imagem': 'Atender aos prazos', 
  'Iniciativa': 'Sentimento de Dono', 
  'Comprometimento': 'Resiliência nas adversidades',
  'Flexibilidade': 'Resiliência nas adversidades',
  'Aprendizagem Contínua': 'Capacidade de aprender',
  'Trabalho em Equipe': 'Ser "team player"',
  'Relacionamento Inter-Pessoal': 'Ser "team player"',
  'Produtividade': 'Fazer mais com menos',
  'Qualidade': 'Entregar com qualidade',
  'Foco no Cliente': 'Entregar com qualidade',
  'Criatividade e Inovação': 'Pensar fora da caixa',
  'Gestão de Pessoas*': 'Gente',
  'Gestão de Projetos*': 'Resultados',
  'Gestão Organizacional*': 'Evolução da Rocket Corp',
  'Novos Clientes**': 'Evolução da Rocket Corp',
  'Novos Projetos**': 'Evolução da Rocket Corp',
  'Novos Produtos ou Serviços**': 'Evolução da Rocket Corp',
};

// --- FUNÇÕES AUXILIARES ---

function extrairDadosDaAba(workbook: xlsx.WorkBook, nomeAba: string): any[] {
  const sheet = workbook.Sheets[nomeAba];
  return sheet ? xlsx.utils.sheet_to_json(sheet) : [];
}

async function upsertProjeto(nomeProjeto: string) {
  return prisma.projeto.upsert({
    where: { nomeProjeto }, // nomeProjeto é @unique no schema.prisma
    update: {},
    create: {
      nomeProjeto,
      status: 'CONCLUIDO', // ou outro status padrão
    },
  });
}

async function upsertAlocacao(idColaborador: string, idProjeto: string, dataEntrada: Date, dataFim: Date) {
  const alocacaoExistente = await prisma.alocacaoColaboradorProjeto.findFirst({
    where: { idColaborador, idProjeto },
  });
  if (!alocacaoExistente) {
    await prisma.alocacaoColaboradorProjeto.create({
      data: {
        idColaborador,
        idProjeto,
        dataEntrada,
        dataSaida: dataFim,
      },
    });
  }
}

async function criarAutoAvaliacaoComCards(cicloId: string, colaboradorId: string, linhasDaPlanilha: any[]) {
  try {
    await prisma.$transaction(async (tx) => {
      const avaliacao = await tx.avaliacao.create({
        data: {
          idCiclo: cicloId, idAvaliado: colaboradorId, idAvaliador: colaboradorId,
          tipoAvaliacao: 'AUTOAVALIACAO', status: 'CONCLUIDA',
        },
      });
      await tx.autoAvaliacao.create({ data: { idAvaliacao: avaliacao.idAvaliacao } });

      let cardsCriados = 0;
      for (const linha of linhasDaPlanilha) {
        const nomeAntigo = linha['CRITÉRIO'];
        const notaRaw = linha['AUTO-AVALIAÇÃO'];
        const nomeColunaJustificativa = Object.keys(linha).find(k => k.replace(/\s+/g, ' ').trim().toLowerCase().includes('dados e fatos da auto-avaliação') || k.replace(/\s+/g, ' ').trim().toLowerCase().includes('justificativa'));
        const justificativa = nomeColunaJustificativa ? linha[nomeColunaJustificativa] : undefined;
        if (!nomeAntigo || !notaRaw) continue;

        const notaNumerica = parseInt(notaRaw, 10);
        if (isNaN(notaNumerica)) {
          console.warn(`    - ⚠️ Nota inválida ("${notaRaw}") para o critério "${nomeAntigo}". Card não criado.`);
          continue;
        }

        const nomeNovo = MAPA_CRITERIOS_ANTIGOS_PARA_NOVOS[nomeAntigo];
        if (!nomeNovo) {
          console.warn(`    - ⚠️ Critério antigo "${nomeAntigo}" não possui mapeamento. Card não criado.`);
          continue;
        }
        
        const criterio = await tx.criterioAvaliativo.findUnique({ where: { nomeCriterio: nomeNovo } });

        if (criterio) {
          await tx.cardAutoAvaliacao.create({
            data: {
              idAvaliacao: avaliacao.idAvaliacao,
              nomeCriterio: criterio.nomeCriterio,
              nota: notaNumerica,
              justificativa: justificativa || 'xx',
            },
          });
          cardsCriados++;
        } else {
          console.warn(`    - ⚠️ Critério novo "${nomeNovo}" (mapeado de "${nomeAntigo}") não encontrado no banco. Card não criado.`);
        }
      }
      console.log(`  - ✔️ Autoavaliação importada com ${cardsCriados} de ${linhasDaPlanilha.length} linhas processadas.`);
    });
  } catch (error) {
    console.error(`  - ❌ Falha ao criar Autoavaliação completa. Erro:`, error);
  }
}


async function criarAvaliacaoDePares(cicloId: string, avaliadoId: string, avaliadorId: string, respostas: any[]) {
  const notas = respostas.map(r => parseFloat(r['DÊ UMA NOTA GERAL PARA O COLABORADOR'])).filter(n => !isNaN(n));
  const notaGeral = notas.length > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 100) / 100 : 0;
  const pontosMelhorar = respostas.map(r => r['PONTOS QUE DEVE MELHORAR'] || '').filter(Boolean).join('\n');
  const pontosFortes = respostas.map(r => r['PONTOS QUE FAZ BEM E DEVE EXPLORAR'] || '').filter(Boolean).join('\n');
  const motivadoTrabalharNovamente = respostas.map(r => r['VOCÊ FICARIA MOTIVADO EM TRABALHAR NOVAMENTE COM ESTE COLABORADOR'] || '').filter(Boolean).join('\n');

  await prisma.$transaction(async (tx) => {
    const avaliacao = await tx.avaliacao.create({
      data: {
        idCiclo: cicloId, idAvaliado: avaliadoId, idAvaliador: avaliadorId,
        tipoAvaliacao: 'AVALIACAO_PARES', status: 'CONCLUIDA',
      }
    });
    await tx.avaliacaoPares.create({
      data: {
        idAvaliacao: avaliacao.idAvaliacao,
        nota: notaGeral,
        motivadoTrabalharNovamente: motivadoTrabalharNovamente || null,
        pontosFortes: pontosFortes || 'Nenhum ponto forte destacado.',
        pontosFracos: pontosMelhorar || 'Nenhum ponto a melhorar destacado.',
      }
    });
  });
}

// --- EXECUÇÃO DO SCRIPT ---
main()
  .catch(e => {
    console.error(" Erro fatal durante o processo de seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
