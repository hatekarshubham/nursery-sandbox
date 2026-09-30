import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddStockTransferComponent } from './add-stock-transfer.component';

describe('AddStockTransferComponent', () => {
  let component: AddStockTransferComponent;
  let fixture: ComponentFixture<AddStockTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddStockTransferComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddStockTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
