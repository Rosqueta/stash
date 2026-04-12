import { useState, useEffect } from "react";
import { fetchTemplates } from "../../services/templateService";
import type { Template, TemplatesData } from "../../types/template";
import { LibraryList } from "./LibraryList";
import { LibraryDetail } from "./LibraryDetail";

export function LibraryPanel() {
  const [data, setData] = useState<TemplatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchTemplates()
      .then((d) => {
        setData(d);
        if (d.templates.length > 0) setSelectedTemplate(d.templates[0]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <LibraryList
        data={data}
        isLoading={isLoading}
        error={error}
        selectedId={selectedTemplate?.id ?? null}
        onSelect={setSelectedTemplate}
      />
      <LibraryDetail template={selectedTemplate} />
    </>
  );
}
