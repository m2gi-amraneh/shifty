import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoBadgePage } from './geo-badge.page';

describe('GeoBadgePage', () => {
  let component: GeoBadgePage;
  let fixture: ComponentFixture<GeoBadgePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GeoBadgePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
