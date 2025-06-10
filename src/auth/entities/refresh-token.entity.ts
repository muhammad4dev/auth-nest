import { Entity, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { v4 } from "uuid";
import { User } from "./user.entity";

@Entity()
export class RefreshToken {
  @PrimaryKey({ type: "uuid" })
  id: string = v4();

  @Property({ unique: true })
  token: string; // Hashed refresh token

  @Property()
  expiresAt: Date;

  @ManyToOne(() => User, { deleteRule: "cascade" })
  user: User;

  @Property()
  createdAt: Date = new Date();

  @Property()
  ipAddress: string;

  @Property()
  userAgent: string;

  @Property({ onUpdate: () => new Date() }) // This will be updated on refresh
  lastUsedAt: Date = new Date();
}
