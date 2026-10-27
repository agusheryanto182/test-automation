import { initTRPC } from '@trpc/server';
import type { ConfirmChannel } from 'amqplib';
import type { Db } from '@app/db';
import type { Topology } from '@app/shared';

export interface Context {
  db: Db;
  channel: ConfirmChannel;
  topology: Pick<Topology, 'eventsExchange'>;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
