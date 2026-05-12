import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight, MoreHorizontal, Plus, ExternalLink, BookOpen, Layers,
  FolderTree, FileText, FileType2, Video, Globe, StickyNote, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LibraryNode, NodeKind, Task, Resource, ResourceType, RESOURCE_TYPES,
  childKindOf, labelFor, labelForResourceType, loadNodes, loadTasks,
  loadUser, saveNodes, saveTasks, saveUser, uid, loadResources, saveResources,
} from "@/lib/library-store";

// ---------- helpers ----------
const childrenOf = (nodes: LibraryNode[], parentId: string | null) =>
  nodes.filter((n) => n.parentId === parentId);

const iconFor = (kind: NodeKind) => {
  switch (kind) {
    case "subject": return FolderTree;
    case "module": return Layers;
    case "chapter": return FileText;
    case "topic": return FileText;
    case "book": return BookOpen;
  }
};

const iconForResource = (t: ResourceType) => {
  switch (t) {
    case "book": return BookOpen;
    case "pdf": return FileType2;
    case "video": return Video;
    case "website": return Globe;
    case "notes": return StickyNote;
  }
};

// ---------- name prompt ----------
function NamePromptDialog({ open, onSubmit }: { open: boolean; onSubmit: (n: string) => void }) {
  const [name, setName] = useState("");
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome</DialogTitle>
          <DialogDescription>Tell us your name to personalize your library.</DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSubmit(name.trim()); }}
        />
        <DialogFooter>
          <Button disabled={!name.trim()} onClick={() => onSubmit(name.trim())}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- node add/edit dialog ----------
interface NodeDialogState {
  open: boolean;
  kind: NodeKind;
  parentId: string | null;
  editing?: LibraryNode;
}

function NodeDialog({
  state, onClose, onSave,
}: {
  state: NodeDialogState;
  onClose: () => void;
  onSave: (title: string, link?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  useEffect(() => {
    if (state.open) {
      setTitle(state.editing?.title ?? "");
      setLink(state.editing?.link ?? "");
    }
  }, [state.open, state.editing]);

  const isBook = state.kind === "book";
  const action = state.editing ? "Edit" : "Add";

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action} {labelFor(state.kind)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">{isBook ? "Book name" : "Title"}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          {isBook && (
            <div className="space-y-1.5">
              <Label htmlFor="link">Link</Label>
              <Input id="link" placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!title.trim() || (isBook && !link.trim())}
            onClick={() => onSave(title.trim(), isBook ? link.trim() : undefined)}
          >
            {state.editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- resource dialog ----------
interface ResourceDialogState {
  open: boolean;
  topicId: string | null;
  editing?: Resource;
}

function ResourceDialog({
  state, onClose, onSave,
}: {
  state: ResourceDialogState;
  onClose: () => void;
  onSave: (data: { title: string; url: string; type: ResourceType; description: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ResourceType>("website");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (state.open) {
      setTitle(state.editing?.title ?? "");
      setUrl(state.editing?.url ?? "");
      setType(state.editing?.type ?? "website");
      setDescription(state.editing?.description ?? "");
    }
  }, [state.open, state.editing]);

  const valid = title.trim() && url.trim();
  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{state.editing ? "Edit" : "Add"} resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-title">Title</Label>
            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-url">URL</Label>
            <Input id="r-url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{labelForResourceType(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-desc">Description / Notes</Label>
            <Textarea
              id="r-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short note..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!valid}
            onClick={() => onSave({ title: title.trim(), url: url.trim(), type, description: description.trim() })}
          >
            {state.editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- sidebar tree node ----------
function TreeItem({
  node, nodes, resources, depth, selectedId, expanded,
  onToggle, onSelect, onAction, onAddChild, onAddResource,
}: {
  node: LibraryNode;
  nodes: LibraryNode[];
  resources: Resource[];
  depth: number;
  selectedId: string | null;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (n: LibraryNode) => void;
  onAction: (action: "edit" | "delete", node: LibraryNode) => void;
  onAddChild: (kind: NodeKind, parentId: string) => void;
  onAddResource: (topicId: string) => void;
}) {
  const kids = childrenOf(nodes, node.id);
  const isTopic = node.kind === "topic";
  const topicResources = isTopic ? resources.filter((r) => r.topicId === node.id) : [];
  const hasKids = kids.length > 0 || topicResources.length > 0;
  const isOpen = !!expanded[node.id];
  const Icon = iconFor(node.kind);
  const childKind = childKindOf(node.kind);
  const isSelected = selectedId === node.id;
  const isBook = node.kind === "book";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm transition-colors",
          "hover:bg-accent/40",
          isSelected && "bg-accent/60",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        <button
          className="flex h-7 w-5 shrink-0 items-center justify-center text-muted-foreground"
          onClick={() => {
            if (isBook) {
              if (node.link) window.open(node.link, "_blank", "noopener,noreferrer");
              return;
            }
            onToggle(node.id);
            onSelect(node);
          }}
          aria-label="toggle"
        >
          {!isBook && (
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          )}
        </button>
        <button
          className="flex flex-1 items-center gap-2 truncate py-1.5 text-left"
          onClick={() => {
            if (isBook && node.link) {
              window.open(node.link, "_blank", "noopener,noreferrer");
              return;
            }
            onSelect(node);
            if (!isBook && !isOpen) onToggle(node.id);
          }}
        >
          <Icon className={cn("h-3.5 w-3.5 shrink-0", isBook ? "text-primary" : "text-muted-foreground")} />
          <span className="truncate">{node.title}</span>
          {isTopic && topicResources.length > 0 && (
            <span className="ml-1 rounded bg-accent/60 px-1.5 text-[10px] text-muted-foreground">
              {topicResources.length}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
              aria-label="actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {childKind && (
              <DropdownMenuItem onClick={() => onAddChild(childKind, node.id)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add {labelFor(childKind)}
              </DropdownMenuItem>
            )}
            {isTopic && (
              <DropdownMenuItem onClick={() => onAddResource(node.id)}>
                <Link2 className="mr-2 h-3.5 w-3.5" /> Add Resource
              </DropdownMenuItem>
            )}
            {(node.kind === "chapter") && (
              <DropdownMenuItem onClick={() => onAddChild("book", node.id)}>
                <BookOpen className="mr-2 h-3.5 w-3.5" /> Add Book
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction("edit", node)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onAction("delete", node)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          isOpen && hasKids ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {kids.map((c) => (
            <TreeItem
              key={c.id}
              node={c}
              nodes={nodes}
              resources={resources}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              onAction={onAction}
              onAddChild={onAddChild}
              onAddResource={onAddResource}
            />
          ))}
          {isTopic && topicResources.map((r) => {
            const RIcon = iconForResource(r.type);
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 truncate rounded-md py-1 pr-2 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                style={{ paddingLeft: (depth + 1) * 12 + 12 }}
              >
                <RIcon className="h-3 w-3 shrink-0 text-primary/70" />
                <span className={cn("truncate", r.done && "line-through opacity-60")}>{r.title}</span>
                <ExternalLink className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- main ----------
export default function LibraryApp() {
  const [user, setUser] = useState<string | null>(null);
  const [askName, setAskName] = useState(false);
  const [nodes, setNodes] = useState<LibraryNode[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<NodeDialogState>({ open: false, kind: "subject", parentId: null });
  const [resDialog, setResDialog] = useState<ResourceDialogState>({ open: false, topicId: null });
  const [confirmDelete, setConfirmDelete] = useState<LibraryNode | null>(null);
  const [confirmDeleteResource, setConfirmDeleteResource] = useState<Resource | null>(null);
  const [taskInput, setTaskInput] = useState("");
  

  useEffect(() => {
    const u = loadUser();
    if (!u) setAskName(true); else setUser(u);
    setNodes(loadNodes());
    setTasks(loadTasks());
    setResources(loadResources());
  }, []);

  useEffect(() => { if (nodes.length || loadNodes().length) saveNodes(nodes); }, [nodes]);
  useEffect(() => { saveTasks(tasks); }, [tasks]);
  useEffect(() => { if (resources.length || loadResources().length) saveResources(resources); }, [resources]);

  const selected = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [selectedId, nodes],
  );

  const subjects = childrenOf(nodes, null);
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const openAdd = (kind: NodeKind, parentId: string | null) =>
    setDialog({ open: true, kind, parentId });

  const handleAction = (action: "edit" | "delete", node: LibraryNode) => {
    if (action === "delete") return setConfirmDelete(node);
    if (action === "edit") return setDialog({ open: true, kind: node.kind, parentId: node.parentId, editing: node });
  };

  const addChild = (kind: NodeKind, parentId: string) =>
    setDialog({ open: true, kind, parentId });

  const openResourceAdd = (topicId: string) => {
    setExpanded((e) => ({ ...e, [topicId]: true }));
    setResDialog({ open: true, topicId });
  };

  const saveNode = (title: string, link?: string) => {
    setNodes((cur) => {
      if (dialog.editing) {
        return cur.map((n) =>
          n.id === dialog.editing!.id ? { ...n, title, link: link ?? n.link } : n,
        );
      }
      const node: LibraryNode = {
        id: uid(),
        kind: dialog.kind,
        title,
        link,
        parentId: dialog.parentId,
        createdAt: Date.now(),
        addedBy: user ?? "Unknown",
      };
      if (dialog.parentId) setExpanded((e) => ({ ...e, [dialog.parentId!]: true }));
      return [...cur, node];
    });
    setDialog({ open: false, kind: "subject", parentId: null });
  };

  const saveResource = (data: { title: string; url: string; type: ResourceType; description: string }) => {
    setResources((cur) => {
      if (resDialog.editing) {
        return cur.map((r) =>
          r.id === resDialog.editing!.id ? { ...r, ...data } : r,
        );
      }
      if (!resDialog.topicId) return cur;
      const r: Resource = {
        id: uid(),
        topicId: resDialog.topicId,
        title: data.title,
        url: data.url,
        type: data.type,
        description: data.description,
        done: false,
        createdAt: Date.now(),
        addedBy: user ?? "Unknown",
      };
      return [...cur, r];
    });
    setResDialog({ open: false, topicId: null });
  };

  const toggleResource = (id: string) =>
    setResources((cur) => cur.map((r) => r.id === id ? { ...r, done: !r.done } : r));

  const deleteResource = (r: Resource) => {
    setResources((cur) => cur.filter((x) => x.id !== r.id));
    setConfirmDeleteResource(null);
  };

  const deleteNode = (n: LibraryNode) => {
    const toDelete = new Set<string>([n.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const x of nodes) {
        if (x.parentId && toDelete.has(x.parentId) && !toDelete.has(x.id)) {
          toDelete.add(x.id);
          changed = true;
        }
      }
    }
    setNodes((cur) => cur.filter((x) => !toDelete.has(x.id)));
    setResources((cur) => cur.filter((r) => !toDelete.has(r.topicId)));
    if (selectedId && toDelete.has(selectedId)) setSelectedId(null);
    setConfirmDelete(null);
  };

  const centerChildren = selected ? childrenOf(nodes, selected.id) : [];
  const centerBooks = centerChildren.filter((c) => c.kind === "book");
  const centerOther = centerChildren.filter((c) => c.kind !== "book");
  const isTopic = selected?.kind === "topic";
  const topicResources = isTopic ? resources.filter((r) => r.topicId === selected!.id) : [];

  const addTask = () => {
    const t = taskInput.trim();
    if (!t) return;
    setTasks((cur) => [...cur, { id: uid(), title: t, done: false, createdAt: Date.now() }]);
    setTaskInput("");
  };
  const toggleTask = (id: string) => {
    setTasks((cur) => cur.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-card/30">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">AI Library</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => openAdd("subject", null)}
          >
            <Plus className="h-3.5 w-3.5" /> Subject
          </Button>
          
        </div>
        <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Library
        </div>
        <ScrollArea className="flex-1 px-2">
          {subjects.length === 0 ? (
            <div className="px-3 py-6 text-xs text-muted-foreground">
              No subjects yet. Click + Subject to get started.
            </div>
          ) : (
            <div className="space-y-0.5 pb-4">
              {subjects.map((s) => (
                <TreeItem
                  key={s.id}
                  node={s}
                  nodes={nodes}
                  resources={resources}
                  depth={0}
                  selectedId={selectedId}
                  expanded={expanded}
                  onToggle={toggle}
                  onSelect={(n) => setSelectedId(n.id)}
                  onAction={handleAction}
                  onAddChild={addChild}
                  onAddResource={openResourceAdd}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        {user && (
          <div className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
            Signed in as <span className="text-foreground">{user}</span>
          </div>
        )}
      </aside>

      {/* Center */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/60 px-6 py-3.5">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {selected ? labelFor(selected.kind) : "Library"}
            </div>
            <h1 className="truncate text-base font-semibold">
              {selected?.title ?? "Select an item"}
            </h1>
          </div>
          {selected && isTopic && (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => openResourceAdd(selected.id)}>
              <Plus className="h-3.5 w-3.5" /> Add Resource
            </Button>
          )}
          {selected && selected.kind === "chapter" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openAdd("topic", selected.id)}>
                <Plus className="h-3.5 w-3.5" /> Add Topic
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => openAdd("book", selected.id)}>
                <Plus className="h-3.5 w-3.5" /> Add Book
              </Button>
            </div>
          )}
          {selected && selected.kind !== "book" && selected.kind !== "topic" && selected.kind !== "chapter" && childKindOf(selected.kind) && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => openAdd(childKindOf(selected.kind)!, selected.id)}
            >
              <Plus className="h-3.5 w-3.5" /> Add {labelFor(childKindOf(selected.kind)!)}
            </Button>
          )}
        </header>

        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-4xl px-6 py-6">
            {!selected ? (
              <EmptyCenter />
            ) : isTopic ? (
              <section>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Resources {topicResources.length > 0 && (
                    <span className="ml-1 text-muted-foreground/70">({topicResources.length})</span>
                  )}
                </h2>
                {topicResources.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                    No resources yet. Click <span className="text-foreground">Add Resource</span> to add a book, PDF, video, website, or note.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {topicResources.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        onToggle={() => toggleResource(r.id)}
                        onEdit={() => setResDialog({ open: true, topicId: r.topicId, editing: r })}
                        onDelete={() => setConfirmDeleteResource(r)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <div className="space-y-6">
                {centerOther.length > 0 && (
                  <section>
                    <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {labelFor(childKindOf(selected.kind) ?? "topic")}s
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {centerOther.map((c) => {
                        const count = c.kind === "topic" ? resources.filter((r) => r.topicId === c.id).length : 0;
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedId(c.id); setExpanded((e) => ({ ...e, [c.id]: true })); }}
                            className="group flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-card"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate text-sm">{c.title}</span>
                              {count > 0 && (
                                <span className="rounded bg-accent/60 px-1.5 text-[10px] text-muted-foreground">{count}</span>
                              )}
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {(selected.kind === "chapter") && (
                  <section>
                    <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Books
                    </h2>
                    {centerBooks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                        No books yet.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {centerBooks.map((b) => (
                          <BookCard
                            key={b.id}
                            book={b}
                            onEdit={() => setDialog({ open: true, kind: "book", parentId: b.parentId, editing: b })}
                            onDelete={() => setConfirmDelete(b)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* Right utility panel */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-border/60 bg-card/30 lg:flex">
        <div className="px-4 py-3.5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</div>
          <h2 className="text-sm font-semibold">Study Tasks</h2>
        </div>
        <div className="px-4 pb-3">
          <div className="flex gap-1.5">
            <Input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
              placeholder="Add a task..."
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 px-2.5" onClick={addTask}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 px-2">
          {tasks.length === 0 ? (
            <div className="px-3 py-6 text-xs text-muted-foreground">No tasks. Add one above.</div>
          ) : (
            <ul className="space-y-1 pb-4">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40"
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={() => toggleTask(t.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{t.title}</span>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </aside>

      {/* Dialogs */}
      <NamePromptDialog
        open={askName}
        onSubmit={(n) => { saveUser(n); setUser(n); setAskName(false); }}
      />
      <NodeDialog
        state={dialog}
        onClose={() => setDialog({ open: false, kind: "subject", parentId: null })}
        onSave={saveNode}
      />
      <ResourceDialog
        state={resDialog}
        onClose={() => setResDialog({ open: false, topicId: null })}
        onSave={saveResource}
      />
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove it{confirmDelete && (childrenOf(nodes, confirmDelete.id).length > 0 || resources.some((r) => r.topicId === confirmDelete.id)) ? " and everything inside" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && deleteNode(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!confirmDeleteResource} onOpenChange={(o) => !o && setConfirmDeleteResource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDeleteResource?.title}?</AlertDialogTitle>
            <AlertDialogDescription>This resource will be removed permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteResource && deleteResource(confirmDeleteResource)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyCenter() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-card/40">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold">Your library is empty</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create a subject in the sidebar to start organizing modules, chapters, topics, and resources.
      </p>
    </div>
  );
}

function BookCard({
  book, onEdit, onDelete,
}: {
  book: LibraryNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3 transition-all hover:border-primary/40 hover:bg-card">
      <a
        href={book.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-start gap-2.5"
      >
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{book.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {book.addedBy} · {new Date(book.createdAt).toLocaleDateString()}
          </div>
        </div>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ResourceCard({
  resource, onToggle, onEdit, onDelete,
}: {
  resource: Resource;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = iconForResource(resource.type);
  return (
    <li className="group relative flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-all hover:border-primary/40 hover:bg-card">
      <Checkbox
        checked={resource.done}
        onCheckedChange={onToggle}
        className="mt-0.5 h-4 w-4"
        aria-label="mark complete"
      />
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group/link flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary",
              resource.done && "line-through text-muted-foreground",
            )}
          >
            <span className="truncate">{resource.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
          </a>
          <span className="ml-auto rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {labelForResourceType(resource.type)}
          </span>
        </div>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{resource.description}</p>
        )}
        <div className="mt-1 text-[11px] text-muted-foreground/70">
  <div className="truncate">{resource.url}</div>
  <div>
    Added by {resource.addedBy || "Unknown"}
  </div>
</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
