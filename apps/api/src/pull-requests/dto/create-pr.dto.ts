import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePrDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  sourceBranch: string;

  @IsString()
  @IsOptional()
  targetBranch?: string = 'main';

  @IsEnum(['draft', 'open'])
  @IsOptional()
  status?: 'draft' | 'open' = 'open';
}