import { useCallback } from "react";
import {
  ERROR_CODES,
  NexusError,
  NexusErrorData,
} from "@avail-project/nexus-core";

export type NexusErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface NormalizedNexusError {
  code?: NexusErrorCode;
  message: string;
  context?: string;
  details?: Record<string, unknown>;
}

interface NexusErrorLike {
  code: NexusErrorCode;
  message: string;
  data?: NexusErrorData;
}

const ERROR_CODE_SET = new Set<string>(Object.values(ERROR_CODES));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isErrorCode = (value: unknown): value is NexusErrorCode =>
  typeof value === "string" && ERROR_CODE_SET.has(value);

const isNexusErrorData = (value: unknown): value is NexusErrorData => {
  const { context, details } = value as NexusErrorData;
  const hasValidContext = typeof context === "string" || context === undefined;
  const hasValidDetails = details === undefined || isRecord(details);
  return hasValidContext && hasValidDetails;
};

const isNexusErrorLike = (err: unknown): err is NexusErrorLike => {
  if (!isRecord(err)) return false;
  const { code, message, data } = err as {
    code: unknown;
    message: unknown;
    data?: unknown;
  };
  if (!isErrorCode(code) || typeof message !== "string") {
    return false;
  }
  return data === undefined || isNexusErrorData(data);
};

const normalizeNexusError = ({
  code,
  message,
  data,
}: NexusErrorLike): NormalizedNexusError => {
  const context = typeof data?.context === "string" ? data.context : undefined;
  const details =
    data?.details ??
    (data?.cause === undefined ? undefined : { cause: data.cause });
  console.log("normalized nexus error", {
    code,
    message,
    context,
    details,
  });
  return {
    code,
    message,
    context,
    details,
  };
};

export function useNexusError() {
  const handler = useCallback((err: unknown): NormalizedNexusError => {
    if (isNexusErrorLike(err)) {
      return normalizeNexusError(err);
    }
    if (err instanceof NexusError) {
      return normalizeNexusError({
        code: err.code,
        message: err.message,
        data: err.data,
      });
    }
    const stringError = typeof err === "string" ? err : "Unexpected error";
    const fallbackMessage =
      err instanceof Error ? err.message || "Unexpected error" : stringError;
    return { message: fallbackMessage };
  }, []);

  return handler;
}
