import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BrandSupportEventDto {
  @IsString()
  @MaxLength(64)
  event: string;

  @IsNumber()
  @Min(0)
  ts: number;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  path?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class BrandSupportRequestDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BrandSupportEventDto)
  events: BrandSupportEventDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceApp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  regionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  reasonCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;
}

