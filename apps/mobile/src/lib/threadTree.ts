import type {ThreadJournalEntry} from './api/mobileApi';

// ═══════════════════════════════════════════════════════════════════
// threadTree — pure utilities for reconstructing a real parent/child
// tree from the flat array returned by /journal/:id/thread.
//
// The server returns thread rows pre-ordered (depth ASC, created_at ASC)
// but the order alone can't express branching — if one parent has two
// children, the client needs to know which children share a parent so
// they render at the same depth under the same spine. That's what
// buildThreadTree does: one O(n) pass to index rows by id and by
// parent, then a recursive walk from the root to emit a nested
// structure with stable child order and connector-line hints.
//
// No I/O, no hooks, no mocks in tests.
// ═══════════════════════════════════════════════════════════════════

export interface ThreadTreeNode {
  journal: ThreadJournalEntry;
  /** Depth from the root — root is 0, direct children 1, etc. */
  depth: number;
  /** Ordered children at the next depth. */
  children: ThreadTreeNode[];
  /** True if this node is its parent's last child — used for ┬/├/└ elbow rendering. */
  isLastChildOfParent: boolean;
  /** Root-only. True when this root's own parent_journal_id is non-null
   *  AND that parent isn't present in the input set — i.e. the chain
   *  starts in the middle because earlier posts were filtered out by a
   *  privacy flip, a block, or an access check. The UI should surface
   *  an "earlier posts unavailable" marker above this root. */
  hasEarlierGap?: boolean;
  /** Root-only. Count of input nodes that didn't end up in this tree —
   *  i.e. disconnected forests whose ancestors were filtered out so they
   *  can't attach to the chosen root. Non-zero means the render is
   *  incomplete and a "some posts unavailable" marker should appear. */
  droppedCount?: number;
}

/**
 * Build a parent/child tree from the flat list returned by the thread
 * RPC. Returns null when the input is empty. The tree root is the row
 * whose parent is either null or not present in the input set (the
 * latter case protects against privacy gaps where an ancestor was
 * filtered out).
 */
export function buildThreadTree(
  nodes: ThreadJournalEntry[],
): ThreadTreeNode | null {
  if (!nodes || nodes.length === 0) return null;

  const byId = new Map<string, ThreadJournalEntry>();
  nodes.forEach(n => byId.set(n.id, n));

  // Root candidates — prefer an explicit null parent (true chain head);
  // fall back to any node whose parent isn't in the input set (privacy
  // gap — the chain starts mid-stream because earlier posts were filtered).
  let root: ThreadJournalEntry | undefined = nodes.find(
    n => !n.parent_journal_id,
  );
  if (!root) {
    root = nodes.find(
      n => n.parent_journal_id && !byId.has(n.parent_journal_id),
    );
  }
  if (!root) return null;

  // Index children by parent id, then sort each sibling list by
  // created_at so the branching order is stable and chronological.
  const childrenByParent = new Map<string, ThreadJournalEntry[]>();
  nodes.forEach(n => {
    if (n.parent_journal_id && byId.has(n.parent_journal_id)) {
      const list = childrenByParent.get(n.parent_journal_id) ?? [];
      list.push(n);
      childrenByParent.set(n.parent_journal_id, list);
    }
  });
  childrenByParent.forEach(list =>
    list.sort((a, b) =>
      (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    ),
  );

  let reachableCount = 0;
  const build = (
    journal: ThreadJournalEntry,
    depth: number,
    isLastChildOfParent: boolean,
  ): ThreadTreeNode => {
    reachableCount++;
    const kids = childrenByParent.get(journal.id) ?? [];
    return {
      journal,
      depth,
      isLastChildOfParent,
      children: kids.map((c, i) =>
        build(c, depth + 1, i === kids.length - 1),
      ),
    };
  };

  const tree = build(root, 0, true);

  // Annotate the root with gap / dropped-forest signals so the UI can
  // surface an honest "earlier posts unavailable" marker instead of
  // rendering a partial chain as if it were complete.
  tree.hasEarlierGap = Boolean(
    root.parent_journal_id && !byId.has(root.parent_journal_id),
  );
  tree.droppedCount = Math.max(0, nodes.length - reachableCount);

  return tree;
}

/**
 * Pre-order traversal (parent first, then each child subtree in order).
 * The returned array is directly renderable by a FlatList — each row's
 * `depth` drives indentation and its `isLastChildOfParent` drives which
 * elbow glyph to show.
 */
export function flattenThreadTree(root: ThreadTreeNode): ThreadTreeNode[] {
  const out: ThreadTreeNode[] = [];
  const visit = (n: ThreadTreeNode) => {
    out.push(n);
    n.children.forEach(visit);
  };
  visit(root);
  return out;
}

/**
 * Count branching points. Each parent with N > 1 children contributes
 * N - 1 branches (the first child is "the main line"; each additional
 * child is a branch off that line). Returns 0 for any purely linear
 * thread. Used for the "· K branches" subtitle.
 */
export function countThreadBranches(root: ThreadTreeNode): number {
  let branches = 0;
  const visit = (n: ThreadTreeNode) => {
    if (n.children.length > 1) {
      branches += n.children.length - 1;
    }
    n.children.forEach(visit);
  };
  visit(root);
  return branches;
}

/**
 * Walk from the root down to a specific journal id along the
 * first-descendant spine once the target is reached, producing a
 * linear "Earlier → This post → Later" excerpt for compact views.
 * Returns an empty array if the target isn't in the tree.
 */
export function spineThroughJournal(
  root: ThreadTreeNode,
  journalId: string,
): ThreadTreeNode[] {
  // Find the path from root to the target (DFS).
  const path: ThreadTreeNode[] = [];
  const findPath = (node: ThreadTreeNode): boolean => {
    path.push(node);
    if (node.journal.id === journalId) return true;
    for (const child of node.children) {
      if (findPath(child)) return true;
    }
    path.pop();
    return false;
  };

  if (!findPath(root)) return [];

  // Extend forward from the target along its first-descendant chain.
  const forward: ThreadTreeNode[] = [];
  let cursor = path[path.length - 1];
  while (cursor.children.length > 0) {
    cursor = cursor.children[0];
    forward.push(cursor);
  }

  return [...path, ...forward];
}
