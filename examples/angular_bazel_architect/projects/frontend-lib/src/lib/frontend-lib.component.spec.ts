import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FrontendLibComponent } from './frontend-lib.component';

describe('FrontendLibComponent', () => {
  let component: FrontendLibComponent;
  let fixture: ComponentFixture<FrontendLibComponent>;

  beforeEach(async(() => {
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
