import { logger } from '../../utils/logger';

export interface ClauseInterpretation {
  tipo: string;
  valor?: number;
  [key: string]: any;
}

export class IAService {
  /**
   * Interprets a clause's semantic meaning.
   * Decoupled design: currently uses rule-based heuristic extraction (acting as a high-fidelity stub)
   * which can be easily swapped for actual LLM integration (e.g. Gemini, OpenAI) by configuring env keys.
   */
  async interpretClause(title: string, content: string): Promise<ClauseInterpretation | null> {
    logger.debug({ detalhes: { title } }, 'Iniciando interpretação de cláusula via IA');

    try {
      const normalizedTitle = title.toLowerCase();
      
      // Stub logic: let's try to extract numbers or percentages heuristically
      if (normalizedTitle.includes('piso') || normalizedTitle.includes('salario minimo') || normalizedTitle.includes('salário')) {
        // Try to match a cash value: R$ 2.150,00 or 2150.00
        const cashMatch = content.match(/R\$\s*([0-9.,]+)/i) || content.match(/([0-9.,]+)\s*reais/i);
        if (cashMatch) {
          // Parse value (remove dots, replace comma with dot)
          const rawValue = cashMatch[1].replace(/\./g, '').replace(',', '.');
          const value = parseFloat(rawValue);
          if (!isNaN(value)) {
            return {
              tipo: 'PISO',
              valor: value
            };
          }
        }
      }

      if (normalizedTitle.includes('reajuste') || normalizedTitle.includes('aumento')) {
        // Try to match a percentage: 5% or 5,5% or 5.5%
        const percentMatch = content.match(/([0-9.,]+)\s*%/i) || content.match(/reajuste\s*de\s*([0-9.,]+)/i);
        if (percentMatch) {
          const rawValue = percentMatch[1].replace(',', '.');
          const value = parseFloat(rawValue);
          if (!isNaN(value)) {
            return {
              tipo: 'REAJUSTE',
              percentual: value
            };
          }
        }
      }

      // Default fallback stub response
      return {
        tipo: 'OUTROS',
        processado: true
      };
    } catch (err: any) {
      logger.error({ detalhes: { title, error: err.message } }, 'Erro ao interpretar cláusula via IA');
      return null;
    }
  }
}
