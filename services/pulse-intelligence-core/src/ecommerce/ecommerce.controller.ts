import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PC365NestGuard } from '@pulsco/shared-lib';

@Controller('ecommerce')
export class EcommerceController {
  @Post('validate-transaction')
  @UseGuards(PC365NestGuard)
  async validateTransaction(@Body() body: any) {
    // Transaction validation logic
    // Check against fraud patterns, account status, region compliance
    return { valid: true, riskScore: 0.1 };
  }

  @Post('process-payment')
  async processPayment(@Body() body: any) {
    // Payment processing with ledger integration
    // Append to transactions_ledger with hash chaining
    return { transactionId: 'tx_123', status: 'completed' };
  }

  @Post('refund')
  @UseGuards(PC365NestGuard)
  async processRefund(@Body() body: any) {
    // Founder-only refund processing
    // Requires PC365 dual control
    return { refundId: 'ref_123', status: 'processed' };
  }
}
