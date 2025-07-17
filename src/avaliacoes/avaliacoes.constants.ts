export interface RelatorioItem {
    idColaborador: string;
    nomeColaborador: string;
    cargoColaborador: string;
    trilhaColaborador: string | null;
    equipeColaborador: string | null;
    notas: {
        notaAuto: number | null;
        nota360media: number | null;
        notaGestor: number | null;
        discrepancia: number | null | undefined;
    };
}

export enum Motivacao {
    Concordo_Totalmente = 'Concordo Totalmente',
    Concordo_Parciamente = 'Concordo Parcialmente',
    Discordo_Totalmente = 'Discordo Totalmente',
    Discordo_Parcialmente = 'Discordo Parcialmente',
    Nao_Se_Aplica = 'Não Se Aplica',
    Neutro = 'Neutro'
}

export enum Status {

    PENDENTE = 'PENDENTE',
    EM_RASCUNHO = 'EM_RASCUNHO',
    CONCLUIDA = 'CONCLUIDA'
}