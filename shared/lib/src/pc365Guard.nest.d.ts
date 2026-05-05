import { CanActivate, ExecutionContext } from "@nestjs/common";
export declare class PC365NestGuard implements CanActivate {
    private pc365Guard;
    constructor();
    canActivate(context: ExecutionContext): boolean;
}
/**
 * Factory function to create PC365 NestJS guard
 */
export declare function createPC365NestGuard(): PC365NestGuard;
