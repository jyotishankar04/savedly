// How a memory's vectors are named in the external stores (Pinecone, Upstash).
export function documentVectorId(memoryId: string): string {
  return `${memoryId}:document`;
}

export function chunkVectorId(memoryId: string, chunkIndex: number): string {
  return `${memoryId}:chunk:${chunkIndex}`;
}
