import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhiteThemeComponent } from './white-theme.component';

describe('WhiteThemeComponent', () => {
  let component: WhiteThemeComponent;
  let fixture: ComponentFixture<WhiteThemeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WhiteThemeComponent]
    });
    fixture = TestBed.createComponent(WhiteThemeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
