import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PC365Guard } from './pc365Guard';

@Injectable()
export class PC365NestGuard implements CanActivate {
  private pc365Guard: PC365Guard;

  constructor() {
    this.pc365Guard = PC365Guard.createPC365Guard();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const pc365Headers = {
      authorization: headers.authorization,
      'x-pc365': headers['x-pc365'],
      'x-founder': headers['x-founder'],
      'x-device': headers['x-device'],
    };

    try {
      return this.pc365Guard.validateDestructiveAction(pc365Headers);
    } catch (error) {
      // Log the security violation
      console.error('PC365 Guard violation:', error.message);
      return false;
    }
  }
}

/**
 * Factory function to create PC365 NestJS guard
 */
export function createPC365NestGuard(): PC365NestGuard {
  return new PC365NestGuard();
}
