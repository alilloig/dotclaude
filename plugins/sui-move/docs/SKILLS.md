# Skills Reference

The sui-move plugin includes three bundled skills that provide specialized Move development capabilities.

## move-code-quality

**Command**: `/move-code-quality`

Analyzes Move packages against the official Move Book Code Quality Checklist. This skill focuses on syntax, idioms, and Move 2024 Edition compliance.

### What It Checks

**Package Manifest (Move.toml)**
- Edition specification (requires `edition = "2024"` or `"2024.beta"`)
- Implicit framework dependencies (no explicit Sui, Bridge, MoveStdlib for Sui 1.45+)
- Named address prefixing

**Module Syntax**
- Modern module label syntax (`module pkg::name;` not curly braces)
- Grouped use statements with Self
- No single Self in use statements

**Naming Conventions**
- Error constants: `EPascalCase`
- Regular constants: `ALL_CAPS`
- Capabilities: `*Cap` suffix
- Events: past tense names
- Getters: field name, not `get_*`

**Function Patterns**
- No `public entry` (use `public` or `entry`)
- Composable functions returning values for PTBs
- Correct parameter ordering (objects, caps, primitives, Clock, TxContext)

**Method Syntax**
- `ctx.sender()` not `tx_context::sender(ctx)`
- `id.delete()` not `object::delete(id)`
- `b"hello".to_string()` not `utf8(b"hello")`
- Vector literals and index syntax
- Collection index syntax

**Macros**
- `opt.do!()` for Option handling
- `opt.destroy_or!()` for default values
- `vec.do_ref!()` for iteration
- `vec.fold!()` for reduction
- `vec.filter!()` for filtering

**Testing**
- Merged `#[test, expected_failure]` attributes
- No `test_` prefix on test functions
- `assert_eq!` over `assert!(a == b)`
- `std::unit_test::destroy` for cleanup

### Example Output

```markdown
## Move Code Quality Analysis

### Summary
- 8 checks passed
- 3 improvements recommended
- 1 critical issue

### Critical Issues

#### 1. Missing Move 2024 Edition
**File**: `Move.toml:2`
**Fix**: Add `edition = "2024"`

### Recommended Improvements

#### 2. Legacy Module Syntax
**File**: `sources/pool.move:1`
**Current**: `module pkg::pool { ... }`
**Recommended**: `module pkg::pool;`
```

## move-code-review

**Command**: `/move-code-review`

Security, architecture, and design review for Sui Move smart contracts. This skill identifies vulnerabilities and architectural issues that could cause financial loss or incorrect behavior.

### Severity Levels

| Level | Weight | Criteria |
|-------|--------|----------|
| S1 Critical | 10 | Direct financial loss, unauthorized access |
| S2 High | 7 | Incorrect behavior, availability impact |
| S3 Medium | 4 | Maintainability risk, reduced composability |
| S4 Low | 2 | Code quality, documentation gaps |

### What It Checks

**Security (SEC)**
- Unprotected public functions (`SEC-AC-1`)
- Authorization returning bool without assert (`SEC-AC-2`)
- Missing capability checks (`SEC-AC-3`)
- Division by zero (`SEC-AR-1`)
- Integer truncation (`SEC-AR-2`)
- Precision loss (`SEC-AR-3`)
- Inverted security logic (`SEC-LG-1`)
- Wrong field update (`SEC-LG-2`)

**Design (DES)**
- VecMap/VecSet for unbounded collections (`DES-OM-1`)
- Shared object contention (`DES-OM-2`)
- Transfer without receive logic (`DES-BT-1`)
- Functions that transfer instead of return (`DES-FN-1`)
- Unnecessary batch functions (`DES-FN-2`)

**Patterns (PAT)**
- Missing version checks (`PAT-VM-1`)
- Solidity-style auth patterns (`PAT-CP-1`)
- Unnecessary `public(package)` (`PAT-CP-2`)

**Testing (TST)**
- No tests for security-critical functions (`TST-CV-1`)
- Only happy-path tests (`TST-CV-2`)
- Missing bounds checking (`TST-VL-1`)

**Quality (QA)**
- Unreachable code (`QA-UC-1`)
- Large modules (>500 lines) (`QA-MO-1`)
- Generic variable names (`QA-NM-1`)

### Example Output

```markdown
## Move Code Security & Architecture Review

### Findings Summary

| # | ID | Severity | File | Summary |
|---|-----|----------|------|---------|
| 1 | SEC-AC-1 | S1 | admin.move:45 | Unprotected mint function |
| 2 | SEC-AR-1 | S1 | pool.move:112 | Division by zero in fee calc |

### Risk Score

| Severity | Count | Subtotal |
|----------|-------|----------|
| S1 Critical | 2 | 20 |
| **Total** | **2** | **20** |

**Risk Rating**: High
```

## move-tests

**Command**: `/move-tests`

Generates Move unit tests following best practices. This skill helps you write tests that are maintainable, thorough, and properly structured.

### Guidelines

**File Organization**
- Tests go in `tests/` directory, not `sources/`
- Name files after the module: `pool_tests.move` for `pool.move`

**What to Test**
- Only test `public` and `entry` functions
- Never call `public(package)` or private functions directly

**Test Utilities**
- `std::unit_test::destroy` for cleanup
- `sui::coin::mint_for_testing` for test coins
- `sui::test_utils::create_one_time_witness_for_testing` for OTW

**When to Use test_scenario**
- Multi-transaction flows
- Multiple senders
- Object retrieval across transactions
- Otherwise, use `tx_context::dummy()`

**init_for_testing Pattern**
```move
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
```

### Example Output

```move
module my_package::pool_tests;

use sui::test_scenario;
use my_package::pool;

#[test]
fun test_create_pool() {
    let mut ctx = tx_context::dummy();
    let pool = pool::new(&mut ctx);
    
    assert_eq!(pool.balance(), 0);
    
    std::unit_test::destroy(pool);
}

#[test, expected_failure(abort_code = pool::EInsufficientLiquidity)]
fun test_swap_empty_pool_fails() {
    let mut ctx = tx_context::dummy();
    let mut pool = pool::new(&mut ctx);
    let coin = pool.swap(coin::mint_for_testing<SUI>(100, &mut ctx));
    
    std::unit_test::destroy(pool);
    std::unit_test::destroy(coin);
}
```

### Coverage Commands

After generating tests, verify coverage:

```bash
sui move test --coverage --trace
sui move coverage summary
sui move coverage source --module <NAME>
```

Target 80%+ coverage for production code.

## Skill Workflow

For comprehensive code review, run skills in this order:

1. `/move-code-quality` - Fix syntax and idiom issues
2. `/move-code-review` - Address security and design issues
3. `/move-tests` - Generate tests for remaining gaps

Each skill focuses on a distinct aspect of code quality, and together they provide comprehensive coverage.
