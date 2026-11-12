import { getParticipant, getTally } from "@/lib/votes";

/** Current votes for an event, polled by the participant page. */
export async function GET(_req: Request, ctx: RouteContext<"/e/[id]/tally">) {
  const { id } = await ctx.params;
  const tally = await getTally(id, await getParticipant(id));
  return Response.json(tally, { headers: { "cache-control": "no-store" } });
}
