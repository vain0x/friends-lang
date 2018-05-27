// Provides Option/Result.

export type None = never[] & { length: 0 };
export type Some<T> = [T];
export type Option<T> = Some<T> | None;

export const None: None = [] as None;
export const Some: <T>(value: T) => Some<T> = value => [value];

export type Result<T, E> = { ok: true; value: T; } | { ok: false; err: E; };
