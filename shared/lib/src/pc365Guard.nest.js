"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PC365NestGuard = void 0;
exports.createPC365NestGuard = createPC365NestGuard;
const common_1 = require("@nestjs/common");
const pc365Guard_1 = require("./pc365Guard");
let PC365NestGuard = class PC365NestGuard {
    constructor() {
        this.pc365Guard = (0, pc365Guard_1.createPC365Guard)();
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const headers = request.headers;
        const pc365Headers = {
            authorization: headers.authorization,
            "x-pc365": headers["x-pc365"],
            "x-founder": headers["x-founder"],
            "x-device": headers["x-device"]
        };
        try {
            return this.pc365Guard.validateDestructiveAction(pc365Headers);
        }
        catch (error) {
            // Log the security violation
            console.error("PC365 Guard violation:", error.message);
            return false;
        }
    }
};
exports.PC365NestGuard = PC365NestGuard;
exports.PC365NestGuard = PC365NestGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PC365NestGuard);
/**
 * Factory function to create PC365 NestJS guard
 */
function createPC365NestGuard() {
    return new PC365NestGuard();
}
