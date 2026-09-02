import { Global, Module } from '@nestjs/common';
import { DigestService } from './digest.service';

@Global()
@Module({
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
