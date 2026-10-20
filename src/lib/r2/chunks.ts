// Jalur unggah berpotongan lewat server: kunci sementara potongan dan batas ukurannya (dipakai route chunk dan assemble).
export const CHUNK_MAX_BYTES = 4_400_000;
export const chunkKey = (fileId: string, i: number) => `tmp-chunks/${fileId}/${String(i).padStart(5, "0")}`;
