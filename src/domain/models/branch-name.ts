export class BranchName {
  readonly #value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed === "") {
      throw new Error("BranchName cannot be empty");
    }
    this.#value = trimmed;
  }

  equals(other: BranchName): boolean {
    if (this.#value === other.#value) {
      return true;
    } else {
      return false;
    }
  }

  toString(): string {
    return this.#value;
  }
}
