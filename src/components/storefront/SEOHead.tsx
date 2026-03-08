import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: Record<string, any>;
}

const SEOHead = ({ title, description, canonicalUrl, ogImage, jsonLd }: SEOHeadProps) => {
  useEffect(() => {
    // Title
    document.title = title;

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    if (description) metaDesc.setAttribute("content", description);

    // OG tags
    const setOg = (prop: string, content: string) => {
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setOg("og:title", title);
    if (description) setOg("og:description", description);
    if (ogImage) setOg("og:image", ogImage);
    if (canonicalUrl) setOg("og:url", canonicalUrl);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    if (canonicalUrl) canonical.setAttribute("href", canonicalUrl);

    // JSON-LD
    let ldScript = document.querySelector('script[data-seo-jsonld]') as HTMLScriptElement;
    if (jsonLd) {
      if (!ldScript) {
        ldScript = document.createElement("script");
        ldScript.type = "application/ld+json";
        ldScript.setAttribute("data-seo-jsonld", "true");
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      if (ldScript) ldScript.remove();
    };
  }, [title, description, canonicalUrl, ogImage, jsonLd]);

  return null;
};

export default SEOHead;
