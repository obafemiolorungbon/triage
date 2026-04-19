import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnv } from './env.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (cfg) => {
        const r = validateEnv(cfg);
        if ('_INVALID' in r) {
          const msg = r.error.flatten().fieldErrors;
          throw new Error(`Invalid environment:\n${JSON.stringify(msg, null, 2)}`);
        }
        return r;
      },
    }),
  ],
})
export class EnvConfigModule {}
