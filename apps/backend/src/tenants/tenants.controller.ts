import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { SessionGuard } from '../guards/session.guard';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(SessionGuard)
@Roles('admin')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list() {
    return this.tenants.list();
  }
}
