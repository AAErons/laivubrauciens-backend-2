import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import express from 'express';

import { AppModule } from './app.module';

const server = express();

server.use((req, _res, next) => {
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  next();
});

server.use(json({ limit: '10mb' }));
server.use(urlencoded({ limit: '10mb', extended: true }));

let appReady: Promise<void> | null = null;

async function bootstrap() {
  if (!appReady) {
    appReady = (async () => {
      const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
      app.enableCors({ origin: true });
      await app.init();
    })();
  }

  await appReady;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}
