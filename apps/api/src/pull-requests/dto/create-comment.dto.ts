import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  filePath?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  lineNumber?: number;
}