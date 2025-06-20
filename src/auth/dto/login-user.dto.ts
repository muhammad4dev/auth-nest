import { IsEmail, IsString, MinLength } from "class-validator";
export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1) // Just ensure it's not empty
  password: string;
}
