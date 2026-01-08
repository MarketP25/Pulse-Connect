import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { featureFlagService } from '../../pulse-connect-core/src/config/featureFlagService';

@Controller('admin/feature-flags')
export class FeatureFlagsController {
  @Get()
  async list() {
    return await featureFlagService.listFlags();
  }

  @Post(':name')
  async set(@Param('name') name: string, @Body() body: { enabled: boolean }) {
    await featureFlagService.setFlag(name, !!body.enabled);
    // Also set local in-memory test flags for immediate process reads
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { setFeatureFlag } = require('../../pulse-connect-core/src/config/featureFlags');
      setFeatureFlag(name, !!body.enabled);
    } catch (err) {
      // ignore
    }
    return { name, enabled: !!body.enabled };
  }
}
