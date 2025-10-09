import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagesModalComponent } from './messages-modal.component';

describe('MessagesModalComponent', () => {
  let component: MessagesModalComponent;
  let fixture: ComponentFixture<MessagesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessagesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
