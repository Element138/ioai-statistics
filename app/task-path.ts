import { slugify } from "./slug";

type RoutableTask = {
  slug: string;
  year: number;
  name: string;
};

export function taskRouteSlug(task: RoutableTask) {
  return /^\d{4}-(?:home-)?task-\d+$/.test(task.slug) ? slugify(task.name) : task.slug;
}

export function taskPath(task: RoutableTask) {
  return `/tasks/${task.year}/${taskRouteSlug(task)}`;
}
