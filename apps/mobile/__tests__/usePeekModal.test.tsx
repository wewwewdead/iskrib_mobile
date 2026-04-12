import renderer from 'react-test-renderer';
import {renderHook} from './helpers/renderHook';
import type {JournalItem} from '../src/lib/api/mobileApi';

// Mocks BEFORE the import of usePeekModal so the hook sees the mocked deps.
const mockTapHaptic = jest.fn();
jest.mock('../src/lib/haptics', () => ({
  tapHaptic: () => mockTapHaptic(),
}));

const mockSetItem = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (...args: unknown[]) => mockSetItem(...args),
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

const mockInvalidateQueries = jest.fn();
jest.mock('../src/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
  },
}));

import {usePeekModal, PEEK_HINT_SEEN_KEY} from '../src/hooks/usePeekModal';

const makePost = (id: string = 'post-1'): JournalItem =>
  ({
    id,
    title: 'Test post',
    content: 'Body content',
  }) as JournalItem;

describe('usePeekModal', () => {
  beforeEach(() => {
    mockTapHaptic.mockClear();
    mockSetItem.mockClear();
    mockInvalidateQueries.mockClear();
  });

  // [TEST #7] openPeek sets peekPost + fires tapHaptic exactly once.
  it('openPeek fires tapHaptic and sets peekPost', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    expect(result.current.peekPost).toBeNull();

    const post = makePost();
    renderer.act(() => {
      result.current.openPeek(post);
    });

    expect(mockTapHaptic).toHaveBeenCalledTimes(1);
    expect(result.current.peekPost).toBe(post);
  });

  // [TEST #8] openPeek guards against isOtherModalOpen=true. No state change,
  // no haptic, no AsyncStorage write.
  it('openPeek is a no-op when isOtherModalOpen is true', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: true}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost());
    });

    expect(mockTapHaptic).not.toHaveBeenCalled();
    expect(result.current.peekPost).toBeNull();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  // [TEST #9] The stacked-modal guard reads the LATEST isOtherModalOpen value
  // via ref-sync-inline during render, not a stale closure.
  it('reads latest isOtherModalOpen after rerender (no stale closure)', () => {
    let isOtherModalOpen = false;
    const {result, rerender} = renderHook(() =>
      usePeekModal({isOtherModalOpen}),
    );

    // Flip the flag to true, rerender so the hook syncs the new value.
    isOtherModalOpen = true;
    rerender();

    // openPeek captured in the initial render should still respect the
    // LATEST isOtherModalOpen value (true).
    renderer.act(() => {
      result.current.openPeek(makePost());
    });

    expect(mockTapHaptic).not.toHaveBeenCalled();
    expect(result.current.peekPost).toBeNull();
  });

  // [TEST #10] First openPeek writes PEEK_HINT_SEEN_KEY to AsyncStorage.
  it('first openPeek writes PEEK_HINT_SEEN_KEY to AsyncStorage', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost());
    });

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(PEEK_HINT_SEEN_KEY, 'true');
  });

  // [TEST #11] First openPeek invalidates the ['peekHintSeen'] query so the
  // PeekHint banner re-reads AsyncStorage and hides itself.
  it('first openPeek invalidates the peekHintSeen query', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost());
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['peekHintSeen'],
    });
  });

  // [TEST #12] Subsequent openPeek calls do NOT re-write PEEK_HINT_SEEN_KEY
  // or re-invalidate the query. Tracked via internal ref.
  it('subsequent openPeek calls skip the first-open side effects', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost('post-1'));
    });
    renderer.act(() => {
      result.current.closePeek();
    });
    renderer.act(() => {
      result.current.openPeek(makePost('post-2'));
    });

    // First-open side effects fire exactly once.
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  // [TEST #13] openPeek does not crash when AsyncStorage.setItem rejects.
  it('openPeek does not crash if AsyncStorage.setItem fails', () => {
    mockSetItem.mockRejectedValueOnce(new Error('Storage full'));

    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    expect(() => {
      renderer.act(() => {
        result.current.openPeek(makePost());
      });
    }).not.toThrow();

    expect(result.current.peekPost).not.toBeNull();
  });

  // [TEST #14] closePeek sets peekPost to null.
  it('closePeek clears peekPost', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost());
    });
    expect(result.current.peekPost).not.toBeNull();

    renderer.act(() => {
      result.current.closePeek();
    });
    expect(result.current.peekPost).toBeNull();
  });

  // [TEST #15] openPeek with a sourceRect stores the rect alongside
  // peekPost, and closePeek clears both in sync.
  it('openPeek stores sourceRect and closePeek clears it', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    expect(result.current.peekSourceRect).toBeNull();

    const rect = {x: 12, y: 34, width: 300, height: 180};
    renderer.act(() => {
      result.current.openPeek(makePost(), rect);
    });

    expect(result.current.peekPost).not.toBeNull();
    expect(result.current.peekSourceRect).toEqual(rect);

    renderer.act(() => {
      result.current.closePeek();
    });

    expect(result.current.peekPost).toBeNull();
    expect(result.current.peekSourceRect).toBeNull();
  });

  // [TEST #16] openPeek without a sourceRect defaults peekSourceRect to
  // null so PeekModal uses its fallback entry animation.
  it('openPeek without a sourceRect leaves peekSourceRect null', () => {
    const {result} = renderHook(() =>
      usePeekModal({isOtherModalOpen: false}),
    );

    renderer.act(() => {
      result.current.openPeek(makePost());
    });

    expect(result.current.peekPost).not.toBeNull();
    expect(result.current.peekSourceRect).toBeNull();
  });
});
