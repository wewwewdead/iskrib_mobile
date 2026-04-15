import {
  buildThreadTree,
  countThreadBranches,
  flattenThreadTree,
  spineThroughJournal,
} from '../src/lib/threadTree';
import type {ThreadJournalEntry} from '../src/lib/api/mobileApi';

// Minimal factory so tests read as data, not ceremony. Every field the
// tree code actually reads is covered; everything else defaults null.
const makeEntry = (o: Partial<ThreadJournalEntry>): ThreadJournalEntry =>
  ({
    id: 'x',
    title: 'Untitled',
    created_at: '2026-01-01T00:00:00Z',
    parent_journal_id: null,
    depth: 0,
    users: {id: 'u', name: 'Author', image_url: null, badge: null},
    ...o,
  } as ThreadJournalEntry);

describe('buildThreadTree', () => {
  it('returns null for empty input', () => {
    expect(buildThreadTree([])).toBeNull();
  });

  it('builds a single-root tree with no children', () => {
    const tree = buildThreadTree([makeEntry({id: 'a'})]);
    expect(tree?.journal.id).toBe('a');
    expect(tree?.depth).toBe(0);
    expect(tree?.children).toEqual([]);
    expect(tree?.isLastChildOfParent).toBe(true);
    expect(tree?.hasEarlierGap).toBe(false);
    expect(tree?.droppedCount).toBe(0);
  });

  it('orders siblings chronologically and flags the last child', () => {
    const tree = buildThreadTree([
      makeEntry({
        id: 'root',
        parent_journal_id: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
      makeEntry({
        id: 'c2',
        parent_journal_id: 'root',
        created_at: '2026-01-03T00:00:00Z',
      }),
      makeEntry({
        id: 'c1',
        parent_journal_id: 'root',
        created_at: '2026-01-02T00:00:00Z',
      }),
    ]);
    expect(tree?.children.map(c => c.journal.id)).toEqual(['c1', 'c2']);
    expect(tree?.children[0].isLastChildOfParent).toBe(false);
    expect(tree?.children[1].isLastChildOfParent).toBe(true);
  });

  it('falls back to an orphan root when no null-parent node exists and flags the gap', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'b', parent_journal_id: 'a-filtered'}),
      makeEntry({id: 'c', parent_journal_id: 'b'}),
    ]);
    expect(tree?.journal.id).toBe('b');
    expect(tree?.children.map(c => c.journal.id)).toEqual(['c']);
    expect(tree?.hasEarlierGap).toBe(true);
    expect(tree?.droppedCount).toBe(0);
  });

  it('reports droppedCount when a disconnected forest is dropped', () => {
    // Two independent chains. The one with explicit null parent wins;
    // the other is unreachable and should surface as droppedCount=2.
    const tree = buildThreadTree([
      makeEntry({id: 'r1', parent_journal_id: null}),
      makeEntry({id: 'a1', parent_journal_id: 'r1'}),
      makeEntry({id: 'r2', parent_journal_id: 'missing-1'}),
      makeEntry({id: 'a2', parent_journal_id: 'r2'}),
    ]);
    expect(tree?.journal.id).toBe('r1');
    expect(tree?.droppedCount).toBe(2);
  });

  it('returns null when the input has no usable root', () => {
    // Every node points at itself (no valid parents, no null parents).
    const tree = buildThreadTree([
      makeEntry({id: 'a', parent_journal_id: 'a'}),
    ]);
    // Root detection falls back to "parent in set", so an entry whose
    // parent_journal_id IS in the set isn't an orphan — returns null.
    expect(tree).toBeNull();
  });
});

describe('flattenThreadTree', () => {
  it('emits a pre-order DFS traversal', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'r', created_at: '2026-01-01T00:00:00Z'}),
      makeEntry({
        id: 'a',
        parent_journal_id: 'r',
        created_at: '2026-01-02T00:00:00Z',
      }),
      makeEntry({
        id: 'b',
        parent_journal_id: 'r',
        created_at: '2026-01-03T00:00:00Z',
      }),
      makeEntry({
        id: 'a1',
        parent_journal_id: 'a',
        created_at: '2026-01-04T00:00:00Z',
      }),
    ])!;
    expect(flattenThreadTree(tree).map(n => n.journal.id)).toEqual([
      'r',
      'a',
      'a1',
      'b',
    ]);
  });
});

describe('countThreadBranches', () => {
  it('returns 0 for a linear thread', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'r'}),
      makeEntry({id: 'a', parent_journal_id: 'r'}),
      makeEntry({id: 'b', parent_journal_id: 'a'}),
    ])!;
    expect(countThreadBranches(tree)).toBe(0);
  });

  it('returns N-1 per multi-child parent, summed across the tree', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'r', created_at: '2026-01-01T00:00:00Z'}),
      makeEntry({
        id: 'a',
        parent_journal_id: 'r',
        created_at: '2026-01-02T00:00:00Z',
      }),
      makeEntry({
        id: 'b',
        parent_journal_id: 'r',
        created_at: '2026-01-03T00:00:00Z',
      }),
      makeEntry({
        id: 'c',
        parent_journal_id: 'r',
        created_at: '2026-01-04T00:00:00Z',
      }),
      makeEntry({
        id: 'd',
        parent_journal_id: 'a',
        created_at: '2026-01-05T00:00:00Z',
      }),
      makeEntry({
        id: 'e',
        parent_journal_id: 'a',
        created_at: '2026-01-06T00:00:00Z',
      }),
    ])!;
    // r has 3 kids = 2 branches, a has 2 kids = 1 branch. Total: 3.
    expect(countThreadBranches(tree)).toBe(3);
  });
});

describe('spineThroughJournal', () => {
  it('returns [] when the target id is not in the tree', () => {
    const tree = buildThreadTree([makeEntry({id: 'r'})])!;
    expect(spineThroughJournal(tree, 'missing')).toEqual([]);
  });

  it('returns ancestors through target then the first-descendant chain', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'r', created_at: '2026-01-01T00:00:00Z'}),
      makeEntry({
        id: 'a',
        parent_journal_id: 'r',
        created_at: '2026-01-02T00:00:00Z',
      }),
      makeEntry({
        id: 'b',
        parent_journal_id: 'a',
        created_at: '2026-01-03T00:00:00Z',
      }),
      makeEntry({
        id: 'c',
        parent_journal_id: 'b',
        created_at: '2026-01-04T00:00:00Z',
      }),
    ])!;
    expect(spineThroughJournal(tree, 'a').map(n => n.journal.id)).toEqual([
      'r',
      'a',
      'b',
      'c',
    ]);
  });

  it('prefers the chronologically earliest child when extending forward', () => {
    const tree = buildThreadTree([
      makeEntry({id: 'r', created_at: '2026-01-01T00:00:00Z'}),
      makeEntry({
        id: 'a',
        parent_journal_id: 'r',
        created_at: '2026-01-02T00:00:00Z',
      }),
      makeEntry({
        id: 'a1',
        parent_journal_id: 'a',
        created_at: '2026-01-03T00:00:00Z',
      }),
      makeEntry({
        id: 'a2',
        parent_journal_id: 'a',
        created_at: '2026-01-04T00:00:00Z',
      }),
    ])!;
    expect(spineThroughJournal(tree, 'r').map(n => n.journal.id)).toEqual([
      'r',
      'a',
      'a1',
    ]);
  });
});
