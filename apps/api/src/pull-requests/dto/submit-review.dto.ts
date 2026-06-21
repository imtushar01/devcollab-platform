import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SubmitReviewDto {
  @IsEnum(['approved', 'changes_requested', 'commented'])
  status: 'approved' | 'changes_requested' | 'commented';

  @IsString()
  @IsOptional()
  body?: string;
}