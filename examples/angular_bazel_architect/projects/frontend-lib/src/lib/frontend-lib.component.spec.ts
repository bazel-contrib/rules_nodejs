import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FrontendLibComponent } from './frontend-lib.component';

describe('FrontendLibComponent', () => {
  let component: FrontendLibComponent;
  let fixture: ComponentFixture<FrontendLibComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ FrontendLibComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FrontendLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
