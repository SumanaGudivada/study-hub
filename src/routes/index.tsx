import { createFileRoute } from "@tanstack/react-router";
import LibraryApp from "../components/LibraryApp";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <LibraryApp />;
}