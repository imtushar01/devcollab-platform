import { IsString, MinLength } from 'class-validator';

export class CreateIssueCommentDto {
  @IsString()
  @MinLength(1)
  body: string;
}