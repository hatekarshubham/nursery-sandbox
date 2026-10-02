import { TestBed } from '@angular/core/testing';

import { SalesServiceTsService } from './sales.service.ts.service';

describe('SalesServiceTsService', () => {
  let service: SalesServiceTsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SalesServiceTsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
