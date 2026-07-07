import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './infra/env/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Atrás de um reverse proxy (Nginx), confia no primeiro proxy para que
  // request.ip / X-Forwarded-For reflitam o IP real do cliente (auditoria de login e rate limiter).
  app.set('trust proxy', 1);

  app.enableCors({
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  if (env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Template Backend Nest')
      .setDescription('API documentation')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(env.APP_PORT);
}
bootstrap();
