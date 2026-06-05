---
name: virtualization-implementation
description: Guides the implementation of react-window for virtualizing large lists including FixedSizeList, VariableSizeList, keyboard navigation, accessibility patterns, and integration with TanStack Query
---

## Virtualization Implementation Guide

This skill guides implementation of `react-window` for virtualizing large lists to maintain performance.

## Installation

```bash
npm install react-window
# or
yarn add react-window
```

## When to Use Virtualization

Use virtualization for any list with >50 items:

- **Required for**: ActivityFeed, transaction lists, news feed, calendar events
- **Optional for**: Project lists, task lists (if <50 items typically)
- **Do NOT use for**: Small lists (<20 items) - overhead not worth it

## FixedSizeList

Use when all items have the same height. Simpler implementation, better performance.

### Basic FixedSizeList

```tsx
import { FixedSizeList } from 'react-window';

interface ItemData {
  items: Array<{ id: string; content: string }>;
}

const Row = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: ItemData;
}) => (
  <div style={style} className="p-4 border-b border-white/10">
    {data.items[index].content}
  </div>
);

const VirtualizedList = ({ items }: { items: Array<{ id: string; content: string }> }) => (
  <FixedSizeList
    height={400}
    itemCount={items.length}
    itemSize={50}
    width="100%"
    itemData={{ items }}
  >
    {Row}
  </FixedSizeList>
);
```

### With AutoSizer for Responsive Width

```tsx
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const ResponsiveList = ({ items }) => (
  <AutoSizer>
    {({ height, width }) => (
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={50}
        width={width}
        itemData={{ items }}
      >
        {Row}
      </FixedSizeList>
    )}
  </AutoSizer>
);
```

## VariableSizeList

Use when item heights vary. Requires `itemSize` function.

### Basic VariableSizeList

```tsx
import { VariableSizeList } from 'react-window';

const getItemSize = (index: number, data: ItemData) => {
  // Calculate height based on content
  const lines = data.items[index].content.split('\n').length;
  return lines * 24 + 16; // 24px per line + 16px padding
};

const Row = ({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: ItemData;
}) => (
  <div style={style} className="p-4 border-b border-white/10">
    {data.items[index].content}
  </div>
);

const VariableHeightList = ({ items }) => (
  <VariableSizeList
    height={400}
    itemCount={items.length}
    itemSize={(index) => getItemSize(index, { items })}
    width="100%"
    itemData={{ items }}
  >
    {Row}
  </VariableSizeList>
);
```

### Reset Item Sizes After Data Changes

```tsx
import { useRef } from 'react';
import { VariableSizeList } from 'react-window';

const DynamicList = ({ items }) => {
  const listRef = useRef<VariableSizeList>(null);

  // Reset item sizes when items change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [items]);

  return (
    <VariableSizeList
      ref={listRef}
      height={400}
      itemCount={items.length}
      itemSize={(index) => getItemSize(index, { items })}
      width="100%"
      itemData={{ items }}
    >
      {Row}
    </VariableSizeList>
  );
};
```

## Keyboard Navigation

Virtualized lists require custom keyboard navigation implementation.

### Keyboard Navigation Pattern

```tsx
import { useState, useCallback } from 'react';
import { FixedSizeList } from 'react-window';

const KeyboardNavigableList = ({ items }) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<FixedSizeList>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (index < items.length - 1) {
            const nextIndex = index + 1;
            setFocusedIndex(nextIndex);
            listRef.current?.scrollToItem(nextIndex, 'smart');
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (index > 0) {
            const prevIndex = index - 1;
            setFocusedIndex(prevIndex);
            listRef.current?.scrollToItem(prevIndex, 'smart');
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          listRef.current?.scrollToItem(0, 'start');
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          listRef.current?.scrollToItem(items.length - 1, 'end');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          // Activate item
          console.log('Activated item:', items[index]);
          break;
      }
    },
    [items]
  );

  const Row = ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: ItemData;
  }) => (
    <div
      style={style}
      tabIndex={0}
      role="listitem"
      aria-selected={focusedIndex === index}
      onKeyDown={(e) => handleKeyDown(e, index)}
      onFocus={() => setFocusedIndex(index)}
      className={`p-4 border-b border-white/10 ${focusedIndex === index ? 'bg-blue-500/20' : ''}`}
    >
      {data.items[index].content}
    </div>
  );

  return (
    <FixedSizeList
      ref={listRef}
      height={400}
      itemCount={items.length}
      itemSize={50}
      width="100%"
      itemData={{ items }}
    >
      {Row}
    </FixedSizeList>
  );
};
```

## Accessibility

Virtualized lists must support screen readers and keyboard navigation.

### ARIA Roles and Properties

```tsx
const AccessibleList = ({ items }) => (
  <div role="listbox" aria-label="Items list">
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={50}
      width="100%"
      itemData={{ items }}
    >
      {({ index, style, data }) => (
        <div
          style={style}
          role="option"
          aria-label={data.items[index].label}
          aria-selected={selectedItem === data.items[index].id}
          tabIndex={0}
        >
          {data.items[index].content}
        </div>
      )}
    </FixedSizeList>
  </div>
);
```

### Screen Reader Announcements

```tsx
const AnnouncingList = ({ items }) => {
  const [announcement, setAnnouncement] = useState('');

  const handleItemSelect = (item) => {
    setAnnouncement(`Selected ${item.label}`);
    // Clear announcement after it's read
    setTimeout(() => setAnnouncement(''), 1000);
  };

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <FixedSizeList
        height={400}
        itemCount={items.length}
        itemSize={50}
        width="100%"
        itemData={{ items, onSelect: handleItemSelect }}
      >
        {Row}
      </FixedSizeList>
    </>
  );
};
```

## Integration with TanStack Query

Combine virtualization with TanStack Query for efficient data fetching.

### Basic Integration

```tsx
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList } from 'react-window';

const fetchItems = async () => {
  const response = await fetch('/api/items');
  return response.json();
};

const QueryVirtualizedList = () => {
  const {
    data: items,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading items</div>;

  return (
    <FixedSizeList
      height={400}
      itemCount={items?.length || 0}
      itemSize={50}
      width="100%"
      itemData={{ items: items || [] }}
    >
      {Row}
    </FixedSizeList>
  );
};
```

### With Infinite Scroll

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { FixedSizeList } from 'react-window';

const fetchItems = async ({ pageParam = 0 }) => {
  const response = await fetch(`/api/items?page=${pageParam}`);
  return response.json();
};

const InfiniteVirtualizedList = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const allItems = data?.pages.flatMap((page) => page.items) || [];

  const handleItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    // Fetch next page when approaching end
    if (visibleStopIndex >= allItems.length - 10 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <FixedSizeList
      height={400}
      itemCount={allItems.length}
      itemSize={50}
      width="100%"
      itemData={{ items: allItems }}
      onItemsRendered={handleItemsRendered}
    >
      {Row}
    </FixedSizeList>
  );
};
```

## Performance Optimization

### Memoize Item Renderer

```tsx
import { useCallback } from 'react';
import { areEqual } from 'react-window';

const Row = memo(
  ({ index, style, data }: { index: number; style: React.CSSProperties; data: ItemData }) => (
    <div style={style} className="p-4 border-b border-white/10">
      {data.items[index].content}
    </div>
  ),
  areEqual
);

const OptimizedList = ({ items }) => (
  <FixedSizeList
    height={400}
    itemCount={items.length}
    itemSize={50}
    width="100%"
    itemData={{ items }}
  >
    {Row}
  </FixedSizeList>
);
```

### Configure Overscan

```tsx
<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={50}
  width="100%"
  overscanCount={2} // Render 2 extra items above/below viewport
  itemData={{ items }}
>
  {Row}
</FixedSizeList>
```

- Higher overscan (3-5): Smoother scrolling, more memory
- Lower overscan (1-2): Less memory, potential blank space on fast scroll
- Default: 1

## Common Patterns

### ActivityFeed with Virtualization

```tsx
import { VariableSizeList } from 'react-window';

const ActivityFeed = ({ activities }) => {
  const getItemSize = (index: number) => {
    const activity = activities[index];
    const baseHeight = 64;
    const detailHeight = activity.expanded ? 100 : 0;
    return baseHeight + detailHeight;
  };

  const ActivityRow = ({ index, style, data }) => (
    <div style={style} className="p-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500/20" />
        <div>
          <div className="text-sm font-medium">{data.items[index].agent}</div>
          <div className="text-xs text-gray-400">{data.items[index].action}</div>
        </div>
      </div>
      {data.items[index].expanded && (
        <div className="mt-2 text-sm text-gray-300">{data.items[index].details}</div>
      )}
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={activities.length}
      itemSize={getItemSize}
      width="100%"
      itemData={{ items: activities }}
    >
      {ActivityRow}
    </VariableSizeList>
  );
};
```

### Transaction List with Fixed Heights

```tsx
import { FixedSizeList } from 'react-window';

const TransactionList = ({ transactions }) => {
  const TransactionRow = ({ index, style, data }) => (
    <div style={style} className="flex items-center justify-between p-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700" />
        <div>
          <div className="text-sm font-medium">{data.items[index].merchant}</div>
          <div className="text-xs text-gray-400">{data.items[index].category}</div>
        </div>
      </div>
      <div
        className={`text-sm font-medium ${
          data.items[index].type === 'expense' ? 'text-red-400' : 'text-green-400'
        }`}
      >
        {data.items[index].amount}
      </div>
    </div>
  );

  return (
    <FixedSizeList
      height={500}
      itemCount={transactions.length}
      itemSize={64}
      width="100%"
      itemData={{ items: transactions }}
    >
      {TransactionRow}
    </FixedSizeList>
  );
};
```

### News Feed with Variable Heights

```tsx
import { VariableSizeList } from 'react-window';

const NewsFeed = ({ articles }) => {
  const getItemSize = (index: number) => {
    const article = articles[index];
    const baseHeight = 120;
    const summaryLines = article.summary.split('\n').length;
    return baseHeight + summaryLines * 20;
  };

  const NewsCard = ({ index, style, data }) => (
    <div style={style} className="p-4 border-b border-white/10">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded bg-gray-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium mb-1">{data.items[index].headline}</div>
          <div className="text-xs text-gray-400 mb-2">{data.items[index].source}</div>
          <div className="text-xs text-gray-300 line-clamp-2">{data.items[index].summary}</div>
        </div>
      </div>
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={articles.length}
      itemSize={getItemSize}
      width="100%"
      itemData={{ items: articles }}
    >
      {NewsCard}
    </VariableSizeList>
  );
};
```

## Testing

### Test with Large Datasets

```tsx
// Generate test data
const generateTestItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    content: `Item ${i}`,
  }));
};

// Test with 1000+ items
const largeDataset = generateTestItems(1000);
```

### Performance Metrics

- Monitor memory usage with large datasets (1000+ items)
- Verify scroll performance is smooth (60fps)
- Check that only visible items are rendered in DOM
- Test keyboard navigation responsiveness
- Verify focus management works correctly

## Anti-Patterns

- Do NOT use array index as itemKey - use stable unique IDs
- Do NOT virtualize small lists (<20 items)
- Do NOT forget keyboard navigation - virtual lists need custom handling
- Do NOT use both react-window and react-virtual - pick one
- Do NOT set overscanCount too high (wastes memory)
- Do NOT forget to memoize item renderers (causes re-renders)
- Do NOT forget to reset item sizes in VariableSizeList when data changes
