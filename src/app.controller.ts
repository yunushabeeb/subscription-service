import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('payments')
@Controller()
export class AppController {
  @Get('success')
  @ApiOperation({ summary: 'Payment success redirect' })
  @ApiResponse({ status: 200, description: 'Payment completed successfully' })
  success() {
    return {
      statusCode: 200,
      message: 'Payment successful! Your subscription is now active.',
    };
  }

  @Get('cancel')
  @ApiOperation({ summary: 'Payment cancel redirect' })
  @ApiResponse({ status: 200, description: 'Payment was cancelled' })
  cancel() {
    return {
      statusCode: 200,
      message: 'Payment cancelled. You can try again anytime.',
    };
  }
}
