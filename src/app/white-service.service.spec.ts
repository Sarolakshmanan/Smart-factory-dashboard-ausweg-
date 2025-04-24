import { TestBed } from '@angular/core/testing';

import { WhiteServiceService } from './white-service.service';

describe('WhiteServiceService', () => {
  let service: WhiteServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhiteServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
