import { Options } from "@mikro-orm/core";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import { SqliteDriver } from "@mikro-orm/sqlite";
import * as path from "path";
import { RefreshToken } from "./auth/entities/refresh-token.entity";
import { User } from "./auth/entities/user.entity";

const config: Options = {
  driver: SqliteDriver,
  dbName: "database.sqlite",
  entities: [User, RefreshToken],
  metadataProvider: TsMorphMetadataProvider,
  allowGlobalContext: true,
  debug: process.env.NODE_ENV === "development",
  migrations: {
    tableName: "mikro_orm_migrations",
    path: path.join(__dirname, "migrations"),
    pathTs: path.join(__dirname, "migrations"),
    glob: "!(*.d).{js,ts}",
  },
};

export default config;
