import {Controller, Get} from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getGreeting(): string {
    return 'Hello world!';
  }
}
