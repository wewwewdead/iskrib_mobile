import {getNextOffset} from '../src/lib/utils/journalHelpers';

describe('getNextOffset', () => {
  it('advances from the previous offset instead of retained page count', () => {
    expect(getNextOffset({data: new Array(10).fill({})}, 0, 10)).toBe(10);
    expect(getNextOffset({data: new Array(10).fill({})}, 10, 10)).toBe(20);
    expect(getNextOffset({data: new Array(10).fill({})}, 40, 10)).toBe(50);
  });

  it('stops pagination when the server returns a short page', () => {
    expect(getNextOffset({data: new Array(4).fill({})}, 40, 10)).toBeUndefined();
  });
});
