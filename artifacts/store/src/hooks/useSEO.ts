import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
}

const SITE_NAME = "Velora";

export function useSEO({ title, description }: SEOOptions) {
  useEffect(() => {
    const prev = document.title;
    if (title) {
      document.title = `${title} — ${SITE_NAME}`;
    }

    let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = descTag?.content;
    if (description && descTag) {
      descTag.content = description;
    } else if (description) {
      descTag = document.createElement("meta");
      descTag.name = "description";
      descTag.content = description;
      document.head.appendChild(descTag);
    }

    return () => {
      document.title = prev;
      if (descTag && prevDesc !== undefined) descTag.content = prevDesc;
    };
  }, [title, description]);
}
