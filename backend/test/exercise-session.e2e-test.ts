import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ExerciseSessionController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/exercise-sessions/start (POST)', () => {
    return request(app.getHttpServer())
      .post('/exercise-sessions/start')
      .send({ exerciseId: 1 })
      .expect(201); // Expected status is 201 Created for POST
  });
}); 