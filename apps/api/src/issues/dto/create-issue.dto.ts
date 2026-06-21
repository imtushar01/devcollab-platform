import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}