import { logger } from "../../../shared/utils/logger";

export function logNode(memoryId: string, node: string, data: Record<string, unknown> = {}): void {
  logger.info({ memoryId, node, ...data }, `[ingestion] ${node}`);
}
