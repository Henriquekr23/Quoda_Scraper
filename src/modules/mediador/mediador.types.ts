export enum InstrumentoTipo {
  ACORDO_COLETIVO = 'acordo',
  CONVENCAO_COLETIVA = 'convencao',
  TERMO_ADITIVO_ACORDO = 'termoAditivoAcordo',
  TERMO_ADITIVO_CONVENCAO = 'termoAditivoConvecao' // note: spelt Convecao without N on the portal
}

export interface SearchFilters {
  cnpj?: string;
  uf: string;
  tipo: InstrumentoTipo;
  vigentes: boolean;
}

export interface InstrumentoMetadata {
  numeroRegistro: string;
  numeroProcesso: string;
  numeroSolicitacao: string;
  tipoInstrumento: string;
  vigencia: string;
  cnpjTrabalhador: string;
  trabalhador: string;
  cnpjEmpregador: string;
  empregador: string;
  numTrabEntidades: string;
  numTrabNegociacao: string;
}
