# SQLite3 Parser

A type-safe bi-directional SQL parser / AST formatter for SQLite for TypeScript, backed by the rust crate [sqlparser-rs](https://github.com/apache/datafusion-sqlparser-rs), compiled to WebAssembly.

Try the [interactive demo](https://sqlite3-parser.vercel.app/) to see it in action.

## Features

- **Type-Safe**: Full TypeScript definitions for AST structures
- **Bidirectional**: SQL → AST and AST → SQL conversion
- **Fast**: Rust compiled to WebAssembly for optimal performance
- **Complete**: Supports many SQLite features, including complex queries and CTEs
- **Table Access Info**: Get table access information (read vs write for each referenced table) from a SQL statement

## Unsupported SQLite Features:
- ATTACH/DETACH
- PRAGMA

# Installation

```bash
bun add @danscan/sqlite3-parser
npm add @danscan/sqlite3-parser
yarn add @danscan/sqlite3-parser
```

# Usage

```typescript
import { parseSQL, validateSQL, formatAST, getSQLAccessInfo, type Statement } from '@danscan/sqlite3-parser';

const sql = 'SELECT * FROM users';
const ast = parseSQL(sql);
const formattedSql = formatAST(ast);
const accessInfo = getSQLAccessInfo(sql);
```

# API Reference

## parseSQL(sql: string): Statement[]

Parse a SQL string into an AST.

## validateSQL(sql: string): boolean

Returns whether the SQL string is valid.

## formatAST(ast: Statement[] | Statement): string

Format an AST back into a SQL string.

## getSQLAccessInfo(sql: string): TableAccessInfo

Get table access information (read vs write for each referenced table) from a SQL statement.