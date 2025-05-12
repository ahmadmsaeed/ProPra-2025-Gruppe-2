import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for requests from Angular frontend
app.enableCors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], // ✅ PATCH is included
  allowedHeaders: ['Content-Type', 'Authorization'],             // ✅ Required for most APIs
  credentials: true,
});

  await app.listen(process.env.PORT ?? 3000);  // Ensure the API listens on the correct port
}
bootstrap();
