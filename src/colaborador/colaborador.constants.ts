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

export const PERFIL_VALIDACOES = {
  ADMIN: (perfis: string[]) => perfis.length === 1 && perfis[0] === 'ADMIN',
  COLABORADOR_COMUM: (perfis: string[]) => !perfis.includes('ADMIN') && !perfis.includes('RH') && !perfis.includes('MEMBRO_COMITE'),
  GESTOR: (perfis: string[]) => perfis.includes('LIDER') || perfis.includes('MENTOR') || (perfis.includes('LIDER') && perfis.includes('MENTOR')),
  LIDER: (perfis: string[]) => perfis.includes('GESTOR'),
  MENTOR: (perfis: string[]) => perfis.includes('GESTOR'),
  RH: (perfis: string[]) => perfis.length === 1 && perfis[0] === 'RH',
  MEMBRO_COMITE: (perfis: string[]) => perfis.length === 1 && perfis[0] === 'MEMBRO_COMITE',
};

export function validarPerfisColaborador(perfis: string[]): string | null {
  if (perfis.length === 1 && perfis[0] === 'ADMIN') return null;
  if (perfis.includes('COLABORADOR_COMUM') && (perfis.includes('ADMIN') || perfis.includes('RH') || perfis.includes('MEMBRO_COMITE'))) {
    return 'COLABORADOR_COMUM não pode ser ADMIN, RH ou MEMBRO_COMITE';
  }
  if (perfis.includes('GESTOR') && !(perfis.includes('LIDER') || perfis.includes('MENTOR'))) {
    return 'GESTOR precisa ser LIDER, MENTOR ou ambos';
  }
  if (perfis.includes('LIDER') && !perfis.includes('GESTOR')) {
    return 'LIDER precisa ser GESTOR';
  }
  if (perfis.includes('MENTOR') && !perfis.includes('GESTOR')) {
    return 'MENTOR precisa ser GESTOR';
  }
  if (perfis.length === 1 && perfis[0] === 'RH') return null;
  if (perfis.includes('RH') && perfis.length > 1) {
    return 'RH só pode ser RH';
  }
  if (perfis.length === 1 && perfis[0] === 'MEMBRO_COMITE') return null;
  if (perfis.includes('MEMBRO_COMITE') && perfis.length > 1) {
    return 'COMITÊ só pode ser COMITÊ';
  }
  return null;
}