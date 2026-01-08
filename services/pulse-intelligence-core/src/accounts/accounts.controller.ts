import {
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Body,
  Param,
  UseGuards,
  Headers
} from "@nestjs/common";
import { AccountsService, CreateUserDto, ModifyUserDto, DeleteUserDto } from "./accounts.service";
import { PC365Guard } from "@pulsco/shared-lib";

@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post("create")
  async createUser(@Body() dto: CreateUserDto) {
    return this.accountsService.createUser(dto);
  }

  @Put(":id/modify")
  @UseGuards(PC365Guard)
  async modifyUser(
    @Param("id") userId: string,
    @Body() dto: ModifyUserDto,
    @Headers() headers: any
  ) {
    return this.accountsService.modifyUser(userId, dto);
  }

  @Put(":id/deactivate")
  @UseGuards(PC365Guard)
  async deactivateUser(
    @Param("id") userId: string,
    @Body() dto: DeleteUserDto,
    @Headers() headers: any
  ) {
    await this.accountsService.deactivateUser(userId, dto);
    return { message: "User deactivated successfully" };
  }

  @Delete(":id")
  @UseGuards(PC365Guard)
  async deleteUser(
    @Param("id") userId: string,
    @Body() dto: DeleteUserDto,
    @Headers() headers: any
  ) {
    await this.accountsService.deleteUser(userId, dto);
    return { message: "User deleted successfully" };
  }

  @Get(":id/history")
  async getUserHistory(@Param("id") userId: string) {
    return this.accountsService.getUserHistory(userId);
  }
}
