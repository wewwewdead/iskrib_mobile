import React from 'react';
import renderer from 'react-test-renderer';
import {PostCard} from '../src/components/PostCard/PostCard';

jest.mock('../src/theme/spacing', () => ({
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
  },
  radii: {
    lg: 10,
    xl: 12,
    pill: 999,
  },
  shadows: () => ({
    card: {},
  }),
}));

jest.mock('../src/theme/typography', () => ({
  fonts: {
    ui: {
      medium: 'System',
      semiBold: 'System',
      regular: 'System',
    },
  },
  typeScale: {
    cardTitle: {},
    bodySmall: {},
  },
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      bgCard: '#111111',
      borderCard: '#222222',
      textFaint: '#777777',
      textSecondary: '#DDDDDD',
      textHeading: '#FFFFFF',
      textBody: '#CCCCCC',
      bgPrimary: '#000000',
      bgPill: '#1A1A1A',
      accentSage: '#7AA37A',
      accentAmber: '#C4943E',
    },
    scaledType: {
      cardTitle: {},
      bodySmall: {},
    },
  }),
}));

jest.mock('../src/components/Avatar', () => {
  const {createElement} = require('react');
  return {
    Avatar: (props: Record<string, unknown>) => createElement('Avatar', props),
  };
});

jest.mock('../src/components/NetworkImage', () => {
  const {createElement} = require('react');
  return {
    NetworkImage: (props: Record<string, unknown>) =>
      createElement('NetworkImage', props),
  };
});

jest.mock('../src/components/PostCard/ActionBar', () => {
  const {createElement} = require('react');
  return {
    ActionBar: (props: Record<string, unknown>) =>
      createElement('ActionBar', props),
  };
});

jest.mock('../src/components/icons', () => {
  const {createElement} = require('react');
  return {
    BadgeCheckIcon: (props: Record<string, unknown>) =>
      createElement('BadgeCheckIcon', props),
    LightbulbIcon: (props: Record<string, unknown>) =>
      createElement('LightbulbIcon', props),
    PenIcon: (props: Record<string, unknown>) => createElement('PenIcon', props),
    RepostIcon: (props: Record<string, unknown>) =>
      createElement('RepostIcon', props),
  };
});

const createCard = (
  overrides: Partial<React.ComponentProps<typeof PostCard>> = {},
) => {
  let tree: renderer.ReactTestRenderer;

  renderer.act(() => {
    tree = renderer.create(
      <PostCard
        title="A post"
        bodyPreview="Preview text"
        authorName="Writer"
        likeCount={2}
        commentCount={1}
        {...overrides}
      />,
    );
  });

  return tree!;
};

describe('PostCard', () => {
  it('hides the edit control by default', () => {
    const tree = createCard();

    expect(
      tree.root.findAllByProps({accessibilityLabel: 'Edit post'}),
    ).toHaveLength(0);
  });

  it('renders the edit control and triggers onEdit', () => {
    const onEdit = jest.fn();
    const tree = createCard({
      showEditAction: true,
      onEdit,
    });

    const editButton = tree.root.findByProps({accessibilityLabel: 'Edit post'});
    const stopPropagation = jest.fn();

    renderer.act(() => {
      editButton.props.onPress({stopPropagation});
    });

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  // [REGRESSION #1] Protects tap-to-navigate through the structural split of the
  // outer Pressable into View + inner content Pressable + ActionBar sibling. If
  // this fails after the split, the split broke the basic tap contract.
  it('fires onPress on the card when only onPress is wired (no onLongPress)', () => {
    const onPress = jest.fn();
    const tree = createCard({onPress});

    const card = tree.root.findByProps({testID: 'post-card'});

    renderer.act(() => {
      card.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // [REGRESSION #2] Snapshot guards against unintended rendering changes from
  // the structural split. Snapshot is captured against the pre-split tree, then
  // verified after the split. A diff surfaces any accidental layout drift
  // (extra wrapper, reordered children, missing prop).
  it('renders a stable snapshot without onLongPress prop', () => {
    const tree = createCard();
    expect(tree.toJSON()).toMatchSnapshot();
  });

  // [REGRESSION #5] THE IRON-LAW GATE. ActionBar must NOT be a descendant of
  // the inner Pressable (testID "post-card"). It must be a SIBLING. If
  // ActionBar is a child of the card Pressable, long-pressing the reaction
  // button inside ActionBar would bubble up to the card onLongPress and fire
  // a peek at the same time as the reaction picker. The structural split is
  // what prevents this gesture collision: ActionBar lives outside the
  // Pressable subtree, so RN touch system cannot bubble from one to the
  // other. This test enforces that structure.
  it('places ActionBar as a sibling of the card Pressable, not a descendant', () => {
    const tree = createCard({onLongPress: jest.fn()});

    const card = tree.root.findByProps({testID: 'post-card'});

    // ActionBar must exist somewhere in the tree.
    const allActionBars = tree.root.findAllByType(
      'ActionBar' as unknown as React.ComponentType,
    );
    expect(allActionBars.length).toBe(1);

    // ActionBar must NOT exist inside the card Pressable subtree.
    const actionBarsInsideCard = card.findAllByType(
      'ActionBar' as unknown as React.ComponentType,
    );
    expect(actionBarsInsideCard.length).toBe(0);
  });

  // [REGRESSION #3] onLongPress fires through the prop wiring when the
  // card Pressable onLongPress is invoked. In the jest environment,
  // onPressIn's measureInWindow call no-ops (react-test-renderer's
  // default host-ref stub never invokes the callback), so the cached
  // rect stays null and handleLongPress falls through to calling
  // onLongPress() with no args. That's the exact fall-through path the
  // production code needs to handle (also used by the VoiceOver rotor),
  // so the test verifies the wiring AND the fall-through behavior.
  it('fires onLongPress when the card Pressable receives onLongPress', () => {
    const onLongPress = jest.fn();
    const tree = createCard({onLongPress});

    const card = tree.root.findByProps({testID: 'post-card'});

    renderer.act(() => {
      card.props.onLongPress();
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
    // Called with no rect because measurement didn't complete in the
    // test environment. Production path (real measureInWindow) is
    // verified on-device as part of the pre-merge manual QA.
    expect(onLongPress).toHaveBeenCalledWith();
  });

  // [REGRESSION #3b] The Pressable wires onPressIn so production builds
  // can measure the card's position before onLongPress fires. We verify
  // the prop is declared; the actual measurement is an on-device concern.
  it('wires onPressIn on the card Pressable when onLongPress is provided', () => {
    const onLongPress = jest.fn();
    const tree = createCard({onLongPress});
    const card = tree.root.findByProps({testID: 'post-card'});

    expect(typeof card.props.onPressIn).toBe('function');
    expect(typeof card.props.onPressOut).toBe('function');
    // Calling them must not throw (they operate on refs that are null
    // in the test environment).
    expect(() => {
      renderer.act(() => {
        card.props.onPressIn();
      });
      renderer.act(() => {
        card.props.onPressOut();
      });
    }).not.toThrow();
  });

  // [REGRESSION #3c] When no onLongPress is wired, onPressIn and
  // onPressOut are also undefined — PostCard doesn't pay the measurement
  // cost on every regular card tap.
  it('omits onPressIn/onPressOut when onLongPress is not wired', () => {
    const tree = createCard();
    const card = tree.root.findByProps({testID: 'post-card'});

    expect(card.props.onPressIn).toBeUndefined();
    expect(card.props.onPressOut).toBeUndefined();
  });

  // [REGRESSION #4] When no onLongPress is wired, accessibility props are
  // undefined so the card does not falsely advertise a Peek post action
  // it cannot perform.
  it('omits peek accessibility props when onLongPress is not wired', () => {
    const tree = createCard();
    const card = tree.root.findByProps({testID: 'post-card'});

    expect(card.props.accessibilityHint).toBeUndefined();
    expect(card.props.accessibilityActions).toBeUndefined();
    expect(card.props.onAccessibilityAction).toBeUndefined();
  });

  // [REGRESSION #6] When onLongPress IS wired, accessibility props declare
  // the Peek post rotor action so VoiceOver and TalkBack users can trigger
  // peek from the accessibility menu.
  it('declares peek accessibility props when onLongPress is wired', () => {
    const onLongPress = jest.fn();
    const tree = createCard({onLongPress});
    const card = tree.root.findByProps({testID: 'post-card'});

    expect(card.props.accessibilityHint).toBe(
      'Hold to preview, tap to read with comments',
    );
    expect(card.props.accessibilityActions).toEqual([
      {name: 'longpress', label: 'Peek post'},
    ]);
    expect(typeof card.props.onAccessibilityAction).toBe('function');

    renderer.act(() => {
      card.props.onAccessibilityAction({
        nativeEvent: {actionName: 'longpress'},
      });
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
