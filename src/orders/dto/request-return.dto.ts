import { IsString, IsOptional } from 'class-validator';

export class RequestReturnDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
