import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicProductsComponent } from './public-products.component';

describe('PublicProductsComponent', () => {
  let component: PublicProductsComponent;
  let fixture: ComponentFixture<PublicProductsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicProductsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
