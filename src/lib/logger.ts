type Fields = Record<string, string | number | boolean | null | undefined>;

function line(level: string, message: string, fields?: Fields): string {
  const extra = fields
    ? " " +
      Object.entries(fields)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  return `[trade-desk] ${level} ${message}${extra}`;
}

export const log = {
  info(message: string, fields?: Fields) {
    console.info(line("info", message, fields));
  },
  warn(message: string, fields?: Fields) {
    console.warn(line("warn", message, fields));
  },
  error(message: string, fields?: Fields) {
    console.error(line("error", message, fields));
  },
};
