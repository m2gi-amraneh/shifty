import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageEmployeesPage } from './manage-employees.page';

describe('ManageEmployeesPage', () => {
  let component: ManageEmployeesPage;
  let fixture: ComponentFixture<ManageEmployeesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageEmployeesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
