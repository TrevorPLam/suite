---
trigger: always_on
---

# Virtualization Rules (react-window)

This project uses `react-window` for virtualizing large lists to maintain performance.

<!-- SECTION: when_to_virtualize -->

<when_to_virtualize>

- Use virtualization for any list with >50 items
- Required for: ActivityFeed, transaction lists, news feed, calendar events
- Optional for: Project lists, task lists (if <50 items typically)
- Do NOT virtualize small lists (<20 items) - overhead not worth it
  </when_to_virtualize>

<!-- ENDSECTION: when_to_virtualize -->

<!-- SECTION: library_usage -->

<library_usage>

- Package: `react-window` (NOT react-virtual - use only one)
- Import: `FixedSizeList` for uniform height items
- Import: `VariableSizeList` for variable height items
- Import: `areEqual` for custom item comparison
- Use `AutoSizer` for responsive container sizing
  </library_usage>

<!-- ENDSECTION: library_usage -->

<!-- SECTION: fixed_vs_variable -->

<fixed_vs_variable>

- **FixedSizeList**: Use when all items have same height
  - Simpler implementation, better performance
  - Specify `itemSize` prop (number in pixels)
  - Example: Transaction rows, calendar day cells

- **VariableSizeList**: Use when item heights vary
  - Requires `itemSize` function (index => height)
  - More complex, necessary for content with varying line counts
  - Example: ActivityFeed entries, news cards with different summaries
    </fixed_vs_variable>

<!-- ENDSECTION: fixed_vs_variable -->

<!-- SECTION: accessibility -->

<accessibility>
- Virtualized lists MUST support keyboard navigation
- Implement proper focus management:
  - Use `itemKey` prop for stable keys (not array index)
  - Ensure Tab key navigates through visible items
  - Support arrow key navigation within list
  - Maintain focus when list scrolls
- Provide ARIA roles: `role="listbox"` or `role="list"`
- Each item needs `role="option"` or `role="listitem"`
- Screen reader announcements for dynamic content
</accessibility>

<!-- ENDSECTION: accessibility -->

<!-- SECTION: integration_patterns -->

<integration_patterns>

- Integrate with TanStack Query data
- Use `itemData` prop to pass additional data to item renderer
- Memoize item renderers with `useCallback` to prevent re-renders
- Handle loading states with skeleton loaders above/below list
- Implement infinite scroll with `onItemsRendered` callback
  </integration_patterns>

<!-- ENDSECTION: integration_patterns -->

<!-- SECTION: performance -->

<performance>
- Virtualization maintains constant memory usage regardless of list size
- Only renders visible items + small buffer (overscan)
- Set `overscanCount` appropriately (default: 1-2 rows)
- Higher overscan = smoother scrolling but more memory
- Lower overscan = less memory but potential blank space on fast scroll
- Test with 1000+ items to verify performance
</performance>

<!-- ENDSECTION: performance -->

<!-- SECTION: keyboard_navigation -->

<keyboard_navigation>

- Implement custom keyboard handlers for virtualized lists
- Arrow Up/Down: Move focus between items
- Home/End: Jump to first/last item
- Page Up/Down: Scroll by page
- Enter/Space: Activate focused item
- Ensure focus stays within list bounds
- Sync scroll position with focus when keyboard navigation used
  </keyboard_navigation>

<!-- ENDSECTION: keyboard_navigation -->

<!-- SECTION: common_patterns -->

<common_patterns>

```tsx
// FixedSizeList for uniform items
import { FixedSizeList } from 'react-window';

const Row = ({ index, style, data }) => <div style={style}>{data.items[index].content}</div>;

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={50}
  width="100%"
  itemData={{ items }}
>
  {Row}
</FixedSizeList>;

// VariableSizeList for variable heights
import { VariableSizeList } from 'react-window';

const getItemSize = (index: number) => {
  // Calculate height based on content
  return items[index].lines * 24 + 16;
};

<VariableSizeList
  height={400}
  itemCount={items.length}
  itemSize={getItemSize}
  width="100%"
  itemData={{ items }}
>
  {Row}
</VariableSizeList>;

// With keyboard navigation
const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    // Move to next item
  }
  // ... other key handlers
};

const Row = ({ index, style, data }) => (
  <div style={style} tabIndex={0} onKeyDown={(e) => handleKeyDown(e, index)} role="listitem">
    {data.items[index].content}
  </div>
);

// With TanStack Query integration
const { data } = useQuery(['items'], fetchItems);

<FixedSizeList
  height={400}
  itemCount={data?.length || 0}
  itemSize={50}
  width="100%"
  itemData={{ items: data || [] }}
>
  {Row}
</FixedSizeList>;
```

</common_patterns>

<!-- ENDSECTION: common_patterns -->

<!-- SECTION: anti_patterns -->

<anti_patterns>

- Do NOT use array index as itemKey - use stable unique IDs
- Do NOT virtualize small lists (<20 items)
- Do NOT forget keyboard navigation - virtual lists need custom handling
- Do NOT use both react-window and react-virtual - pick one
- Do NOT set overscanCount too high (wastes memory)
- Do NOT forget to memoize item renderers (causes re-renders)
  </anti_patterns>

<!-- ENDSECTION: anti_patterns -->
