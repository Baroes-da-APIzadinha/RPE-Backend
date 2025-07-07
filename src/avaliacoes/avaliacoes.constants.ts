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