import Fastify from 'fastify';
import { EVENT_TYPE } from '@atena/shared';

const app = Fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

// rota provisória só para validar o import do pacote shared
app.get('/event-types', async () => {
  return EVENT_TYPE;
});

const port = Number(process.env.API_PORT ?? 3000);

app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Atena Logen API rodando em ${address}`);
});
