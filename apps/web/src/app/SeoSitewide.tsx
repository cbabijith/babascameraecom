// app/SeoSitewide.tsx
export default function SeoSitewide() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Babas Camera",
    url: "https://www.babascamera.com",
    logo: "https://www.babascamera.com/PHOTO_STORE_black.svg", // ensure this exists
    sameAs: [
      "https://www.instagram.com/babascamera", // update with real links
      "https://www.facebook.com/babascamera",
    ],
  };

  const searchBox = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://www.babascamera.com",
    potentialAction: {
      "@type": "SearchAction",
      target:
        "https://www.babascamera.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(searchBox) }}
      />
    </>
  );
}
