import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';

export interface RabbitConnection {
  connection: ChannelModel;
  /** Channel with publisher confirms enabled. */
  channel: ConfirmChannel;
  close(): Promise<void>;
}

export async function connectRabbit(
  url: string = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
): Promise<RabbitConnection> {
  const connection = await connect(url);
  const channel = await connection.createConfirmChannel();
  return {
    connection,
    channel,
    close: async () => {
      await channel.close();
      await connection.close();
    },
  };
}
