// Hierarchical library store backed by localStorage.
// Hierarchy: Subject → Module → Chapter → (Topic | Book)

export type NodeKind = "subject" | "module" | "chapter" | "topic" | "book";

export interface LibraryNode {
  id: string;
  kind: NodeKind;
  title: string;
  link?: string; // for books
  createdAt: number;
  addedBy: string;
  parentId: string | null;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

export type ResourceType = "book" | "pdf" | "video" | "website" | "notes";

export interface Resource {
  id: string;
  topicId: string;
  title: string;
  url: string;
  type: ResourceType;
  description?: string;
  done: boolean;
  createdAt: number;
  addedBy?: string;
}

const NODES_KEY = "ail.nodes.v1";
const TASKS_KEY = "ail.tasks.v1";
const USER_KEY = "ail.user.v1";
const RESOURCES_KEY = "ail.resources.v1";

export const childKindOf = (kind: NodeKind): NodeKind | null => {
  switch (kind) {
    case "subject": return "module";
    case "module": return "chapter";
    case "chapter": return "topic";
    case "topic": return null;
    case "book": return null;
  }
};

export const labelFor = (kind: NodeKind): string => ({
  subject: "Subject",
  module: "Module",
  chapter: "Chapter",
  topic: "Topic",
  book: "Book",
}[kind]);

export const RESOURCE_TYPES: ResourceType[] = ["book", "pdf", "video", "website", "notes"];
export const labelForResourceType = (t: ResourceType) =>
  ({ book: "Book", pdf: "PDF", video: "Video", website: "Website", notes: "Notes" }[t]);

const safeRead = <T,>(k: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (k: string, v: unknown) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
};

export const loadNodes = (): LibraryNode[] => safeRead<LibraryNode[]>(NODES_KEY, []);
export const saveNodes = (nodes: LibraryNode[]) => safeWrite(NODES_KEY, nodes);

export const loadTasks = (): Task[] => safeRead<Task[]>(TASKS_KEY, []);
export const saveTasks = (tasks: Task[]) => safeWrite(TASKS_KEY, tasks);

export const loadResources = (): Resource[] => safeRead<Resource[]>(RESOURCES_KEY, []);
export const saveResources = (r: Resource[]) => safeWrite(RESOURCES_KEY, r);

export const loadUser = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
};
export const saveUser = (name: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, name);
};

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
