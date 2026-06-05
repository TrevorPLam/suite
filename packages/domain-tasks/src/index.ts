export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
};

export type CreateTaskInput = {
  title: string;
  completed?: boolean;
};

export function getTasksOverview() {
  return {
    name: 'Tasks',
    description: 'Starter tasks domain package',
    tasks: [] as TaskItem[],
  };
}

export function createTask(input: CreateTaskInput): TaskItem {
  return {
    id: crypto.randomUUID(),
    title: input.title,
    completed: input.completed ?? false,
  };
}
