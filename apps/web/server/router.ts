import { TRPCError } from '@trpc/server';
import { orders } from '@app/db';
import { createOrderInputSchema, type OrderCreatedEvent } from '@app/shared';
import { publishOrderCreated } from './publisher';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  order: router({
    /**
     * Inserts the order, then publishes `order.created`.
     * Trade-off (no outbox, see SPEC.md): if publishing fails the order stays
     * saved and the mutation throws INTERNAL_SERVER_ERROR, so the event is lost.
     */
    create: publicProcedure.input(createOrderInputSchema).mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db.insert(orders).values(input).returning();
      if (!order) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const event: OrderCreatedEvent = {
        eventId: crypto.randomUUID(),
        type: 'order.created',
        occurredAt: new Date().toISOString(),
        payload: {
          orderId: order.id,
          customerEmail: order.customerEmail,
          item: order.item,
          amount: order.amount,
        },
      };

      try {
        await publishOrderCreated(ctx.channel, event, ctx.topology);
      } catch (cause) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Order saved but the event could not be published',
          cause,
        });
      }
      return { order, eventId: event.eventId };
    }),
  }),
});

export type AppRouter = typeof appRouter;
