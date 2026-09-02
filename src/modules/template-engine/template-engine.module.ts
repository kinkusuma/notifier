import { Global, Module } from '@nestjs/common';
import { TemplateEngineService } from './template-engine.service';

@Global()
@Module({
  providers: [TemplateEngineService],
  exports: [TemplateEngineService],
})
export class TemplateEngineModule {}
