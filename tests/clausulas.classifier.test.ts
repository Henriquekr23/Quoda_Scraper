import { describe, it, expect } from 'bun:test';
import { ClausulasClassifier } from '../src/modules/processamento/clausulas.classifier';

describe('ClausulasClassifier', () => {
  it('should classify clause titles into correct categories', () => {
    expect(ClausulasClassifier.classify('CLÁUSULA TERCEIRA - PISO SALARIAL')).toBe('PISO');
    expect(ClausulasClassifier.classify('CLÁUSULA QUARTA - REAJUSTE SALARIAL')).toBe('REAJUSTE');
    expect(ClausulasClassifier.classify('VALE ALIMENTAÇÃO E REFEIÇÃO')).toBe('ALIMENTACAO');
    expect(ClausulasClassifier.classify('FORNECIMENTO DE VALE TRANSPORTE')).toBe('TRANSPORTE');
    expect(ClausulasClassifier.classify('BANCO DE HORAS E COMPENSAÇÃO')).toBe('BANCO_DE_HORAS');
    expect(ClausulasClassifier.classify('ADICIONAL DE INSALUBRIDADE')).toBe('ADICIONAIS');
    expect(ClausulasClassifier.classify('JORNADA DE TRABALHO E ESCALAS')).toBe('JORNADA');
    expect(ClausulasClassifier.classify('FÉRIAS COLETIVAS')).toBe('FERIAS');
    expect(ClausulasClassifier.classify('PLANO DE SAÚDE E ASSISTÊNCIA MÉDICA')).toBe('BENEFICIOS');
    expect(ClausulasClassifier.classify('EPI - EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL')).toBe('SEGURANCA');
    expect(ClausulasClassifier.classify('MULTA POR DESCUMPRIMENTO')).toBe('MULTAS');
    expect(ClausulasClassifier.classify('ALGUMA OUTRA MATÉRIA DIVERSA')).toBe('OUTROS');
  });
});
