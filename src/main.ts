import { MikroORM } from "@mikro-orm/core";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Security Middleware ---
  app.use(helmet());
  app.enableCors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Important for cookies
  });

  // --- Cookie Parser ---
  app.use(cookieParser());

  // --- Initialize MikroORM Schema (for development) ---
  // This will create/update the database schema based on your entities.
  // In production, you should use migrations instead of this.
  const orm = app.get(MikroORM);
  await orm.getSchemaGenerator().updateSchema();

  // --- Global Pipes for Validation ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip away properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    })
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
