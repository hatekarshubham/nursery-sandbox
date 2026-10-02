import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockAdjustmentsComponent } from './stock-adjustments.component';

describe('StockAdjustmentsComponent', () => {
  let component: StockAdjustmentsComponent;
  let fixture: ComponentFixture<StockAdjustmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockAdjustmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockAdjustmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
