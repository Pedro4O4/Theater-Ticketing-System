import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser
  app.use(cookieParser());

  // Increase payload size limits for base64 encoded images
  app.use(json({ limit: '100mb' }));
  app.use(urlencoded({ limit: '100mb', extended: true }));

  // Configure CORS - allow multiple origins
  const isProd = process.env.NODE_ENV === 'production';
  const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Always allow any Vercel preview/production URL for this project
      if (origin.match(/^https:\/\/theater-ticketing-system-nq1d[\w-]*\.vercel\.app$/)) {
        callback(null, true);
        return;
      }

      // In production, check against allowed origins
      if (isProd) {
        if (allowedOrigins.some(ao => origin.includes(ao) || ao === '*')) {
          callback(null, true);
        } else {
          console.log(`CORS blocked for origin: ${origin}`);
          callback(null, false);
        }
      } else {
        // In development, allow all origins for easier testing across devices
        callback(null, true);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Listen on PORT env var (provided by Render) or default to 3001
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();
