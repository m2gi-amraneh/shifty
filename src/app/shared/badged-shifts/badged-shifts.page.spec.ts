import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgedShiftsPage } from './badged-shifts.page';

describe('BadgedShiftsPage', () => {
  let component: BadgedShiftsPage;
  let fixture: ComponentFixture<BadgedShiftsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BadgedShiftsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
