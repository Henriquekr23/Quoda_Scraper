import { describe, it, expect } from 'bun:test';
import { ClausulasParser } from '../src/modules/processamento/clausulas.parser';

describe('ClausulasParser', () => {
  it('should parse document metadata and clauses from visualizer HTML', () => {
    const mockHtml = `
      <html>
        <body>
          <table>
            <tr>
              <td><b>NÚMERO DE REGISTRO NO MTE:</b></td>
              <td></td>
              <td>DF000003/2026</td>
            </tr>
            <tr>
              <td><b>DATA DE REGISTRO NO MTE:</b></td>
              <td></td>
              <td>05/01/2026</td>
            </tr>
            <tr>
              <td><b>NÚMERO DA SOLICITAÇÃO:</b></td>
              <td></td>
              <td>MR072140/2025</td>
            </tr>
            <tr>
              <td><b>DATA DO PROTOCOLO:</b></td>
              <td></td>
              <td>03/12/2025</td>
            </tr>
          </table>

          <div>
            <label class="tituloClausula">CLÁUSULA PRIMEIRA - VIGÊNCIA E ABRANGÊNCIA</label>
            <label class="descricaoClausula">A vigência deste acordo é de 2 anos...</label>

            <label class="tituloClausula">CLÁUSULA SEGUNDA - PISO SALARIAL</label>
            <label class="descricaoClausula">O piso salarial será de R$ 2.150,00.</label>
          </div>
        </body>
      </html>
    `;

    const parsed = ClausulasParser.parse(mockHtml);
    expect(parsed.numeroRegistro).toBe('DF000003/2026');
    expect(parsed.numeroSolicitacao).toBe('MR072140/2025');
    
    expect(parsed.dataRegistro).not.toBeNull();
    expect(parsed.dataRegistro!.getFullYear()).toBe(2026);
    expect(parsed.dataRegistro!.getMonth()).toBe(0); // Jan is 0-indexed
    expect(parsed.dataRegistro!.getDate()).toBe(5);

    expect(parsed.dataProtocolo).not.toBeNull();
    expect(parsed.dataProtocolo!.getFullYear()).toBe(2025);
    expect(parsed.dataProtocolo!.getMonth()).toBe(11); // Dec is 11-indexed
    expect(parsed.dataProtocolo!.getDate()).toBe(3);

    expect(parsed.clausulas.length).toBe(2);
    expect(parsed.clausulas[0].titulo).toBe('CLÁUSULA PRIMEIRA - VIGÊNCIA E ABRANGÊNCIA');
    expect(parsed.clausulas[0].conteudo).toBe('A vigência deste acordo é de 2 anos...');
    expect(parsed.clausulas[1].titulo).toBe('CLÁUSULA SEGUNDA - PISO SALARIAL');
    expect(parsed.clausulas[1].conteudo).toBe('O piso salarial será de R$ 2.150,00.');
  });
});
