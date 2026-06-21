type DatabaseErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function formatDatabaseError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null) {
    const dbError = error as DatabaseErrorLike;
    const parts = [dbError.message, dbError.hint, dbError.details].filter(
      (part): part is string => typeof part === "string" && part.trim().length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  return fallback;
}

export function isMissingColumnError(error: DatabaseErrorLike): boolean {
  const message = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";

  return (
    code === "PGRST204" ||
    (message.includes("could not find") && message.includes("column")) ||
    (message.includes("column") && message.includes("schema cache"))
  );
}
