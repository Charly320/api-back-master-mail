import { Global, Module } from '@nestjs/common';
import { SecurityClientService } from './security-client.service';

@Global()
@Module({
  providers: [SecurityClientService],
  exports: [SecurityClientService],
})
export class SecurityClientModule {}

