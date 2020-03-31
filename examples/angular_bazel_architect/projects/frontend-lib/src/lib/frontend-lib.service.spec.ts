import { TestBed } from '@angular/core/testing';

import { FrontendLibService } from './frontend-lib.service';

describe('FrontendLibService', () => {
  let service: FrontendLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrontendLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
