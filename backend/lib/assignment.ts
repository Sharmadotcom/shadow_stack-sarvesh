import { prisma } from "./db";

// ─── Round-robin / Least-loaded assignee within a category ────────────────────

export async function getRoundRobinAssignee(
  categoryId: number
): Promise<number | null> {
  // Get all staff members in this category team
  const teamMembers = await prisma.categoryTeamMember.findMany({
    where: { categoryId },
    include: {
      user: {
        include: {
          ticketsAssigned: {
            where: {
              status: {
                notIn: ["RESOLVED", "CLOSED"],
              },
            },
          },
        },
      },
    },
  });

  if (teamMembers.length === 0) return null;

  // Pick the member with fewest active assigned tickets (least-loaded)
  const sorted = teamMembers.sort(
    (a, b) => a.user.ticketsAssigned.length - b.user.ticketsAssigned.length
  );

  return sorted[0].user.id;
}
