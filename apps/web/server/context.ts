import { db } from '@app/db';
import { assertTopology, connectRabbit, TOPOLOGY, type RabbitConnection } from '@app/shared';
import type { Context } from './trpc';

let rabbit: Promise<RabbitConnection> | undefined;

function getRabbit(): Promise<RabbitConnection> {
  rabbit ??= connectRabbit(process.env.RABBITMQ_URL)
    .then(async (r) => {
      await assertTopology(r.channel, TOPOLOGY);
      return r;
    })
    .catch((err) => {
      rabbit = undefined;
      throw err;
    });
  return rabbit;
}

export async function createContext(): Promise<Context> {
  const { channel } = await getRabbit();
  return { db, channel, topology: TOPOLOGY };
}
