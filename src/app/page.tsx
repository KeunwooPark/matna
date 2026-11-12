import { CreateEventForm } from "./create-event-form";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold">맛나</h1>
        <p className="mt-2 text-muted">장소 후보를 모으고, 링크를 공유하고, 함께 골라요.</p>
      </div>
      <CreateEventForm />
    </main>
  );
}
