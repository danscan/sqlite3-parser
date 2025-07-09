// –
// Core Types
// –

export interface ParseResult {
  readonly success: boolean;
  readonly error?: string | undefined;
  readonly statement_count: number;
  readonly statements_json?: string | undefined;
}

export interface ParserConfig {
  readonly pretty_print?: boolean;
  readonly validate_only?: boolean;
}

// –
// AST Node Types (Complete Compatibility)
// –

export type Statement = 
  | { readonly Query: Query }
  | { readonly Insert: Insert }
  | { readonly Update: Update }
  | { readonly Delete: Delete }
  | { readonly CreateTable: CreateTable }
  | { readonly CreateView: CreateView }
  | { readonly CreateIndex: CreateIndex }
  | { readonly AlterTable: AlterTable }
  | { readonly Drop: Drop }
  | { readonly Analyze: Analyze }
  | { readonly Commit: CommitStatement }
  | { readonly Rollback: RollbackStatement }
  | { readonly Explain: Explain };

export interface Query {
  readonly body: SetExpr;
  readonly order_by: OrderByClause | null;
  readonly limit_clause: LimitClause | null;
  readonly offset?: Offset;
  readonly fetch?: Fetch;
  readonly with?: With;
}

export type SetExpr = 
  | { readonly Select: Select }
  | { readonly Query: Query }
  | { readonly Values: ValuesStatement }
  | { readonly SetOperation: SetOperation };

export interface Select {
  readonly distinct?: Distinct;
  readonly top?: Top;
  readonly projection: readonly SelectItem[];
  readonly from: readonly TableWithJoins[];
  readonly selection?: Expr;
  readonly group_by: GroupByClause;
  readonly cluster_by: readonly Expr[];
  readonly distribute_by: readonly Expr[];
  readonly sort_by: readonly Expr[];
  readonly having?: Expr;
  readonly qualify?: Expr;
  readonly named_window: readonly NamedWindowDefinition[];
}

export type SelectItem = 
  | { readonly UnnamedExpr: Expr }
  | { readonly ExprWithAlias: ExprWithAlias }
  | { readonly QualifiedWildcard: QualifiedWildcard }
  | { readonly Wildcard: WildcardAdditionalOptions };

export interface ExprWithAlias {
  readonly expr: Expr;
  readonly alias: Ident;
}

// –
// Complete Expr Type (All Variants)
// –

export type Expr = 
  | { readonly Identifier: Ident }
  | { readonly CompoundIdentifier: readonly Ident[] }
  | { readonly IsFalse: Expr }
  | { readonly IsTrue: Expr }
  | { readonly IsNull: Expr }
  | { readonly IsNotNull: Expr }
  | { readonly IsDistinctFrom: readonly [Expr, Expr] }
  | { readonly IsNotDistinctFrom: readonly [Expr, Expr] }
  | { readonly InList: InList }
  | { readonly InSubquery: InSubquery }
  | { readonly Between: Between }
  | { readonly BinaryOp: BinaryOp }
  | { readonly AnyOp: Expr }
  | { readonly AllOp: Expr }
  | { readonly UnaryOp: UnaryOp }
  | { readonly Cast: Cast }
  | { readonly TryCast: TryCast }
  | { readonly Extract: Extract }
  | { readonly Position: Position }
  | { readonly Substring: Substring }
  | { readonly Trim: Trim }
  | { readonly Collate: Collate }
  | { readonly Nested: Expr }
  | { readonly Value: Value }
  | { readonly TypedString: TypedString }
  | { readonly Function: Function }
  | { readonly Case: Case }
  | { readonly Exists: Query }
  | { readonly Subquery: Query };

// –
// Expression Supporting Types
// –

export interface InList {
  readonly expr: Expr;
  readonly list: readonly Expr[];
  readonly negated: boolean;
}

export interface InSubquery {
  readonly expr: Expr;
  readonly subquery: Query;
  readonly negated: boolean;
}

export interface Between {
  readonly expr: Expr;
  readonly negated: boolean;
  readonly low: Expr;
  readonly high: Expr;
}

export interface BinaryOp {
  readonly left: Expr;
  readonly op: BinaryOperator;
  readonly right: Expr;
}

export type BinaryOperator = 
  | "Plus" | "Minus" | "Multiply" | "Divide" | "Modulo" | "StringConcat"
  | "Gt" | "Lt" | "GtEq" | "LtEq" | "Spaceship" | "Eq" | "NotEq"
  | "And" | "Or" | "Xor" | "BitwiseOr" | "BitwiseAnd" | "BitwiseXor";

export interface UnaryOp {
  readonly op: UnaryOperator;
  readonly expr: Expr;
}

export type UnaryOperator = 
  | "Plus" | "Minus" | "Not";

export interface Cast {
  readonly expr: Expr;
  readonly data_type: DataType;
}

export interface TryCast {
  readonly expr: Expr;
  readonly data_type: DataType;
}

export interface Extract {
  readonly field: DateTimeField;
  readonly expr: Expr;
}

export interface Position {
  readonly expr: Expr;
  readonly in: Expr;
}

export interface Substring {
  readonly expr: Expr;
  readonly substring_from?: Expr;
  readonly substring_for?: Expr;
}

export interface Trim {
  readonly expr: Expr;
  readonly trim_where?: readonly [TrimWhereField, Expr];
}

export interface Collate {
  readonly expr: Expr;
  readonly collation: ObjectName;
}

export interface TypedString {
  readonly data_type: DataType;
  readonly value: string;
}

// –
// Function and Case Types
// –

export interface Function {
  readonly name: ObjectName;
  readonly args: readonly FunctionArg[];
  readonly over?: WindowType;
  readonly distinct?: boolean;
  readonly filter?: Expr;
  readonly order_by?: readonly OrderByExpr[];
}

export type FunctionArg = 
  | { readonly Named: FunctionArgNamed }
  | { readonly Unnamed: Expr }
  | { readonly Wildcard: null };

export interface FunctionArgNamed {
  readonly name: Ident;
  readonly arg: Expr;
}

export interface Case {
  readonly operand?: Expr;
  readonly conditions: readonly {
    readonly condition: Expr;
    readonly result: Expr;
  }[];
  readonly else_result?: Expr;
}

export type WindowType = 
  | { readonly WindowSpec: WindowSpec }
  | { readonly NamedWindow: Ident };

export interface WindowSpec {
  readonly partition_by: readonly Expr[];
  readonly order_by: readonly OrderByExpr[];
  readonly window_frame?: WindowFrame;
}

export interface WindowFrame {
  readonly units: WindowFrameUnits;
  readonly start_bound: WindowFrameBound;
  readonly end_bound?: WindowFrameBound;
}

export type WindowFrameUnits = "Rows" | "Range" | "Groups";

export type WindowFrameBound = 
  | "CurrentRow"
  | { readonly Preceding: Expr | null }
  | { readonly Following: Expr | null };

// –
// Value Types
// –

export interface SpanInfo {
  readonly start: { readonly line: number; readonly column: number };
  readonly end: { readonly line: number; readonly column: number };
}

export interface Value {
  readonly value: 
    | { readonly Number: readonly [string, boolean] }
    | { readonly SingleQuotedString: string }
    | { readonly NationalStringLiteral: string }
    | { readonly HexStringLiteral: string }
    | { readonly DoubleQuotedString: string }
    | { readonly Boolean: boolean }
    | { readonly Null: null }
    | { readonly Placeholder: string };
  readonly span?: SpanInfo;
}

// –
// Table and Join Types
// –

export interface TableWithJoins {
  readonly relation: TableFactor;
  readonly joins: readonly Join[];
}

export type TableFactor = 
  | { readonly Table: Table }
  | { readonly Derived: Derived };

export interface Table {
  readonly name: ObjectName;
  readonly alias?: TableAlias;
  readonly args?: readonly Expr[];
}

export interface Derived {
  readonly lateral: boolean;
  readonly subquery: Query;
  readonly alias?: TableAlias;
}



export interface Join {
  readonly relation: TableFactor;
  readonly join_operator: JoinOperator;
}

export type JoinOperator = 
  | { readonly Join: JoinConstraint }
  | { readonly LeftOuter: JoinConstraint }
  | { readonly RightOuter: JoinConstraint }
  | { readonly FullOuter: JoinConstraint }
  | { readonly CrossJoin: null };

export type JoinConstraint = 
  | { readonly On: Expr }
  | { readonly Using: readonly Ident[] }
  | { readonly Natural: null };

// –
// Statement-Specific Types
// –

export interface Insert {
  readonly or?: SqliteOnConflict;
  readonly ignore?: boolean;
  readonly into?: boolean;
  readonly table_name: ObjectName;
  readonly table_alias?: Ident;
  readonly columns: readonly Ident[];
  readonly overwrite?: boolean;
  readonly source?: Query;
  readonly partitioned?: readonly Expr[];
  readonly after_columns?: readonly Ident[];
  readonly table?: boolean;
  readonly on?: OnInsert;
  readonly returning?: readonly SelectItem[];
}

export interface Update {
  readonly table: TableWithJoins;
  readonly assignments: readonly Assignment[];
  readonly from?: readonly TableWithJoins[];
  readonly selection?: Expr;
  readonly returning?: readonly SelectItem[];
}

export interface Delete {
  readonly tables: readonly ObjectName[];
  readonly from: FromTable;
  readonly using?: readonly TableWithJoins[];
  readonly selection?: Expr;
  readonly returning?: readonly SelectItem[];
}

export interface CreateTable {
  readonly or_replace?: boolean;
  readonly temporary?: boolean;
  readonly external?: boolean;
  readonly if_not_exists?: boolean;
  readonly name: ObjectName;
  readonly columns: readonly ColumnDef[];
  readonly constraints?: readonly TableConstraint[];
  readonly location?: string;
  readonly query?: Query;
  readonly without_rowid?: boolean;
  readonly like?: ObjectName;
}

export interface CreateView {
  readonly or_replace?: boolean;
  readonly name: ObjectName;
  readonly columns: readonly Ident[];
  readonly query: Query;
  readonly with_options?: readonly SqlOption[];
}

export interface CreateIndex {
  readonly name?: ObjectName;
  readonly table_name: ObjectName;
  readonly using?: Ident;
  readonly columns: readonly OrderByExpr[];
  readonly unique?: boolean;
  readonly if_not_exists?: boolean;
  readonly predicate?: Expr;
}

export interface AlterTable {
  readonly name: ObjectName;
  readonly operation: AlterTableOperation;
}

export interface Drop {
  readonly object_type: ObjectType;
  readonly if_exists?: boolean;
  readonly names: readonly ObjectName[];
  readonly cascade?: boolean;
  readonly restrict?: boolean;
  readonly purge?: boolean;
}

export interface Analyze {
  readonly table_name: ObjectName;
  readonly partitions?: readonly Expr[];
  readonly for_columns?: boolean;
  readonly columns?: readonly Ident[];
  readonly cache_metadata?: boolean;
  readonly noscan?: boolean;
  readonly compute_statistics?: boolean;
}

// –
// Supporting Types
// –

export interface Ident {
  readonly value: string;
  readonly quote_style?: string;
}

export type ObjectName = readonly Ident[];

export interface OrderByExpr {
  readonly expr: Expr;
  readonly asc?: boolean;
  readonly nulls_first?: boolean;
}

export type OrderByClause = {
  readonly kind: {
    readonly Expressions: readonly OrderByExpr[];
  };
  readonly interpolate?: any;
} | null;

export type GroupByClause = {
  readonly Expressions: readonly [readonly Expr[], readonly Expr[]];
};

export interface LimitClause {
  readonly quantity?: Expr;
  readonly with_ties?: boolean;
}

export interface Offset {
  readonly value: Expr;
  readonly rows?: OffsetRows;
}

export type OffsetRows = "Row" | "Rows";

export interface Fetch {
  readonly with_ties?: boolean;
  readonly percent?: boolean;
  readonly quantity?: Expr;
}

export interface With {
  readonly recursive?: boolean;
  readonly cte_tables: readonly Cte[];
}

export interface Cte {
  readonly alias: TableAlias;
  readonly query: Query;
  readonly from?: Ident;
}

export interface TableAlias {
  readonly name: Ident;
  readonly columns: readonly Ident[];
}

export interface Assignment {
  readonly target: AssignmentTarget;
  readonly value: Expr;
}

export type AssignmentTarget = 
  | { readonly ColumnName: Ident }
  | { readonly Tuple: readonly Ident[] };

export interface ColumnDef {
  readonly name: Ident;
  readonly data_type: DataType;
  readonly collation?: ObjectName;
  readonly options?: readonly ColumnOptionDef[];
}

export interface TableConstraint {
  readonly name?: Ident;
  readonly spec: TableConstraintSpec;
}

export type TableConstraintSpec = 
  | { readonly Unique: readonly Ident[] }
  | { readonly PrimaryKey: readonly Ident[] }
  | { readonly ForeignKey: ForeignKeyTableConstraint }
  | { readonly Check: Expr };

export interface ForeignKeyTableConstraint {
  readonly columns: readonly Ident[];
  readonly foreign_table: ObjectName;
  readonly referred_columns: readonly Ident[];
  readonly on_delete?: ReferentialAction;
  readonly on_update?: ReferentialAction;
}

// –
// Data Types
// –

export type DataType = 
  | { readonly Char: number | null }
  | { readonly Varchar: number | null }
  | { readonly Text: null }
  | { readonly String: null }
  | { readonly SmallInt: null }
  | { readonly Int: null }
  | { readonly Integer: null }
  | { readonly BigInt: null }
  | { readonly Float: number | null }
  | { readonly Real: null }
  | { readonly Double: null }
  | { readonly Decimal: readonly [number | null, number | null] }
  | { readonly Numeric: readonly [number | null, number | null] }
  | { readonly Boolean: null }
  | { readonly Date: null }
  | { readonly Time: readonly [boolean, TimezoneInfo] }
  | { readonly Timestamp: readonly [boolean, TimezoneInfo] }
  | { readonly JSON: null }
  | { readonly Binary: number | null }
  | { readonly Varbinary: number | null }
  | { readonly Blob: number | null }
  | { readonly Custom: readonly [ObjectName, readonly string[]] };

export type TimezoneInfo = "None" | "WithTimeZone" | "WithoutTimeZone";

// –
// Enum Types
// –

export type Distinct = "Distinct" | { readonly On: readonly Expr[] };

export interface Top { 
  readonly quantity?: Expr; 
  readonly percent?: boolean;
  readonly with_ties?: boolean; 
}

export type GroupByExpr = Expr;

export interface NamedWindowDefinition { 
  readonly name: Ident; 
  readonly window_spec: WindowSpec; 
}

export interface WildcardAdditionalOptions { 
  readonly opt_ilike?: Expr; 
  readonly opt_exclude?: Expr; 
  readonly opt_except?: Expr;
  readonly opt_replace?: Expr;
  readonly opt_rename?: Expr;
}

export interface QualifiedWildcard { 
  readonly prefix: ObjectName; 
  readonly options?: WildcardAdditionalOptions; 
}

export type SqliteOnConflict = "Replace" | "Rollback" | "Abort" | "Fail" | "Ignore";

export type OnInsert = 
  | { readonly DuplicateKeyUpdate: readonly Assignment[] } 
  | { readonly OnConflict: OnConflict };

export interface OnConflict { 
  readonly conflict_target?: ConflictTarget; 
  readonly action: OnConflictAction; 
}

export type ConflictTarget = 
  | { readonly Columns: readonly Ident[] } 
  | { readonly OnConstraint: ObjectName };

export type OnConflictAction = 
  | "DoNothing" 
  | { readonly DoUpdate: DoUpdate };

export interface DoUpdate { 
  readonly assignments: readonly Assignment[]; 
  readonly selection?: Expr; 
}

export type FromTable = 
  | { readonly WithFromKeyword: readonly TableWithJoins[] } 
  | { readonly WithoutKeyword: readonly ObjectName[] };

export type TrimWhereField = "Both" | "Leading" | "Trailing";

export type DateTimeField = 
  | "Year" | "Month" | "Day" | "Hour" | "Minute" | "Second"
  | "Dow" | "Doy" | "Epoch" | "Julian" | "Microseconds" 
  | "Milliseconds" | "Nanoseconds" | "Quarter" | "Week";

export type ObjectType = 
  | "Table" | "View" | "Index" | "Schema" | "Database" | "Function" 
  | "Procedure" | "Sequence" | "Stage" | "Role" | "Type";

export type AlterTableOperation = 
  | { readonly AddConstraint: TableConstraint }
  | { readonly AddColumn: ColumnDef }
  | { readonly DropColumn: readonly [Ident, boolean] }
  | { readonly DropConstraint: Ident }
  | { readonly AlterColumn: AlterColumnOperation }
  | { readonly RenameTable: ObjectName }
  | { readonly RenameColumn: readonly [Ident, Ident] };

export type AlterColumnOperation = 
  | { readonly SetNotNull: null }
  | { readonly DropNotNull: null }
  | { readonly SetDefault: Expr }
  | { readonly DropDefault: null }
  | { readonly SetDataType: DataType };

export type ReferentialAction = 
  | "Restrict" | "Cascade" | "SetNull" | "NoAction" | "SetDefault";

export interface ColumnOptionDef {
  readonly name?: Ident;
  readonly option: ColumnOption;
}

export type ColumnOption = 
  | { readonly NotNull: null }
  | { readonly Null: null }
  | { readonly Default: Expr }
  | { readonly Unique: boolean }
  | { readonly PrimaryKey: null }
  | { readonly ForeignKey: ForeignKeyConstraint }
  | { readonly Check: Expr }
  | { readonly DialectSpecific: readonly string[] };

export interface ForeignKeyConstraint {
  readonly foreign_table: ObjectName;
  readonly referred_columns: readonly Ident[];
  readonly on_delete?: ReferentialAction;
  readonly on_update?: ReferentialAction;
}

// –
// Additional Statement Types
// –

export interface ValuesStatement {
  readonly explicit_row: boolean;
  readonly rows: readonly (readonly Expr[])[];
}

export interface SetOperation {
  readonly op: SetOperator;
  readonly set_quantifier?: SetQuantifier;
  readonly left: SetExpr;
  readonly right: SetExpr;
}

export type SetOperator = "Union" | "Except" | "Intersect";

export type SetQuantifier = "All" | "Distinct" | "None";



export interface SqlOption {
  readonly name: ObjectName;
  readonly value: Expr;
}

export interface CommitStatement {
  readonly chain: boolean;
}

export interface RollbackStatement {
  readonly chain: boolean;
}

export interface Explain {
  readonly analyze: boolean;
  readonly verbose: boolean;
  readonly options?: readonly SqlOption[];
  readonly format?: AnalyzeFormat;
  readonly statement: Statement;
}

export type AnalyzeFormat = "TEXT" | "XML" | "JSON" | "YAML";

// –
// Table Access Tracking Types
// –

export type AccessType = "Read" | "Write";

export interface TableAccess {
  readonly name: string;
  readonly access_type: AccessType;
}

export interface TableAccessInfo {
  readonly tables: readonly TableAccess[];
} 