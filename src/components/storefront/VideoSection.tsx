interface VideoSectionProps {
  config: any;
}

const VideoSection = ({ config }: VideoSectionProps) => {
  const videoUrl = config.video_url || "";
  const heading = config.heading || "";
  const subheading = config.subheading || "";

  if (!videoUrl) return null;

  // Convert YouTube watch URL to embed URL
  const getEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {heading && (
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground text-center mb-3">
            {heading}
          </h2>
        )}
        {subheading && (
          <p className="text-muted-foreground text-center mb-8 font-body">{subheading}</p>
        )}
        <div className="max-w-4xl mx-auto">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={getEmbedUrl(videoUrl)}
              className="absolute inset-0 w-full h-full rounded-lg shadow-elegant"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={heading || "סרטון תדמית"}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
