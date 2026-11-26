import {useState} from 'react';
import {Package} from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-7 h-7 text-slate-400 mb-2" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-600 line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
