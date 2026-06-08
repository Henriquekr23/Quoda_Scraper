import * as cheerio from 'cheerio';
import { XlsParser } from '../mediador/xls.parser';

export interface ParsedDocument {
  numeroRegistro: string | null;
  numeroSolicitacao: string | null;
  dataRegistro: Date | null;
  dataProtocolo: Date | null;
  clausulas: Array<{ titulo: string; conteudo: string }>;
}

export class ClausulasParser {
  static parse(html: string): ParsedDocument {
    const $ = cheerio.load(html);

    let numeroRegistro: string | null = null;
    let numeroSolicitacao: string | null = null;
    let dataRegistro: Date | null = null;
    let dataProtocolo: Date | null = null;

    // Parse metadata from the table
    $('table tr').each((_, tr) => {
      const bTag = $(tr).find('td').first().find('b');
      if (bTag.length > 0) {
        const label = bTag.text().trim().toUpperCase();
        const value = $(tr).find('td').last().text().trim();

        if (label.includes('NÚMERO DE REGISTRO NO MTE:')) {
          numeroRegistro = value || null;
        } else if (label.includes('NÚMERO DA SOLICITAÇÃO:')) {
          numeroSolicitacao = value || null;
        } else if (label.includes('DATA DE REGISTRO NO MTE:')) {
          dataRegistro = XlsParser.parseDate(value);
        } else if (label.includes('DATA DO PROTOCOLO:')) {
          dataProtocolo = XlsParser.parseDate(value);
        }
      }
    });

    // Parse clauses
    const clausulasList: Array<{ titulo: string; conteudo: string }> = [];
    const titles = $('label.tituloClausula');
    const contents = $('label.descricaoClausula');

    titles.each((i, el) => {
      const titulo = $(el).text().trim();
      // Use cheerio to select the corresponding index in contents
      const contentEl = contents.eq(i);
      const conteudo = contentEl.html()?.trim() || '';
      
      if (titulo) {
        clausulasList.push({
          titulo,
          conteudo
        });
      }
    });

    return {
      numeroRegistro,
      numeroSolicitacao,
      dataRegistro,
      dataProtocolo,
      clausulas: clausulasList
    };
  }
}
