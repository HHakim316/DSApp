console.log("🚀 Starting backend app...");

import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log('⬇️ Incoming Request:');
    console.log('- Method:', req.method);
    console.log('- URL:', req.originalUrl);
    console.log('- Query:', req.query);
    console.log('- Headers:', req.headers);
    next();
  });
  app.use(passport.initialize());
  app.setGlobalPrefix('api');
  app.enableCors({
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true
});
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    whitelist: true,
    skipUndefinedProperties: true,
    skipNullProperties: true,
    forbidUnknownValues: false,
    })
  );
  const config = new DocumentBuilder()
    .setTitle('SINCE 1950 API')
    .setDescription('API for managing fashion products')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      requestInterceptor: (req: { headers?: Record<string, string> }) => {
        const token = localStorage.getItem('JWT_TOKEN');
        if (token && req.headers) {
          (req.headers as any)['Authorization'] = `Bearer ${token}`;
        }
        return req;
      }
    }
  });
  console.log("🔍 Environment Variables:");
  console.log("- JWT_SECRET:", process.env.JWT_SECRET ? '***' : 'MISSING');
  console.log("- DB_HOST:", process.env.DB_HOST);
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  await app.listen(3001, () => {
    console.log("\n🚀 Server running on http://localhost:3001");
    console.log("📚 API Docs at http://localhost:3001/api");
  });
}
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
bootstrap();