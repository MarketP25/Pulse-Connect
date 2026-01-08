import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { Transaction } from './transaction.entity';
import { HashChain } from '@pulsco/shared-lib';

export interface AppendTransactionDto {
  user_id: string;
  amount: number;
  currency: string;
  subsystem: string;
