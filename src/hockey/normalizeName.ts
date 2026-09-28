/**
 * A name reduced to what two feeds can agree on.
 *
 * Its own module because both the ESPN join and the merge need it, and having the join import it
 * from the merge while the merge imports the join made a cycle — one that happened to work only
 * because a hoisted function declaration is defined before either module body runs. That is not
 * a property worth depending on.
 */
export function normalizeName(name: string): string {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
