import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

let app: INestApplication;

export async function getApp(): Promise<INestApplication> {
  if (!app) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = undefined as unknown as INestApplication;
  }
}
