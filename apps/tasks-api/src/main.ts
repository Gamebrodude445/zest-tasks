import Fastify from 'fastify';
import { app } from './app/app';

const requiredEnvVars = [
  'NO_WORKERS_DELAY',
  'SERVER_PORT',
  'TASK_SIMULATED_DURATION',
  'TASK_SIMULATED_ERROR_PERCENTAGE',
  'TASK_ERROR_RETRY_DELAY',
  'WORKER_TIMEOUT',
  'TASK_MAX_RETRIES',
];
const host = process.env.HOST ?? 'localhost';
// this is safe because we check it later
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const port = +process.env.SERVER_PORT!;

// Instantiate Fastify with some config
const server = Fastify({});

// Register your application as a normal plugin.
server.register(app);

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
  process.exit(1);
}

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
