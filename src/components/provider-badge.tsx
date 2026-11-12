import type { Provider } from "@/db/schema";

const LABEL: Record<Provider, string> = { naver: "네이버", kakao: "카카오", google: "구글", catchtable: "캐치테이블" };
const STYLE: Record<Provider, string> = {
  naver: "bg-naver text-white",
  kakao: "bg-kakao text-black",
  google: "bg-google text-white",
  catchtable: "bg-catchtable text-white",
};

export function ProviderBadge({ provider }: { provider: Provider }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STYLE[provider]}`}>{LABEL[provider]}</span>;
}

/** Thumbnail, or a provider-coloured block with the first letter when there is none. */
export function PlaceThumb({ provider, title, src, className = "" }: { provider: Provider; title: string; src: string | null; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- external map CDNs; next/image would need every host configured
    return <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" className={`object-cover ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center text-xl font-bold ${STYLE[provider]} ${className}`} aria-hidden>
      {title.slice(0, 1)}
    </div>
  );
}
