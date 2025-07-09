import init, * as bindings from '../rust/pkg/sqlparser_wasm.js';
import type {
  Delete,
  Insert,
  Query,
  Statement,
  TableAccessInfo,
  Update
} from './types.js';

// –
// Public API
// –

// Re-export types
export type * from './types.js';

/** Parse a SQL string to AST statements */
export async function parseSQL(sql: string): Promise<Statement[]> {
  const parser = await getGlobalParser();
  return parser.parseSQL(sql);
}

/** Validate a SQL string */
export async function validateSQL(sql: string): Promise<boolean> {
  const parser = await getGlobalParser();
  return parser.validateSQL(sql);
}

/** Convert strongly-typed AST to SQL */
export async function formatAST(ast: Statement[] | Statement): Promise<string> {
  const parser = await getGlobalParser();
  return parser.formatAST(ast);
}

/** Get each table accessed in a SQL string, along with whether it is read or written to */
export async function getSQLAccessInfo(sql: string): Promise<TableAccessInfo> {
  const parser = await getGlobalParser();
  return parser.getSQLAccessInfo(sql);
}

/** Get library version info */
export async function version(): Promise<string> {
  const parser = await getGlobalParser();
  return parser.version();
}


// –
// Type Guards and Utilities
// –

/** Type guard to check if a statement is a Query */
export function isQuery(statement: Statement): statement is { readonly Query: Query } {
  return 'Query' in statement;
}

/** Type guard to check if a statement is an Insert */
export function isInsert(statement: Statement): statement is { readonly Insert: Insert } {
  return 'Insert' in statement;
}

/** Type guard to check if a statement is an Update */
export function isUpdate(statement: Statement): statement is { readonly Update: Update } {
  return 'Update' in statement;
}

/** Type guard to check if a statement is a Delete */
export function isDelete(statement: Statement): statement is { readonly Delete: Delete } {
  return 'Delete' in statement;
}

// –
// Internal Implementation
// –

/** @internal Singleton instance of the SqlParser class */
let globalParser: SqlParser | null = null;

/** @internal Get the global parser instance */
async function getGlobalParser(): Promise<SqlParser> {
  if (!globalParser) {
    globalParser = new SqlParser();
    await globalParser.init();
  }
  return globalParser;
}

/** @internal Parser class that initializes the WASM module and provides methods to parse, validate, and format SQL */
class SqlParser {
  private initialized = false;

  /** Initialize the WASM module */
  async init(): Promise<void> {
    if (!this.initialized) {
      await init();
      this.initialized = true;
    }
  }

  /** Parse SQL string into strongly-typed AST */
  parseSQL(sql: string): Statement[] {
    this.ensureInitialized();
    
    const result = bindings.parse(sql);
    
    if (result.success && result.json) {
      return JSON.parse(result.json) as Statement[];
    }

    const error = bindings.error(sql);
    if (error) {
      throw new Error(error);
    }

    // This should be unreachable
    throw new Error('Failed to parse SQL');
  }

  /** Convert strongly-typed AST back to SQL string */
  formatAST(ast: Statement[] | Statement): string {
    this.ensureInitialized();
    
    const astArray = Array.isArray(ast) ? ast : [ast];
    const astJson = JSON.stringify(astArray);
    return bindings.format(astJson);
  }

  /** Validate SQL syntax (fast check without full parsing) */
  validateSQL(sql: string): boolean {
    this.ensureInitialized();
    
    return bindings.validate(sql);
  }

  /** Extract table access information (read vs write) from SQL statement */
  getSQLAccessInfo(sql: string): TableAccessInfo {
    this.ensureInitialized();
    
    const result = bindings.access(sql);
    return JSON.parse(result) as TableAccessInfo;
  }

  /** Get library version */
  version(): string {
    return bindings.version();
  }

  /** @private Ensure the parser is initialized */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SqlParser not initialized. Call init() first.');
    }
  }
}
