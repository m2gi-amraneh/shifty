import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeDashboardPage } from './employe-dashboard.page';

describe('EmployeDashboardPage', () => {
  let component: EmployeDashboardPage;
  let fixture: ComponentFixture<EmployeDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
