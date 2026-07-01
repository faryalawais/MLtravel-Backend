import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DocsModule } from './docs/docs.module';

@Module({
  imports: [HealthModule, DocsModule],
})
export class AppModule {}
