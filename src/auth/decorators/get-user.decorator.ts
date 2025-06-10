import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../entities/user.entity";

// This custom decorator simplifies accessing the user object in our controllers.
export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
