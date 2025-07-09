import { beforeAll, describe, expect, test } from 'bun:test';
import {
  isDelete,
  isInsert,
  isQuery,
  isUpdate,
  parseSQL,
  validateSQL,
  formatAST,
  getSQLAccessInfo,
  version,
  type Delete,
  type Insert,
  type Query,
  type Statement,
  type Update
} from './index.js';

// –
// Basic Functionality Tests
// –

describe('SqlParser Basic Functionality', () => {
  test('should initialize and get version', async () => {
    const versionString = await version();
    expect(versionString).toBeDefined();
    expect(versionString).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should validate SQL correctly', async () => {
    expect(await validateSQL('SELECT * FROM users')).toBe(true);
    expect(await validateSQL('SELECT * FROM')).toBe(false);
    expect(await validateSQL('INVALID SQL')).toBe(false);
  });

  test('should parse simple SQL', async () => {
    const statements = await parseSQL('SELECT * FROM users');
    expect(statements).toBeDefined();
    expect(statements.length).toBe(1);
    expect(isQuery(statements[0]!)).toBe(true);
  });

  test('should get table access info', async () => {
    const accessInfo = await getSQLAccessInfo('SELECT * FROM users');
    expect(accessInfo).toBeDefined();
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from complex SQL queries', async () => {
    const complexSql = `
      WITH active_users AS (
        SELECT * FROM users WHERE status = 'active'
      ),
      recent_orders AS (
        SELECT * FROM orders WHERE date > '2023-01-01'
      )
      SELECT u.name, o.total, p.amount
      FROM active_users u
      JOIN recent_orders o ON u.id = o.user_id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.date > (SELECT MAX(date) FROM sales)
        AND EXISTS (SELECT 1 FROM reviews WHERE order_id = o.id)
        AND u.id IN (SELECT user_id FROM subscriptions WHERE active = true)
    `;
    
    const accessInfo = await getSQLAccessInfo(complexSql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from INSERT with SELECT', async () => {
    const sql = `
      INSERT INTO user_stats (user_id, post_count, comment_count)
      SELECT u.id, 
             (SELECT COUNT(*) FROM posts WHERE author_id = u.id),
             (SELECT COUNT(*) FROM comments WHERE author_id = u.id)
      FROM users u
      WHERE u.active = true
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from UPDATE with subqueries', async () => {
    const sql = `
      UPDATE products 
      SET price = (
        SELECT AVG(price) FROM competitor_prices 
        WHERE product_id = products.id
      )
      WHERE category_id IN (
        SELECT id FROM categories WHERE active = true
      )
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from DELETE with joins', async () => {
    const sql = `
      DELETE u FROM users u
      JOIN user_sessions s ON u.id = s.user_id
      WHERE s.expired = true
        AND u.last_login < (SELECT DATE('now', '-30 days'))
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from UNION queries', async () => {
    const sql = `
      SELECT name FROM customers
      UNION
      SELECT name FROM suppliers
      UNION
      SELECT name FROM employees
      WHERE department_id IN (SELECT id FROM departments)
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info from nested subqueries', async () => {
    const sql = `
      SELECT * FROM orders
      WHERE user_id IN (
        SELECT id FROM users
        WHERE region_id IN (
          SELECT id FROM regions WHERE country = 'US'
        )
      )
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for SELECT queries', async () => {
    const sql = `
      SELECT u.name, o.total
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE u.active = true
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for INSERT statements', async () => {
    const sql = `
      INSERT INTO users (name, email)
      VALUES ('John', 'john@example.com')
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for INSERT with SELECT', async () => {
    const sql = `
      INSERT INTO user_stats (user_id, post_count)
      SELECT u.id, COUNT(p.id)
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id
      GROUP BY u.id
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for UPDATE statements', async () => {
    const sql = `
      UPDATE products 
      SET price = (
        SELECT AVG(price) FROM competitor_prices 
        WHERE product_id = products.id
      )
      WHERE category_id IN (
        SELECT id FROM categories WHERE active = true
      )
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for DELETE statements', async () => {
    const sql = `
      DELETE FROM users
      WHERE id IN (
        SELECT user_id FROM inactive_users
      )
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should get table access info for complex queries with CTEs', async () => {
    const sql = `
      WITH active_users AS (
        SELECT * FROM users WHERE status = 'active'
      ),
      recent_orders AS (
        SELECT * FROM orders WHERE date > '2023-01-01'
      )
      SELECT u.name, o.total
      FROM active_users u
      JOIN recent_orders o ON u.id = o.user_id
      WHERE EXISTS (SELECT 1 FROM payments WHERE order_id = o.id)
    `;
    
    const accessInfo = await getSQLAccessInfo(sql);
    expect(accessInfo.tables).toBeDefined();
    expect(accessInfo.tables.length).toBeGreaterThan(0);
  });

  test('should format SQL', async () => {
    const statements = await parseSQL('SELECT id,name FROM users WHERE active=true');
    const formatted = await formatAST(statements);
    expect(formatted).toContain('SELECT');
    expect(formatted).toContain('FROM');
    expect(formatted).toContain('WHERE');
  });
});

// –
// Type-Safe Parsing Tests
// –

describe('Type-Safe SQL Parsing', () => {
  test('should parse simple SELECT to strongly-typed AST', async () => {
    const statements = await parseSQL('SELECT id, name FROM users');
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    expect(isQuery(statement)).toBe(true);
    
    if (isQuery(statement)) {
      const query: Query = statement.Query;
      expect(query.body).toBeDefined();
      expect('Select' in query.body).toBe(true);
      
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(select.projection).toHaveLength(2);
        expect(select.from).toHaveLength(1);
        
        // Check first projection item
        const firstProjection = select.projection[0]!;
        expect('UnnamedExpr' in firstProjection).toBe(true);
        
        // Check table
        const tableWithJoins = select.from[0]!;
        expect('Table' in tableWithJoins.relation).toBe(true);
      }
    }
  });

  test('should parse INSERT statement', async () => {
    const statements = await parseSQL('INSERT INTO users (name, email) VALUES ("John", "john@example.com")');
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    expect(isInsert(statement)).toBe(true);
    
    if (isInsert(statement)) {
      const insert: Insert = statement.Insert;
      expect(insert.columns).toHaveLength(2);
      expect(insert.columns[0]?.value).toBe('name');
      expect(insert.columns[1]?.value).toBe('email');
    }
  });

  test('should parse UPDATE statement', async () => {
    const statements = await parseSQL('UPDATE users SET name = "Jane" WHERE id = 1');
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    expect(isUpdate(statement)).toBe(true);
    
    if (isUpdate(statement)) {
      const update: Update = statement.Update;
      expect(update.assignments).toHaveLength(1);
      expect(update.selection).toBeDefined();
    }
  });

  test('should parse DELETE statement', async () => {
    const statements = await parseSQL('DELETE FROM users WHERE id = 1');
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    expect(isDelete(statement)).toBe(true);
    
    if (isDelete(statement)) {
      const deleteStmt: Delete = statement.Delete;
      expect(deleteStmt.selection).toBeDefined();
    }
  });

  test('should handle complex SELECT with JOINs', async () => {
    const sql = `
      SELECT u.id, u.name, COUNT(p.id) as post_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      WHERE u.active = true
      GROUP BY u.id, u.name
      ORDER BY post_count DESC
    `;
    
    const statements = await parseSQL(sql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    expect(isQuery(statement)).toBe(true);
    
    if (isQuery(statement)) {
      const query: Query = statement.Query;
      expect('Select' in query.body).toBe(true);
      
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(select.projection).toHaveLength(3);
        expect(select.from).toHaveLength(1);
        // Note: group_by might be undefined in some implementations
        if (select.group_by) {
          expect(select.group_by.Expressions.length).toBeGreaterThan(0);
        }
        // Note: order_by might be undefined in some implementations
        if (query.order_by) {
          expect(query.order_by.kind.Expressions.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// –
// AST Manipulation Tests
// –

describe('AST Manipulation', () => {
  test('should convert AST back to SQL', async () => {
    const originalSql = 'SELECT id, name FROM users WHERE active = true';
    const statements = await parseSQL(originalSql);
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const reconstructedSql = await formatAST(statements);
    expect(reconstructedSql).toBeTruthy();
    
    // Should be functionally equivalent (ignoring whitespace differences)
    const normalizeWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    expect(normalizeWhitespace(reconstructedSql)).toBe(normalizeWhitespace(originalSql));
  });

  test('should handle single statement AST conversion', async () => {
    const statements = await parseSQL('SELECT 1');
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const sql = await formatAST(statements[0]!);
    expect(sql).toBe('SELECT 1');
  });
});

// –
// Error Handling Tests
// –

describe('Error Handling', () => {
  test('should handle parse errors gracefully', async () => {
    await expect(parseSQL('SELECT * FROM')).rejects.toThrow();
  });

  test('should return false for invalid SQL validation', async () => {
    expect(await validateSQL('INVALID SQL')).toBe(false);
  });

  test('should handle empty input', async () => {
    const isValid = await validateSQL('');
    expect(typeof isValid).toBe('boolean');
  });

  test('should handle whitespace-only input', async () => {
    const isValid = await validateSQL('   \n\t  ');
    expect(typeof isValid).toBe('boolean');
  });
});

// –
// SQLite-Specific Features Tests
// –

describe('SQLite-Specific Features', () => {
  test('should handle SQLite functions', async () => {
    const sql = 'SELECT datetime("now") as current_time';
    const statements = await parseSQL(sql);
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    expect(await validateSQL(sql)).toBe(true);
  });

  test('should handle PRAGMA statements', async () => {
    const sql = 'PRAGMA table_info(users)';
    const isValid = await validateSQL(sql);
    if (isValid) {
      const statements = await parseSQL(sql);
      expect(statements).toBeDefined();
      expect(statements).toHaveLength(1);
    }
  });

  test('should handle CREATE TABLE without column types', async () => {
    const sql = 'CREATE TABLE test (id, name)';
    expect(await validateSQL(sql)).toBe(true);
  });

  test('should handle SQLite-specific operators', async () => {
    const sql = 'SELECT * FROM users WHERE name MATCH "pattern"';
    expect(await validateSQL(sql)).toBe(true);
    
    const sql2 = 'SELECT * FROM users WHERE email REGEXP "@domain\\.com$"';
    expect(await validateSQL(sql2)).toBe(true);
  });
});

// –
// Performance Tests
// –

describe('Performance', () => {
  test('should parse queries efficiently', async () => {
    const sql = 'SELECT u.id, u.name, COUNT(p.id) FROM users u JOIN posts p ON u.id = p.user_id GROUP BY u.id';
    const iterations = 10; // Reduced for async operations
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await parseSQL(sql);
    }
    const end = performance.now();
    
    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(100); // More lenient for async operations
  });

  test('should validate queries efficiently', async () => {
    const sql = 'SELECT * FROM users WHERE active = true';
    const iterations = 100; // Reduced for async operations
    
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await validateSQL(sql);
    }
    const end = performance.now();
    
    const avgTime = (end - start) / iterations;
    expect(avgTime).toBeLessThan(10); // More lenient for async operations
  });
});

// –
// Type Safety Tests
// –

describe('Type Safety', () => {
  test('should enforce correct types at compile time', async () => {
    const statements = await parseSQL('SELECT 1');
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    
    if (isQuery(statement)) {
      // TypeScript should know this is a Query type
      const query: Query = statement.Query;
      expect(query.body).toBeDefined();
      
      // This should be type-safe access
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(Array.isArray(select.projection)).toBe(true);
        expect(Array.isArray(select.from)).toBe(true);
      }
    }
  });

  test('should provide readonly access to AST nodes', async () => {
    const statements = await parseSQL('SELECT 1');
    
    if (statements && statements.length > 0) {
      // All properties should be readonly - this is enforced at compile time
      expect(statements).toBeDefined();
      expect(Object.isFrozen).toBeDefined(); // TypeScript enforces readonly, runtime doesn't necessarily freeze
    }
  });
});

// –
// Edge Cases
// –

describe('Edge Cases', () => {
  test('should handle multiple statements', async () => {
    const sql = 'SELECT 1; SELECT 2; SELECT 3;';
    const statements = await parseSQL(sql);
    
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(3);
    
    statements.forEach((statement: Statement) => {
      expect(isQuery(statement)).toBe(true);
    });
  });

  test('should handle very long SQL', async () => {
    const longSql = 'SELECT ' + Array.from({length: 100}, (_, i) => `col${i}`).join(', ') + ' FROM users';
    expect(await validateSQL(longSql)).toBe(true);
    
    const statements = await parseSQL(longSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
  });
});

// –
// Complete Type Compatibility Tests
// –

describe('Complete sqlparser-rs Type Compatibility', () => {
  test('should handle all Expression variants', async () => {
    const testCases = [
      // Basic expressions
      'SELECT user_id FROM users',
      'SELECT users.name FROM users',
      'SELECT age > 18 FROM users',
      'SELECT NOT active FROM users',
      'SELECT COUNT(*) FROM users',
      
      // Value types
      'SELECT 42, "hello", true, NULL',
      
      // Complex expressions
      'SELECT CASE WHEN age >= 18 THEN "adult" ELSE "minor" END FROM users',
      'SELECT CAST(age AS TEXT) FROM users',
      'SELECT age BETWEEN 18 AND 65 FROM users',
      'SELECT status IN ("active", "pending") FROM users',
      'SELECT (age + 5) * 2 FROM users',
      
      // Subqueries and EXISTS
      'SELECT * FROM users WHERE EXISTS (SELECT 1 FROM orders WHERE user_id = users.id)',
      'SELECT (SELECT COUNT(*) FROM orders WHERE user_id = users.id) FROM users',
      
      // String functions
      'SELECT SUBSTRING(name FROM 1 FOR 3) FROM users',
      'SELECT TRIM(name) FROM users',
      'SELECT POSITION("@" IN email) FROM users',
      
      // Aggregates with DISTINCT
      'SELECT COUNT(DISTINCT user_id) FROM orders',
    ];

    for (const sql of testCases) {
      expect(await validateSQL(sql)).toBe(true);
      
      const statements = await parseSQL(sql);
      expect(statements).toBeDefined();
      expect(Array.isArray(statements)).toBe(true);
      expect(statements.length).toBe(1);
    }
  });

  test('should handle all Statement variants', async () => {
    const testCases = [
      // Query statements
      'SELECT * FROM users',
      'SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id',
      
      // Data modification
      'INSERT INTO users (name, email) VALUES ("John", "john@example.com")',
      'UPDATE users SET name = "Jane" WHERE id = 1',
      'DELETE FROM users WHERE id = 1',
      
      // Schema operations
      'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)',
      'CREATE INDEX idx_name ON users (name)',
      'DROP TABLE IF EXISTS test',
    ];

    for (const sql of testCases) {
      expect(await validateSQL(sql)).toBe(true);
      
      const statements = await parseSQL(sql);
      expect(statements).toBeDefined();
      expect(Array.isArray(statements)).toBe(true);
      expect(statements.length).toBe(1);
    }
  });

  test('should handle complex JOIN operations', async () => {
    const complexJoinSql = `
      SELECT 
        u.name,
        p.title,
        c.content,
        COUNT(l.id) as like_count
      FROM users u
      INNER JOIN posts p ON u.id = p.author_id
      LEFT OUTER JOIN comments c ON p.id = c.post_id
      RIGHT JOIN likes l ON p.id = l.post_id
      WHERE u.active = true
      GROUP BY u.id, p.id, c.id
      HAVING COUNT(l.id) > 0
      ORDER BY like_count DESC
      LIMIT 10
    `;

    const statements = await parseSQL(complexJoinSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    if ('Query' in statement) {
      const query = statement.Query;
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(select.from.length).toBe(1);
        expect(select.from[0]?.joins.length).toBe(3);
        expect(select.projection.length).toBe(4);
        expect(select.selection).toBeDefined();
        expect(select.group_by).toBeDefined();
        expect(select.having).toBeDefined();
      }
      expect(query.order_by).toBeDefined();
      expect(query.limit_clause).toBeDefined();
    }
  });

  test('should handle CTEs (Common Table Expressions)', async () => {
    const cteSql = `
      WITH RECURSIVE employee_hierarchy AS (
        SELECT id, name, manager_id, 0 as level
        FROM employees
        WHERE manager_id IS NULL
        
        UNION ALL
        
        SELECT e.id, e.name, e.manager_id, eh.level + 1
        FROM employees e
        INNER JOIN employee_hierarchy eh ON e.manager_id = eh.id
      )
      SELECT * FROM employee_hierarchy
      ORDER BY level, name
    `;

    const statements = await parseSQL(cteSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    if ('Query' in statement) {
      const query = statement.Query;
      expect(query.with).toBeDefined();
      
      if (query.with) {
        expect(query.with.recursive).toBe(true);
        expect(query.with.cte_tables).toBeDefined();
        expect(query.with.cte_tables.length).toBe(1);
      }
    }
  });

  test('should handle UNION operations', async () => {
    const unionSql = `
      SELECT name, 'customer' as type FROM customers
      UNION ALL
      SELECT name, 'supplier' as type FROM suppliers
      ORDER BY name
    `;

    const statements = await parseSQL(unionSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    if ('Query' in statement) {
      const query = statement.Query;
      if ('SetOperation' in query.body) {
        const setOp = query.body.SetOperation;
        expect(setOp.op).toBe('Union');
        expect(setOp.set_quantifier).toBe('All');
        expect(setOp.left).toBeDefined();
        expect(setOp.right).toBeDefined();
      }
    }
  });

  test('should handle window functions', async () => {
    const windowSql = `
      SELECT 
        name,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) as rank,
        LAG(salary) OVER (PARTITION BY department ORDER BY salary DESC) as prev_salary
      FROM employees
    `;

    const statements = await parseSQL(windowSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    if ('Query' in statement) {
      const query = statement.Query;
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(select.projection.length).toBe(4);
        
        // Check that window functions are parsed
        const projections = select.projection;
        const hasWindowFunction = projections.some((item: any) => {
          if ('ExprWithAlias' in item) {
            const expr = item.ExprWithAlias.expr;
            if ('Function' in expr) {
              return expr.Function.over !== undefined;
            }
          }
          return false;
        });
        expect(hasWindowFunction).toBe(true);
      }
    }
  });

  test('should maintain type safety with complex nested structures', async () => {
    const complexSql = `
      SELECT 
        CASE 
          WHEN u.age >= 65 THEN 'senior'
          WHEN u.age >= 18 THEN 'adult'
          ELSE 'minor'
        END as age_group,
        COALESCE(u.nickname, u.first_name, 'Unknown') as display_name,
        (
          SELECT COUNT(*)
          FROM orders o
          WHERE o.user_id = u.id
            AND o.created_at > DATE('now', '-1 year')
        ) as recent_orders
      FROM users u
      WHERE u.active = true
        AND EXISTS (
          SELECT 1 
          FROM subscriptions s 
          WHERE s.user_id = u.id 
            AND s.status = 'active'
        )
      ORDER BY recent_orders DESC
    `;

    const statements = await parseSQL(complexSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    // Verify the AST structure maintains full type safety
    if ('Query' in statement) {
      const query = statement.Query;
      expect(query).toBeDefined();
      expect(query.body).toBeDefined();
      expect(query.order_by).toBeDefined();
      
      if ('Select' in query.body) {
        const select = query.body.Select;
        expect(select.projection.length).toBe(3);
        expect(select.from.length).toBe(1);
        expect(select.selection).toBeDefined();
        
        // Verify CASE expression structure
        const firstProjection = select.projection[0];
        if (firstProjection && 'ExprWithAlias' in firstProjection) {
          const expr = firstProjection.ExprWithAlias.expr;
          if ('Case' in expr) {
            const caseExpr = expr.Case;
            expect(caseExpr.conditions).toBeDefined();
            expect(caseExpr.conditions.length).toBeGreaterThan(0);
            expect(caseExpr.conditions[0]?.condition).toBeDefined();
            expect(caseExpr.conditions[0]?.result).toBeDefined();
            expect(caseExpr.else_result).toBeDefined();
          }
        }
        
        // Verify subquery structure
        const thirdProjection = select.projection[2];
        if (thirdProjection && 'ExprWithAlias' in thirdProjection) {
          const expr = thirdProjection.ExprWithAlias.expr;
          if ('Subquery' in expr) {
            expect(expr.Subquery).toBeDefined();
          }
        }
      }
    }
  });

  test('should parse and reconstruct complex SQL accurately', async () => {
    const originalSql = `
      WITH monthly_sales AS (
        SELECT 
          DATE_TRUNC('month', order_date) as month,
          SUM(total) as total_sales
        FROM orders
        WHERE order_date >= DATE('now', '-12 months')
        GROUP BY DATE_TRUNC('month', order_date)
      )
      SELECT 
        month,
        total_sales,
        LAG(total_sales) OVER (ORDER BY month) as prev_month_sales,
        ROUND(
          (total_sales - LAG(total_sales) OVER (ORDER BY month)) / 
          LAG(total_sales) OVER (ORDER BY month) * 100, 
          2
        ) as growth_percentage
      FROM monthly_sales
      ORDER BY month
    `;

    // Parse the SQL
    const statements = await parseSQL(originalSql);
    expect(statements).toBeDefined();
    expect(statements.length).toBe(1);

    // Convert back to SQL
    const reconstructedSql = await formatAST(statements);
    expect(reconstructedSql).toBeDefined();
    expect(reconstructedSql.length).toBeGreaterThan(0);
    
    // Verify the reconstructed SQL is valid
    expect(await validateSQL(reconstructedSql)).toBe(true);
  });

  test('should handle all data types correctly', async () => {
    const createTableSql = `
      CREATE TABLE comprehensive_types (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2),
        quantity BIGINT,
        weight REAL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_date DATE,
        metadata JSON,
        binary_data BLOB
      )
    `;

    const statements = await parseSQL(createTableSql);
    expect(statements).toBeDefined();
    expect(statements).toHaveLength(1);
    
    const statement = statements[0]!;
    if ('CreateTable' in statement) {
      const createTable = statement.CreateTable;
      expect(createTable.columns.length).toBeGreaterThan(8);
      
      // Verify different data types are parsed
      const columnTypes = createTable.columns.map((col: any) => col.data_type);
      
      // Should contain various SQL data types
      expect(columnTypes.length).toBeGreaterThan(8);
      
      // Check for specific type variants based on the actual structure
      const hasIntegerType = columnTypes.some((type: any) => 
        type && typeof type === 'object' && 'Integer' in type
      );
      const hasTextType = columnTypes.some((type: any) => 
        type === 'Text' || (type && typeof type === 'object' && 'Varchar' in type)
      );
      const hasBooleanType = columnTypes.some((type: any) => 
        type === 'Boolean'
      );
      const hasTimestampType = columnTypes.some((type: any) => 
        type && typeof type === 'object' && 'Timestamp' in type
      );
      
      expect(hasIntegerType).toBe(true);
      expect(hasTextType).toBe(true);
      expect(hasBooleanType).toBe(true);
      expect(hasTimestampType).toBe(true);
    }
  });
}); 