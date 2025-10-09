import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchesPage } from './matches.page';

describe('MatchesPage', () => {
  let component: MatchesPage;
  let fixture: ComponentFixture<MatchesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MatchesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
