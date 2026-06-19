import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @MinLength(2)
  @MaxLength(39)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message: 'handle must be lowercase alphanumeric with hyphens, no leading/trailing hyphens',
  })
  handle: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  displayName: string;

  @IsString()
  @MaxLength(500)
  description?: string;
}