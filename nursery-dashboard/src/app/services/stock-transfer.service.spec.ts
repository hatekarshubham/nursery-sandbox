import { TestBed } from '@angular/core/testing';

import { StockTransferService } from './stock-transfer.service';

describe('StockTransferService', () => {
  let service: StockTransferService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockTransferService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
