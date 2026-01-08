import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService, AppendTransactionDto, DeleteTransactionDto, SearchTransactionsDto } from './transactions.service';
import { PC365Guard } from '@pulsco/shared-lib';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('append')
  async appendTransaction(@Body() dto: AppendTransactionDto) {
    return this.transactionsService.appendTransaction(dto);
  }

  @Delete(':id')
  @UseGuards(PC365Guard)
  async deleteTransaction(
    @Param('id') transactionId: string,
    @Body() dto: DeleteTransactionDto,
  ) {
    await this.transactionsService.deleteTransaction(transactionId, dto);
    return { message: 'Transaction deleted successfully' };
  }

  @Get(':id')
  async getTransaction(@Param('id') transactionId: string) {
    return this.transactionsService.getTransaction(transactionId);
  }

  @Get('search')
  async searchTransactions(
    @Query('user_id') userId?: string,
    @Query('region') region?: string,
    @Query('subsystem') subsystem?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const dto: SearchTransactionsDto = {
      user_id: userId,
      region,
      subsystem,
    };

    if (startDate && endDate) {
      dto.date_range = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }

    return this.transactionsService.searchTransactions(dto);
  }
}
