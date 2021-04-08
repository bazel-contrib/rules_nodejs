abstract class Service {
  abstract question(q: string): string;
}

export class UnhelpfulService extends Service {
  public question(q: string): string {
    return `Don't know`;
  }
}

export class HelpfulService extends Service {
  public question(q: string): string {
    return `42`;
  }
}