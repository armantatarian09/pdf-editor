import { Op } from "../types/pdf";

export const serializeOps = (ops: Op[]) => JSON.stringify(ops);

export const deserializeOps = (data: string): Op[] => JSON.parse(data) as Op[];
