import { createFileRoute } from "@tanstack/react-router";
import LibraryApp from "@/components/LibraryApp";

export const Route = createFileRoute("/")({
  component: LibraryApp,
  head: () => ({
    meta: [
      { title: "AI Learning Library" },
      { name: "description", content: "A minimal dark dashboard to organize AI learning subjects, modules, chapters, topics, and books." },
    ],
  }),
});
