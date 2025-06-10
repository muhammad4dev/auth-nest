import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  // This guard automatically uses the JwtStrategy we defined.
  // Nest will handle the 401 Unauthorized response if the token is invalid or missing.
}
