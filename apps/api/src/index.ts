import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? 4000);

export const app = new Elysia()
  .use(
    cors({
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    }),
  )
  .get('/health', () => ({
    status: 'ok',
    service: 'riftcoach-api',
    version: '0.1.0',
  }))
  .get('/', () => ({
    name: 'RiftCoach API',
    health: '/health',
  }));

if (import.meta.main) {
  app.listen({ hostname: host, port });
  console.log(`RiftCoach API listening on http://${host}:${port}`);
}
