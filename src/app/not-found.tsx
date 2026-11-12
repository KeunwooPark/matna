import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-muted">링크가 잘렸거나 잘못 복사되었을 수 있어요.</p>
      <Link href="/" className="mt-6 rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
        새 모임 만들기
      </Link>
    </main>
  );
}
