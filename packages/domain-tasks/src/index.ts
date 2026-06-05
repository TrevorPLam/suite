export {
  TaskError,
  createTask,
  getTask,
  listTasks,
  updateTaskCompletion,
  updateTask,
  archiveTask,
  deleteTask,
  filterTasks,
} from './lib/tasks.js';

export type {
  CreateTaskInput,
  TaskErrorCode,
  TaskItem,
  UpdateTaskCompletionInput,
  UpdateTaskInput,
  ArchiveTaskInput,
  TaskFilter,
} from './lib/tasks.js';

import { listTasks } from './lib/tasks.js';

export function getTasksOverview() {
  return {
    name: 'Tasks',
    description: 'Starter tasks domain package',
    tasks: listTasks(),
  };
}
