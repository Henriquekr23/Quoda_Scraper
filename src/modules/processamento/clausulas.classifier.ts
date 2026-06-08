export type ClauseCategory =
  | 'SALARIO'
  | 'REAJUSTE'
  | 'PISO'
  | 'BENEFICIOS'
  | 'ALIMENTACAO'
  | 'TRANSPORTE'
  | 'FERIAS'
  | 'JORNADA'
  | 'BANCO_DE_HORAS'
  | 'ADICIONAIS'
  | 'SEGURANCA'
  | 'MULTAS'
  | 'OUTROS';

export class ClausulasClassifier {
  /**
   * Helper to normalize text (remove accents and lowercase)
   */
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Classifies a clause based on its title and content
   */
  static classify(title: string, content?: string): ClauseCategory {
    const normalizedTitle = this.normalize(title);

    // 1. Banco de Horas (Specific check before general jornada)
    if (normalizedTitle.includes('banco de horas') || normalizedTitle.includes('banco de hora')) {
      return 'BANCO_DE_HORAS';
    }

    // 2. Vale Transporte (Specific check before general alimentação or transporte)
    if (normalizedTitle.includes('transporte') || normalizedTitle.includes('combustivel')) {
      return 'TRANSPORTE';
    }

    // 3. Alimentação
    if (
      normalizedTitle.includes('alimentacao') ||
      normalizedTitle.includes('refeicao') ||
      normalizedTitle.includes('cesta') ||
      normalizedTitle.includes('tiquete') ||
      normalizedTitle.includes('vale refeicao') ||
      normalizedTitle.includes('vale alimentacao')
    ) {
      return 'ALIMENTACAO';
    }

    // 4. Piso Salarial
    if (normalizedTitle.includes('piso') || normalizedTitle.includes('salario minimo')) {
      return 'PISO';
    }

    // 5. Reajuste
    if (
      normalizedTitle.includes('reajuste') ||
      normalizedTitle.includes('correcao salarial') ||
      normalizedTitle.includes('aumento')
    ) {
      return 'REAJUSTE';
    }

    // 6. Adicionais
    if (
      normalizedTitle.includes('adicional') ||
      normalizedTitle.includes('insalubridade') ||
      normalizedTitle.includes('periculosidade') ||
      normalizedTitle.includes('noturno') ||
      normalizedTitle.includes('hora extra')
    ) {
      return 'ADICIONAIS';
    }

    // 7. Salário e Pagamento
    if (
      normalizedTitle.includes('salario') ||
      normalizedTitle.includes('remuneracao') ||
      normalizedTitle.includes('pagamento') ||
      normalizedTitle.includes('comissao') ||
      normalizedTitle.includes('quinzenal')
    ) {
      return 'SALARIO';
    }

    // 8. Férias e Licenças
    if (
      normalizedTitle.includes('ferias') ||
      normalizedTitle.includes('licenca') ||
      normalizedTitle.includes('afastamento') ||
      normalizedTitle.includes('ausencia')
    ) {
      return 'FERIAS';
    }

    // 9. Jornada
    if (
      normalizedTitle.includes('jornada') ||
      normalizedTitle.includes('escala') ||
      normalizedTitle.includes('horario') ||
      normalizedTitle.includes('trabalho') ||
      normalizedTitle.includes('turno') ||
      normalizedTitle.includes('descanso') ||
      normalizedTitle.includes('intervalo') ||
      normalizedTitle.includes('folga')
    ) {
      return 'JORNADA';
    }

    // 10. Benefícios
    if (
      normalizedTitle.includes('beneficio') ||
      normalizedTitle.includes('seguro de vida') ||
      normalizedTitle.includes('plano de saude') ||
      normalizedTitle.includes('assistencia') ||
      normalizedTitle.includes('convenio') ||
      normalizedTitle.includes('auxilio')
    ) {
      return 'BENEFICIOS';
    }

    // 11. Segurança
    if (
      normalizedTitle.includes('seguranca') ||
      normalizedTitle.includes('epi') ||
      normalizedTitle.includes('cipa') ||
      normalizedTitle.includes('medicina') ||
      normalizedTitle.includes('acidente') ||
      normalizedTitle.includes('saude ocupacional')
    ) {
      return 'SEGURANCA';
    }

    // 12. Multas
    if (
      normalizedTitle.includes('multa') ||
      normalizedTitle.includes('penalidade') ||
      normalizedTitle.includes('descumprimento')
    ) {
      return 'MULTAS';
    }

    return 'OUTROS';
  }
}
