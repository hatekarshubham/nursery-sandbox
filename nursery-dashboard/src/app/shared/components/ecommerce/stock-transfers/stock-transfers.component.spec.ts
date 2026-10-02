import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockTransfersComponent } from './stock-transfers.component';

describe('StockTransfersComponent', () => {
  let component: StockTransfersComponent;
  let fixture: ComponentFixture<StockTransfersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockTransfersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockTransfersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
