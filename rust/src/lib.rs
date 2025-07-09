use wasm_bindgen::prelude::*;
use sqlparser::dialect::SQLiteDialect;
use sqlparser::parser::Parser;
use sqlparser::ast::Statement;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[cfg(feature = "debug")]
use console_error_panic_hook;

// –
// Initialization
// –

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "debug")]
    console_error_panic_hook::set_once();
}

// –
// Core Types
// –

/// Table access type - whether a table is being read from or written to
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AccessType {
    Read,
    Write,
}

/// Information about how a table is accessed in a SQL statement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableAccess {
    pub name: String,
    pub access: AccessType,
}

/// Collection of table access information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableAccessInfo {
    pub tables: Vec<TableAccess>,
}

/// Result type for parsing operations
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    success: bool,
    statements: Option<Vec<Statement>>,
    error: Option<String>,
}

#[wasm_bindgen]
impl ParseResult {
    #[wasm_bindgen(getter)]
    pub fn success(&self) -> bool {
        self.success
    }

    #[wasm_bindgen(getter)]
    pub fn error(&self) -> Option<String> {
        self.error.clone()
    }

    /// Get the parsed statements as JSON
    #[wasm_bindgen(getter)]
    pub fn json(&self) -> Option<String> {
        self.statements.as_ref().and_then(|stmts| {
            serde_json::to_string(stmts).ok()
        })
    }

    /// Get the number of parsed statements
    #[wasm_bindgen(getter)]
    pub fn count(&self) -> usize {
        self.statements.as_ref().map_or(0, |s| s.len())
    }
}

// –
// Core Functions
// –

/// Parse SQL string to AST using SQLite dialect
#[wasm_bindgen]
pub fn parse(sql: &str) -> ParseResult {
    let dialect = SQLiteDialect {};
    
    match Parser::parse_sql(&dialect, sql) {
        Ok(statements) => ParseResult {
            success: true,
            statements: Some(statements),
            error: None,
        },
        Err(e) => ParseResult {
            success: false,
            statements: None,
            error: Some(format!("{:?}", e)),
        },
    }
}

/// Convert AST JSON back to SQL string
#[wasm_bindgen]
pub fn format(ast_json: &str) -> String {
    match serde_json::from_str::<Vec<Statement>>(ast_json) {
        Ok(statements) => {
            statements
                .iter()
                .map(|stmt| stmt.to_string())
                .collect::<Vec<_>>()
                .join("; ")
        }
        Err(e) => format!("Error parsing AST JSON: {:?}", e),
    }
}

// –
// Utility Functions
// –

/// Validate SQL syntax without returning the full AST
#[wasm_bindgen]
pub fn validate(sql: &str) -> bool {
    let dialect = SQLiteDialect {};
    Parser::parse_sql(&dialect, sql).is_ok()
}

/// Get detailed error information for invalid SQL
#[wasm_bindgen]
pub fn error(sql: &str) -> Option<String> {
    let dialect = SQLiteDialect {};
    match Parser::parse_sql(&dialect, sql) {
        Ok(_) => None,
        Err(e) => Some(format!("{:?}", e)),
    }
}

/// Get library version info
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Extract table access information from a SQL statement (read vs write for each table)
#[wasm_bindgen]
pub fn access(sql: &str) -> String {
    let dialect = SQLiteDialect {};
    let mut table_access_map: HashMap<String, AccessType> = HashMap::new();
    
    if let Ok(statements) = Parser::parse_sql(&dialect, sql) {
        for stmt in statements {
            extract_table_access_from_statement(&stmt, &mut table_access_map);
        }
    }
    
    // Convert to sorted vector
    let mut table_accesses: Vec<TableAccess> = table_access_map
        .into_iter()
        .map(|(name, access)| TableAccess { name, access })
        .collect();
    
    // Sort by table name
    table_accesses.sort_by(|a, b| a.name.cmp(&b.name));
    
    let result = TableAccessInfo {
        tables: table_accesses,
    };
    
    serde_json::to_string(&result).unwrap_or_else(|_| r#"{"tables": []}"#.to_string())
}

// –
// Private Helpers
// –

/// Extract table access information from a statement (read vs write)
fn extract_table_access_from_statement(stmt: &Statement, table_access_map: &mut HashMap<String, AccessType>) {
    use sqlparser::ast::*;
    
    match stmt {
        Statement::Query(query) => {
            // All tables in queries are read
            extract_table_access_from_query(query, table_access_map, AccessType::Read);
        }
        Statement::Insert(insert) => {
            // Target table is written to
            match &insert.table {
                TableObject::TableName(table_name) => {
                    table_access_map.insert(table_name.to_string(), AccessType::Write);
                }
                _ => {}
            }
            // Source tables in INSERT ... SELECT are read
            if let Some(source) = &insert.source {
                extract_table_access_from_query(source, table_access_map, AccessType::Read);
            }
        }
        Statement::Update { table, assignments, selection, .. } => {
            // Target table is written to
            extract_table_access_from_table_with_joins(table, table_access_map, AccessType::Write);
            
            // Tables in SET assignments are read
            for assignment in assignments {
                extract_table_access_from_expr(&assignment.value, table_access_map, AccessType::Read);
            }
            
            // Tables in WHERE clause are read
            if let Some(expr) = selection {
                extract_table_access_from_expr(expr, table_access_map, AccessType::Read);
            }
        }
        Statement::Delete(delete) => {
            // Target tables are written to
            match &delete.from {
                FromTable::WithFromKeyword(tables) => {
                    for table_with_joins in tables {
                        extract_table_access_from_table_with_joins(table_with_joins, table_access_map, AccessType::Write);
                    }
                }
                FromTable::WithoutKeyword(tables) => {
                    for table_name in tables {
                        table_access_map.insert(table_name.to_string(), AccessType::Write);
                    }
                }
            }
            // Tables in WHERE clause are read
            if let Some(selection) = &delete.selection {
                extract_table_access_from_expr(selection, table_access_map, AccessType::Read);
            }
        }
        _ => {}
    }
}

/// Extract table access information from a query
fn extract_table_access_from_query(query: &sqlparser::ast::Query, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    // Extract from CTEs (WITH clause)
    if let Some(with) = &query.with {
        for cte in &with.cte_tables {
            extract_table_access_from_query(&cte.query, table_access_map, access_type.clone());
        }
    }
    
    // Extract from main query body
    extract_table_access_from_set_expr(&query.body, table_access_map, access_type);
}

/// Extract table access information from a set expression
fn extract_table_access_from_set_expr(set_expr: &sqlparser::ast::SetExpr, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    use sqlparser::ast::*;
    
    match set_expr {
        SetExpr::Select(select) => {
            extract_table_access_from_select(select, table_access_map, access_type);
        }
        SetExpr::SetOperation { left, right, .. } => {
            extract_table_access_from_set_expr(left, table_access_map, access_type.clone());
            extract_table_access_from_set_expr(right, table_access_map, access_type);
        }
        _ => {}
    }
}

/// Extract table access information from a SELECT statement
fn extract_table_access_from_select(select: &sqlparser::ast::Select, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    use sqlparser::ast::*;
    
    // Extract from SELECT clause (subqueries in expressions)
    for item in &select.projection {
        match item {
            SelectItem::UnnamedExpr(expr) => extract_table_access_from_expr(expr, table_access_map, access_type.clone()),
            SelectItem::ExprWithAlias { expr, .. } => extract_table_access_from_expr(expr, table_access_map, access_type.clone()),
            _ => {}
        }
    }
    
    // Extract from FROM clause
    for table_with_joins in &select.from {
        extract_table_access_from_table_with_joins(table_with_joins, table_access_map, access_type.clone());
    }
    
    // Extract from WHERE clause
    if let Some(selection) = &select.selection {
        extract_table_access_from_expr(selection, table_access_map, access_type.clone());
    }
    
    // Extract from HAVING clause
    if let Some(having) = &select.having {
        extract_table_access_from_expr(having, table_access_map, access_type);
    }
}

/// Extract table access information from a table with joins
fn extract_table_access_from_table_with_joins(table_with_joins: &sqlparser::ast::TableWithJoins, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    // Extract from main table
    extract_table_access_from_table_factor(&table_with_joins.relation, table_access_map, access_type.clone());
    
    // Extract from all joins
    for join in &table_with_joins.joins {
        extract_table_access_from_table_factor(&join.relation, table_access_map, access_type.clone());
        
        // Extract from join constraints
        match &join.join_operator {
            sqlparser::ast::JoinOperator::Inner(constraint) => {
                extract_table_access_from_join_constraint(constraint, table_access_map, access_type.clone());
            }
            sqlparser::ast::JoinOperator::LeftOuter(constraint) => {
                extract_table_access_from_join_constraint(constraint, table_access_map, access_type.clone());
            }
            sqlparser::ast::JoinOperator::RightOuter(constraint) => {
                extract_table_access_from_join_constraint(constraint, table_access_map, access_type.clone());
            }
            sqlparser::ast::JoinOperator::FullOuter(constraint) => {
                extract_table_access_from_join_constraint(constraint, table_access_map, access_type.clone());
            }
            _ => {}
        }
    }
}

/// Extract table access information from a join constraint
fn extract_table_access_from_join_constraint(constraint: &sqlparser::ast::JoinConstraint, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    use sqlparser::ast::*;
    
    match constraint {
        JoinConstraint::On(expr) => {
            extract_table_access_from_expr(expr, table_access_map, access_type);
        }
        _ => {}
    }
}

/// Extract table access information from a table factor
fn extract_table_access_from_table_factor(table_factor: &sqlparser::ast::TableFactor, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    use sqlparser::ast::*;
    
    match table_factor {
        TableFactor::Table { name, .. } => {
            table_access_map.insert(name.to_string(), access_type);
        }
        TableFactor::Derived { subquery, .. } => {
            extract_table_access_from_query(subquery, table_access_map, access_type);
        }
        TableFactor::TableFunction { expr, .. } => {
            extract_table_access_from_expr(expr, table_access_map, access_type);
        }
        _ => {}
    }
}

/// Extract table access information from an expression
fn extract_table_access_from_expr(expr: &sqlparser::ast::Expr, table_access_map: &mut HashMap<String, AccessType>, access_type: AccessType) {
    use sqlparser::ast::*;
    
    match expr {
        Expr::Subquery(query) => {
            extract_table_access_from_query(query, table_access_map, access_type);
        }
        Expr::Exists { subquery, .. } => {
            extract_table_access_from_query(subquery, table_access_map, access_type);
        }
        Expr::InSubquery { subquery, .. } => {
            extract_table_access_from_set_expr(subquery, table_access_map, access_type);
        }
        Expr::BinaryOp { left, right, .. } => {
            extract_table_access_from_expr(left, table_access_map, access_type.clone());
            extract_table_access_from_expr(right, table_access_map, access_type);
        }
        Expr::UnaryOp { expr, .. } => {
            extract_table_access_from_expr(expr, table_access_map, access_type);
        }
        Expr::Cast { expr, .. } => {
            extract_table_access_from_expr(expr, table_access_map, access_type);
        }
        _ => {}
    }
}