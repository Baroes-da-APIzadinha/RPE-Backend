export enum Trilha {
    DESENVOLVIMENTO  = 'DESENVOLVIMENTO',
    QA = 'QA',
    SUPORTE = 'SUPORTE',
    UX = 'UX',
    GERENCIAMENTO = 'GERENCIAMENTO',
    RH = 'RH',
    FINANCEIRO = 'FINANCEIRO',
    MARKETING = 'MARKETING',
    COMERCIAL = 'COMERCIAL',
    // Adicione outras trilhas conforme necessário
  }
  
  export const TRILHAS = Object.values(Trilha);
  
  export enum Cargo {
    DESENVOLVEDOR = 'DESENVOLVEDOR',
    QA = 'QA',
    SUPORTE = 'SUPORTE',
    UX = 'UX',
    RH = 'RH',
    FINANCEIRO = 'FINANCEIRO',
    MARKETING = 'MARKETING',
    COMERCIAL = 'COMERCIAL',


    // Adicione outros cargos conforme necessário
  }
  
  export const CARGOS = Object.values(Cargo);
  
  export enum Unidade {
    MATRIZ = 'RECIFE',
    FILIAL = 'SAO PAULO',
    REMOTO = 'FLORIANOPOLIS',
    // Adicione outras unidades conforme necessário
  }
  
  export const UNIDADES = Object.values(Unidade);