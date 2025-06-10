import {
  BeforeCreate,
  Cascade,
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { v4 as uuidv4 } from "uuid";
import { RefreshToken } from "./refresh-token.entity";

const bcrypt = require("bcryptjs");

@Entity()
export class User {
  @PrimaryKey({ type: "uuid" })
  id: string = uuidv4();

  @Property({ unique: true })
  email: string;

  @Property({ hidden: true })
  password: string;

  @OneToMany(() => RefreshToken, (token) => token.user, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  refreshTokens = new Collection<RefreshToken>(this);

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @BeforeCreate()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
