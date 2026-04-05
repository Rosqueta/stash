import "./App.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "./context/ThemeContext";
import { PromptsProvider } from "./context/PromptsContext";
import { Sidebar } from "./components/collections/Sidebar";
import { PromptList } from "./components/prompt-list/PromptList";
import { PromptDetail } from "./components/prompt-detail/PromptDetail";
import { usePromptsData } from "./context/PromptsContext";

function AppShell() {
  const { isLoading } = usePromptsData();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)]">
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <PromptList />
      <PromptDetail />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <PromptsProvider>
        <AppShell />
        <Toaster position="bottom-right" />
      </PromptsProvider>
    </ThemeProvider>
  );
}
