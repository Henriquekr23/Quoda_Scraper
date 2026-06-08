import { serve } from 'bun';
import { db } from './database/connection';
import { sindicatos, instrumentos, clausulas } from './database/schema';
import { eq, count } from 'drizzle-orm';
import { join, basename } from 'path';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ColetaOrchestrator } from './services/coleta.orchestrator';

const activeScrapes = new Set<string>();

export function startServer(port = 3000) {
  serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      try {
        // API: get list of unions
        if (path === '/api/unions' && req.method === 'GET') {
          const result = await db.select().from(sindicatos);

          // Single aggregated query for doc counts (avoids N+1)
          const docCounts = await db
            .select({
              sindicatoId: instrumentos.sindicatoId,
              total: count(instrumentos.id)
            })
            .from(instrumentos)
            .groupBy(instrumentos.sindicatoId);

          const countMap = new Map(docCounts.map(r => [r.sindicatoId, r.total]));

          const enrichedUnions = result.map(union => ({
            ...union,
            docCount: countMap.get(union.id) ?? 0,
            scraping: activeScrapes.has(union.cnpj)
          }));

          return Response.json(enrichedUnions);
        }

        // API: register new union and trigger background scrape
        if (path === '/api/unions' && req.method === 'POST') {
          const body = await req.json();
          const { cnpj, nome } = body;
          if (!cnpj) return new Response('Missing cnpj', { status: 400 });

          const cleanedCnpj = cnpj.replace(/\D/g, '');
          if (cleanedCnpj.length !== 14) {
            return new Response('Invalid CNPJ length. Must be 14 digits.', { status: 400 });
          }

          // Check if already in DB
          let union = await db.select().from(sindicatos).where(eq(sindicatos.cnpj, cleanedCnpj)).limit(1);
          if (union.length === 0) {
            const [result] = await db.insert(sindicatos).values({
              cnpj: cleanedCnpj,
              nome: nome || `Empresa CNPJ ${cleanedCnpj}`,
              ativo: true
            });
            union = [{ 
              id: result.insertId, 
              cnpj: cleanedCnpj, 
              nome: nome || `Empresa CNPJ ${cleanedCnpj}`, 
              ativo: true, 
              criadoEm: new Date() 
            }];
          }

          // Trigger background scrape if not already running for this CNPJ
          if (!activeScrapes.has(cleanedCnpj)) {
            activeScrapes.add(cleanedCnpj);
            
            // Execute in background
            (async () => {
              try {
                logger.info(`Iniciando coleta sob demanda para CNPJ ${cleanedCnpj}...`);
                const orchestrator = new ColetaOrchestrator();
                // We default to searching historical (vigentesOnly = false) for manual registrations
                await orchestrator.runColeta(['DF', 'GO'], cleanedCnpj, false);
                logger.info(`Coleta sob demanda concluída para CNPJ ${cleanedCnpj}.`);
              } catch (err: any) {
                logger.error(`Erro na coleta sob demanda para CNPJ ${cleanedCnpj}: ${err.message}`);
              } finally {
                activeScrapes.delete(cleanedCnpj);
              }
            })();
          }

          return Response.json({ success: true, union: union[0], scraping: true });
        }

        // API: get list of instruments for a CNPJ
        if (path === '/api/instruments') {
          const cnpj = url.searchParams.get('cnpj');
          if (!cnpj) return new Response('Missing cnpj parameter', { status: 400 });
          
          const union = await db.select().from(sindicatos).where(eq(sindicatos.cnpj, cnpj)).limit(1);
          if (union.length === 0) return Response.json([]);

          const records = await db.select()
            .from(instrumentos)
            .where(eq(instrumentos.sindicatoId, union[0].id));
          return Response.json(records);
        }

        // API: get list of clauses for an instrument
        if (path === '/api/clauses') {
          const instIdStr = url.searchParams.get('instrumentId');
          if (!instIdStr) return new Response('Missing instrumentId parameter', { status: 400 });
          const instId = parseInt(instIdStr, 10);

          const records = await db.select()
            .from(clausulas)
            .where(eq(clausulas.instrumentoId, instId));
          return Response.json(records);
        }

        // API: serve HTML file safely
        if (path === '/api/files/html') {
          const file = url.searchParams.get('file');
          if (!file) return new Response('Missing file parameter', { status: 400 });
          const safeName = basename(file);
          const fullPath = join(env.STORAGE_RAW_HTML, safeName);
          const bunFile = Bun.file(fullPath);
          if (await bunFile.exists()) {
            return new Response(bunFile, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return new Response('File not found', { status: 404 });
        }

        // API: serve PDF file safely
        if (path === '/api/files/pdf') {
          const file = url.searchParams.get('file');
          if (!file) return new Response('Missing file parameter', { status: 400 });
          const safeName = basename(file);
          const fullPath = join(env.STORAGE_RAW_PDF, safeName);
          const bunFile = Bun.file(fullPath);
          if (await bunFile.exists()) {
            return new Response(bunFile, {
              headers: { 'Content-Type': 'application/pdf' }
            });
          }
          return new Response('File not found', { status: 404 });
        }

        // Serve SPA index.html for root path
        if (path === '/' || path === '/index.html') {
          const spaPath = join(import.meta.dir, 'public', 'index.html');
          const spaFile = Bun.file(spaPath);
          if (await spaFile.exists()) {
            return new Response(spaFile, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
          return new Response('Frontend file public/index.html not found', { status: 404 });
        }

        return new Response('Not Found', { status: 404 });
      } catch (err: any) {
        logger.error({ detalhes: { path, error: err.message } }, 'Erro no servidor HTTP');
        return new Response('Internal Server Error', { status: 500 });
      }
    }
  });

  logger.info(`Servidor frontend iniciado em http://localhost:${port}`);
}
