/**
 * LP-001-BE — Health endpoint
 * Scenario: GH#2 — Health endpoint returns 200
 * Source: features/LP-001/LP-001.feature (@be)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { closeApp, getApp } from '../test-app';

let app: INestApplication;

beforeAll(async () => {
  app = await getApp();
});

afterAll(async () => {
  await closeApp();
});

describe('GET /api/health', () => {
  it('GH#2 — Health endpoint returns 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(typeof res.body.status).toBe('string');
  });
});
