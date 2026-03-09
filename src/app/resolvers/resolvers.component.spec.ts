import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResolversComponent } from './resolvers.component';

describe('ResolversComponent', () => {
  let component: ResolversComponent;
  let fixture: ComponentFixture<ResolversComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResolversComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResolversComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
