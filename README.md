# SQLite3 Parser

A type-safe bi-directional SQL parser / AST formatter for SQLite for TypeScript, backed by the rust crate [sqlparser-rs](https://github.com/apache/datafusion-sqlparser-rs), compiled to WebAssembly.

## Features

- **Type-Safe**: Full TypeScript definitions for AST structures
- **Bidirectional**: SQL → AST and AST → SQL conversion
- **Fast**: Rust compiled to WebAssembly for optimal performance
- **Complete**: Supports many SQLite features, including complex queries and CTEs
- **Table Access Info**: Get table access information (read vs write for each referenced table) from a SQL statement

## Unsupported SQLite Features:
- ATTACH/DETACH
- PRAGMA

