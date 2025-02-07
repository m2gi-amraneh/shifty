import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeePlaningViewPage } from './employee-planing-view.page';

describe('EmployeePlaningViewPage', () => {
  let component: EmployeePlaningViewPage;
  let fixture: ComponentFixture<EmployeePlaningViewPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeePlaningViewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
