import { describe, it, expect } from 'bun:test';
import { XlsParser } from '../src/modules/mediador/xls.parser';

describe('XlsParser', () => {
  it('should parse malformed tr layout correctly', () => {
    const mockXls = `
      <table>
        <tr indice="DF000003/2026">
          <td>DF000003/2026</td>
          <td>47979.284551/2025-99</td>
          <td>MR072140/2025</td>
          <td>Acordo Coletivo</td>
          <td>01/10/2024 - 31/08/2026</td>
          <td>24.687.636/0001-11</td>
          <td>SINDICATO TRAB RURAIS</td>
          <td>61.064.929/0064-52</td>
          <td>CORTEVA AGRISCIENCE</td>
          <td>480</td>
          <td>480</td>
        <tr indice="DF000004/2025">
          <td>DF000004/2025</td>
          <td>12345.67890/2024-11</td>
          <td>MR075820/2024</td>
          <td>Convenção Coletiva</td>
          <td>01/01/2025 - 31/12/2026</td>
          <td>17.312.597/0001-02</td>
          <td>SINDICATO TRAB COMERCIO</td>
          <td>01.634.039/0001-23</td>
          <td>BRASFORT SEGURANCA</td>
          <td>10</td>
          <td>15</td>
      </table>
    `;

    const records = XlsParser.parse(mockXls);
    expect(records.length).toBe(2);
    expect(records[0].numeroRegistro).toBe('DF000003/2026');
    expect(records[0].numeroSolicitacao).toBe('MR072140/2025');
    expect(records[0].tipoInstrumento).toBe('Acordo Coletivo');
    expect(records[0].vigencia).toBe('01/10/2024 - 31/08/2026');

    expect(records[1].numeroRegistro).toBe('DF000004/2025');
    expect(records[1].numeroSolicitacao).toBe('MR075820/2024');
    expect(records[1].tipoInstrumento).toBe('Convenção Coletiva');
  });

  it('should parse vigencia ranges correctly', () => {
    const range = '01/10/2024 - 31/08/2026';
    const parsed = XlsParser.parseVigencia(range);
    expect(parsed.inicio).not.toBeNull();
    expect(parsed.fim).not.toBeNull();
    expect(parsed.inicio!.getFullYear()).toBe(2024);
    expect(parsed.inicio!.getMonth()).toBe(9); // 10 (October) is 9-indexed
    expect(parsed.inicio!.getDate()).toBe(1);
    
    expect(parsed.fim!.getFullYear()).toBe(2026);
    expect(parsed.fim!.getMonth()).toBe(7); // 08 (August) is 7-indexed
    expect(parsed.fim!.getDate()).toBe(31);
  });

  it('should extract UFs from registration numbers', () => {
    expect(XlsParser.extractUf('DF000003/2026')).toBe('DF');
    expect(XlsParser.extractUf('GO12345/2025')).toBe('GO');
    expect(XlsParser.extractUf('12345')).toBeNull();
  });
});
