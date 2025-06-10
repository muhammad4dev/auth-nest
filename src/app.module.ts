import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import mikroOrmConfig from "./mikro-orm.config";

@Module({
  imports: [
    // --- Configuration Module ---
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // --- Database Module (MikroORM) ---
    MikroOrmModule.forRoot(mikroOrmConfig),

    // --- Feature Modules ---
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
