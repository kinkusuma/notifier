import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchController } from './dispatch.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [DispatchController],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
