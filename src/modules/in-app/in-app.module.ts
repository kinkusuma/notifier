import { Module } from '@nestjs/common';
import { InAppService } from './in-app.service';
import { InAppController } from './in-app.controller';

@Module({
  controllers: [InAppController],
  providers: [InAppService],
  exports: [InAppService],
})
export class InAppModule {}
