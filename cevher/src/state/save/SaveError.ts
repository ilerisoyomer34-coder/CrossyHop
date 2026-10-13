/** Why a save could not be read. Every load failure is a SaveError, never an unhandled crash. */
export type SaveErrorCode =
  | 'format' // not a save envelope (bad JSON, missing fields)
  | 'checksum' // envelope intact but the data was altered or truncated
  | 'compression' // payload does not decompress
  | 'newer' // written by a newer game version than this one
  | 'migration' // a version upgrade step failed
  | 'schema'; // decoded data is missing fields or breaks game invariants

export class SaveError extends Error {
  constructor(
    readonly code: SaveErrorCode,
    message: string,
  ) {
    super(`[save:${code}] ${message}`);
    this.name = 'SaveError';
  }
}
