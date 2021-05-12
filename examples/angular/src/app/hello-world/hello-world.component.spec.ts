import { TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {MaterialModule} from '../../shared/material/material.module';

import {HelloWorldComponent} from './hello-world.component';

describe('BannerComponent (inline template)', () => {
  function createComponent() {
    TestBed.configureTestingModule({
      declarations: [HelloWorldComponent],  // declare the test component
      imports: [BrowserAnimationsModule, MaterialModule],
    });
    TestBed.compileComponents();


    const fixture = TestBed.createComponent(HelloWorldComponent);
    const comp = fixture.componentInstance;
    const el = fixture.debugElement.query(By.css('div')).nativeElement;

    fixture.detectChanges();

    return {fixture, comp, el};
  }

  it('should display original title', () => {
    const { el, comp } = createComponent();

    expect(el.textContent).toContain(comp.name);
  });

  it('should display a different test title', () => {
    const { fixture, el, comp } = createComponent();
    comp.name = 'Test';
    fixture.detectChanges();
    expect(el.textContent).toContain('Test');
  });
});
