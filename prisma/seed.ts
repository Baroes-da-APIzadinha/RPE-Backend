// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

// --- FUNÇÃO AUXILIAR PARA PROCESSAR UMA ÚNICA PLANILHA DE FUNCIONÁRIO ---
async function processarPlanilha(filePath: string) {
  console.log(`\n--- Processando planilha: ${path.basename(filePath)} ---`);

  // Lê o arquivo Excel
  const workbook = xlsx.readFile(filePath);

  // --- 1. PROCESSAR ABA 'Perfil' ---
  const perfilSheet = workbook.Sheets['Perfil'];
  if (!perfilSheet) {
    console.warn(`Aba 'Perfil' não encontrada em ${filePath}. Pulando este arquivo.`);
    return;
  }
  const perfilData = xlsx.utils.sheet_to_json(perfilSheet) as any[];
  const perfil = perfilData[0]; // Pega a primeira linha dos dados do perfil

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

  // Cria ou atualiza o colaborador
  const colaborador = await prisma.colaborador.upsert({
    where: { email: perfil.Email },
    update: {
      nomeCompleto: perfil['Nome ( nome.sobrenome )'],
      unidade: perfil['Unidade'],
    },
    create: {
      nomeCompleto: perfil['Nome ( nome.sobrenome )'],
      email: perfil.Email,
      unidade: perfil['Unidade'],
      senha: 'uma_senha_padrao_hash', // Use um hash real em um projeto de verdade
    },
  });
  console.log(`Colaborador garantido no banco: ${colaborador.nomeCompleto} (${colaborador.unidade})`);

  // --- 2. PROCESSAR ABA 'Autoavaliação' ---
  /*
  // Se quiser importar avaliações, descomente e adapte:
  const autoAvaliacaoSheet = workbook.Sheets['Autoavaliação'];
  if (autoAvaliacaoSheet) {
    // ...
  }
  */
}

// --- FUNÇÃO PRINCIPAL QUE ORQUESTRA TUDO ---
async function main() {
  console.log('Iniciando o processo de seed de colaboradores...');

  // Define o caminho para a pasta com os arquivos Excel
  const dataPath = path.join(__dirname, 'data');
  const files = fs.readdirSync(dataPath).filter(file => file.endsWith('.XLSX'));
  console.log('Arquivos encontrados:', files);

  if (files.length === 0) {
    console.log('Nenhum arquivo .xlsx encontrado na pasta prisma/data. Encerrando o seed.');
    return;
  }

  console.log(`Encontrados ${files.length} arquivos para processar.`);

  // Loop para processar cada arquivo encontrado
  for (const file of files) {
    const filePath = path.join(dataPath, file);
    try {
      await processarPlanilha(filePath);
    } catch (err) {
      console.error(`Erro ao processar ${file}:`, err);
    }
  }

  console.log('\nProcesso de seed de colaboradores concluído.');
}

// --- EXECUTA A FUNÇÃO PRINCIPAL E FINALIZA A CONEXÃO ---
main()
  .catch((e) => {
    console.error('Ocorreu um erro durante o processo de seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });