import { prisma } from "@/server/db/client";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  category: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

function mapNotification(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    category: row.category,
    title: row.title,
    message: row.message,
    link: row.link ?? undefined,
    read: row.read,
    readAt: row.readAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

// ────────────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────────────

export const notificationRepo = {
  async findByUser(userId: string, params?: { unreadOnly?: boolean; limit?: number }) {
    const where: any = { userId };
    if (params?.unreadOnly) where.read = false;

    const rows = await prisma.notification.findMany({
      where,
      take: params?.limit ?? 50,
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await prisma.notification.count({ where: { userId, read: false } });

    return { data: rows.map(mapNotification), unreadCount };
  },

  async markAsRead(id: string) {
    const row = await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
    return mapNotification(row);
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return await prisma.notification.count({ where: { userId, read: false } }); // should be 0
  },

  async create(data: {
    userId: string;
    type: string;
    category: string;
    title: string;
    message: string;
    link?: string;
  }) {
    const row = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        category: data.category as any,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      },
    });
    return mapNotification(row);
  },
};
