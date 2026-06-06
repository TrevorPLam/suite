import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { TaskRow } from './TaskRow';

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
};

type VirtualizedTaskListProps = {
  tasks: TaskItem[];
  editingTaskId: string | null;
  editTitle: string;
  editDueDate: string;
  editPriority: 'low' | 'medium' | 'high';
  editTags: string[];
  editTagInput: string;
  selectedTaskIds: Set<string>;
  submitting: boolean;
  onToggleTaskSelection: (taskId: string) => void;
  onEditTitleChange: (title: string) => void;
  onEditDueDateChange: (dueDate: string) => void;
  onEditPriorityChange: (priority: 'low' | 'medium' | 'high') => void;
  onEditTagsChange: (tags: string[]) => void;
  onEditTagInputChange: (tagInput: string) => void;
  onAddEditTag: () => void;
  onRemoveEditTag: (tagToRemove: string) => void;
  onStartEditing: (task: TaskItem) => void;
  onCancelEditing: () => void;
  onSaveEdit: (task: TaskItem) => void;
  onToggleCompletion: (task: TaskItem) => void;
  onArchive: (task: TaskItem, archived: boolean) => void;
  onDelete: (task: TaskItem) => void;
};

const ITEM_HEIGHT = 120; // Approximate height of each task row

export function VirtualizedTaskList({
  tasks,
  editingTaskId,
  editTitle,
  editDueDate,
  editPriority,
  editTags,
  editTagInput,
  selectedTaskIds,
  submitting,
  onToggleTaskSelection,
  onEditTitleChange,
  onEditDueDateChange,
  onEditPriorityChange,
  onEditTagsChange,
  onEditTagInputChange,
  onAddEditTag,
  onRemoveEditTag,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onToggleCompletion,
  onArchive,
  onDelete,
}: VirtualizedTaskListProps) {
  const Row = ({ index, style }: ListChildComponentProps) => {
    const task = tasks[index];
    if (!task) return null;

    return (
      <div style={style}>
        <li
          key={task.id}
          style={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: 16,
            display: 'grid',
            gap: 12,
            background: task.completed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            margin: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
            <input
              type="checkbox"
              checked={selectedTaskIds.has(task.id)}
              onChange={() => onToggleTaskSelection(task.id)}
              disabled={submitting}
              style={{ marginTop: 4 }}
            />
            <div style={{ flex: 1 }}>
              <TaskRow
                task={task}
                editingTaskId={editingTaskId}
                editTitle={editTitle}
                editDueDate={editDueDate}
                editPriority={editPriority}
                editTags={editTags}
                editTagInput={editTagInput}
                submitting={submitting}
                onEditTitleChange={onEditTitleChange}
                onEditDueDateChange={onEditDueDateChange}
                onEditPriorityChange={onEditPriorityChange}
                onEditTagsChange={onEditTagsChange}
                onEditTagInputChange={onEditTagInputChange}
                onAddEditTag={onAddEditTag}
                onRemoveEditTag={onRemoveEditTag}
                onStartEditing={onStartEditing}
                onCancelEditing={onCancelEditing}
                onSaveEdit={onSaveEdit}
                onToggleCompletion={onToggleCompletion}
                onArchive={onArchive}
                onDelete={onDelete}
              />
            </div>
          </div>
        </li>
      </div>
    );
  };

  return (
    <List
      height={600}
      itemCount={tasks.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {Row}
    </List>
  );
}
