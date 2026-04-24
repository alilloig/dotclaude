# ASCII Style Guide for Move Call Chain Diagrams

## Diagram Format

Render every call chain as an ASCII box-and-arrow diagram inside a
```` ```text ```` fenced block. The `text` fence keeps monospace
rendering on every markdown viewer and avoids any syntax highlighting
that would distort alignment.

Do NOT use Mermaid, Graphviz, or any other DSL — the goal is a diagram
that reads correctly in a plain terminal (`cat`, `less`, `git diff`),
in any chat transcript, and in any editor without a renderer plugin.

## Node Shapes and Visibility Tags

Every node carries a **tag** (the rightmost token on its label line)
that names the function's visibility or role. The tag does the job that
colour did in the old guide: a reader scanning the diagram identifies
entry points, helpers, externals, branches, and events at a glance.

| Move visibility / role        | ASCII shape                              | Tag       |
|-------------------------------|------------------------------------------|-----------|
| `public fun` (entry point)    | Double-ruled box with `+===+` borders    | `[PUB]`   |
| `fun` (private helper)        | Single-ruled box with `+---+` borders    | `[priv]`  |
| `public(package) fun`         | Single-ruled box with `+---+` borders    | `[pkg]`   |
| External / PAS / framework    | Angled-side box: `/-----\` top, `\-----/` bottom | `{EXT}` |
| Branching condition           | `< condition? >` single-line diamond     | `{COND}`  |
| Event emission                | Single-ruled box with `+---+` borders    | `*EVT*`   |

Examples:

```text
+===================+
|    place_bid      |  [PUB]
+===================+

+-------------------+
|  check_valid_bid  |  [priv]
+-------------------+

+----------------------------------+
|  book_matching::match_temporary  |  [pkg]
+----------------------------------+

/-------------------------\
|  PAS::send_funds(acct)  |  {EXT}
\-------------------------/

    < has_remaining? >            {COND}

+----------------------+
|   emit BidPlaced     |  *EVT*
+----------------------+
```

## Edges and Arrowheads

- Vertical flow: a `|` column, terminated by a `v` arrowhead.
- Horizontal flow: `-->` (or `---` without arrowhead when connecting
  merging branches). Use `<--` for a back-edge if one is unavoidable.
- Place edge labels immediately to the right of the arrow stem, two
  spaces of padding: `|  Auth<Admin>` or `-->|  retry`.

```text
+---------+
|    A    |  [PUB]
+---------+
     |  Auth<Admin>
     v
+---------+
|    B    |  [priv]
+---------+
```

## Auth Annotations

Annotate the outgoing edge from every entry-point node with the
authorization object the call requires. Generics render natively in
ASCII — write `Auth<Admin>`, `Auth<Investor>`, `Coin<USDC>` as-is.

## Branching

Use a single-line `< condition? >` diamond plus diverging `/` and `\`
rails. Label the outgoing arrows with `yes` / `no` (or the relevant
enum values).

```text
    < oversubscribed? >             {COND}
     /               \
   yes               no
    v                 v
+-----------+   +-----------+
| prorate   |   | fill_all  |  [priv]
+-----------+   +-----------+
```

Branches that reconverge point at the same node below; draw the
merging lines as `\` and `/` joining back to a single `|`.

## Grouping (Subgraphs)

Do not draw enclosing mega-boxes — aligning them across variable-width
inner nodes is fragile. Group with a banner-comment header above the
group and a blank line below it.

```text
-- Validation ----------------------

+-------------------+
|   check_amount    |  [priv]
+-------------------+
          |
          v
+-------------------+
|   check_window    |  [priv]
+-------------------+

-- Settlement ----------------------

+-------------------+
|   transfer_out    |  [priv]
+-------------------+
```

## Multi-line Labels

Stack label text between the top and bottom borders, padded to the
inner width of the box. Keep every inner line the same length.

```text
+-----------------------+
|   match_from_taker    |
|   (retail path)       |  [pkg]
+-----------------------+
```

## One Diagram Per Independent Operation

Each independent public operation gets its own ```` ```text ```` block.
Do NOT bundle unrelated flows (e.g. `mint` and `burn`) in the same
block — they compete for vertical space and become unreadable.

**Exception:** connected operations whose flows reference one another
(branching paths that converge, or a dispatcher that fans out to
variants) MUST stay in a single block so the cross-references are
visible.

Keep each diagram under roughly 80 lines tall; if it grows beyond that,
split into sub-diagrams per logical phase (validation, core, finalize,
emit) and link them with a short "continues below" note.

## Cross-Module Calls

When a call crosses a module boundary, include the qualifier in the
label so the reader doesn't have to guess where the function lives.

```text
+----------------------------------+
|  book_matching::match_from_bid   |  [pkg]
+----------------------------------+
```

For external packages (PAS, Sui framework, third-party), use the
angled `{EXT}` shape:

```text
/------------------------------\
|  PAS::send_funds(account)    |  {EXT}
\------------------------------/
```

## Worked Example

A complete, minimal diagram exercising entry point, auth label,
private helper, branch, and two package-visibility variants:

```text
+-------------------+
|    place_bid      |  [PUB]
+-------------------+
        |  Auth<Investor>
        v
+-------------------+
|  check_valid_bid  |  [priv]
+-------------------+
        |
        v
    < route? >                     {COND}
     /       \
   yes       no
    v         v
+---------+ +---------+
| retail  | | inst    |  [pkg]
+---------+ +---------+
```

## Legend Block for `CALL_CHAINS.md`

Paste the following under the "How to Read These Diagrams" heading at
the top of the generated `CALL_CHAINS.md`, so readers of the output
document can interpret the tags without having to find this style guide.

```text
Tag glossary
  [PUB]    public fun          — transaction entry point (double-ruled box)
  [priv]   fun                 — private module-local helper
  [pkg]    public(package) fun — intra-package helper callable from
                                 sibling modules
  {EXT}    external call       — Sui framework, PAS, or third-party
                                 package (angled-side box)
  {COND}   < condition? >      — branching predicate; yes/no rails
  *EVT*    emit EventName      — event emission

Edges
  A  -->  B        A calls B
  |Auth<Role>      edge requires the named Auth<Role> object
  /   \            branch diverges
  \   /            branch reconverges
```
