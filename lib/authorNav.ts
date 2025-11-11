let requestedAuthor: string | null = null;

export function setRequestedAuthor(author: string) {
  requestedAuthor = author;
}

export function consumeRequestedAuthor(): string | null {
  const a = requestedAuthor;
  requestedAuthor = null;
  return a;
}

export function peekRequestedAuthor(): string | null {
  return requestedAuthor;
}