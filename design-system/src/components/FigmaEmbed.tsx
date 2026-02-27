import React from 'react';

interface FigmaEmbedProps {
  url: string;
  title?: string;
  height?: string;
}

export function FigmaEmbed({ url, title = "Figma Design", height = "450" }: FigmaEmbedProps) {
  // Ensure the URL is a valid embed URL if the user pasted a standard link
  const embedUrl = url.includes('figma.com/embed') 
    ? url 
    : `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mb-8">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <img src="https://static.figma.com/app/icon/1/icon-32.png" alt="Figma" className="w-4 h-4" />
        <span className="text-xs font-bold text-slate-600">{title}</span>
      </div>
      <iframe
        className="w-full border-0"
        height={height}
        src={embedUrl}
        allowFullScreen
        title={title}
      />
    </div>
  );
}
