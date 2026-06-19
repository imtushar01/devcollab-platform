import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateRepoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Repository name can only contain letters, numbers, hyphens, underscores, and dots',
  })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(['public', 'private'])
  @IsOptional()
  visibility?: 'public' | 'private' = 'public';
}