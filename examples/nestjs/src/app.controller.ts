import {Controller, Get} from '@nestjs/common';

@Controller()
export class AppController {
  @Get('hello')
  getGreeting(): {message: string} {
    return {message: 'Hello world!'};
  }
}
