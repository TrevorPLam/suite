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
  resetTasks,
  resetTasksDB,
  setTaskRepository,
  getTaskRepository,
} from './lib/tasks.js';

export type {
  CreateTaskInput,
  TaskErrorCode,
  TaskItem,
  UpdateTaskCompletionInput,
  UpdateTaskInput,
  ArchiveTaskInput,
  TaskFilter,
  TaskRepository,
} from './lib/tasks.js';

import { listTasks } from './lib/tasks.js';

export async function getTasksOverview() {
  return {
    name: 'Tasks',
    description: 'Starter tasks domain package',
    tasks: await listTasks(),
  };
}
