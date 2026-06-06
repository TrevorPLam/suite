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
  searchTasks,
  batchComplete,
  batchArchive,
  resetTasks,
  resetTasksDB,
  setTaskRepository,
  getTaskRepository,
} from './lib/tasks.js';

export type {
  CreateTaskInput,
  TaskErrorCode,
  TaskItem,
  TaskPriority,
  UpdateTaskCompletionInput,
  UpdateTaskInput,
  ArchiveTaskInput,
  TaskFilter,
  TaskRepository,
  SearchTasksInput,
  BatchOperationInput,
} from './lib/tasks.js';

import { listTasks } from './lib/tasks.js';

export async function getTasksOverview() {
  return {
    name: 'Tasks',
    description: 'Starter tasks domain package',
    tasks: await listTasks(),
  };
}
