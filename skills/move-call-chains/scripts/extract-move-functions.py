#!/usr/bin/env python3
"""Extract all function declarations from Move source files.

Usage:
    python3 extract-move-functions.py <package_dir> [<package_dir2> ...]
    python3 extract-move-functions.py --include-tests <package_dir>

Output: TSV with columns: PACKAGE | MODULE | VISIBILITY | FUNCTION | PARAMS
"""

import re
import sys
import os
from pathlib import Path

INCLUDE_TESTS = "--include-tests" in sys.argv
dirs = [a for a in sys.argv[1:] if not a.startswith("--")]

if not dirs:
    print("Usage: python3 extract-move-functions.py [--include-tests] <pkg_dir> [...]", file=sys.stderr)
    sys.exit(1)

# Regex to match function declarations
# Captures: optional visibility prefix, function name, and everything after the name
FUN_RE = re.compile(
    r'^\s*'
    r'(?:(?P<vis>public\(package\)|public|entry)\s+)?'
    r'fun\s+'
    r'(?P<name>[a-zA-Z_]\w*)'
    r'(?P<rest>.*)',
    re.MULTILINE,
)

MODULE_RE = re.compile(r'^module\s+([\w:]+)', re.MULTILINE)


def extract_params(rest: str) -> str:
    """Extract parameter list from the text after the function name."""
    # Skip generic params <...> first
    s = rest.lstrip()
    if s.startswith("<"):
        depth = 0
        for i, c in enumerate(s):
            if c == "<":
                depth += 1
            elif c == ">":
                depth -= 1
                if depth == 0:
                    s = s[i + 1:].lstrip()
                    break
    # Now extract (params)
    if s.startswith("("):
        depth = 0
        for i, c in enumerate(s):
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    return s[: i + 1]
    return "()"


print("PACKAGE\tMODULE\tVISIBILITY\tFUNCTION\tPARAMS")

for pkg_dir in dirs:
    pkg_name = os.path.basename(pkg_dir.rstrip("/"))
    pkg_path = Path(pkg_dir)

    for move_file in sorted(pkg_path.rglob("*.move")):
        # Skip build directories
        if "build" in move_file.parts:
            continue

        is_test_file = "tests" in move_file.parts
        content = move_file.read_text()

        # Get module name
        mod_match = MODULE_RE.search(content)
        module = mod_match.group(1) if mod_match else "unknown"

        # Track #[test_only] annotations
        lines = content.split("\n")
        test_only_next = False

        for line in lines:
            stripped = line.strip()

            # Track test_only annotation
            if "#[test_only" in stripped:
                test_only_next = True
                if "fun " not in stripped:
                    continue

            m = FUN_RE.match(line)
            if not m:
                test_only_next = False
                continue

            vis_raw = m.group("vis") or ""
            name = m.group("name")
            rest = m.group("rest")

            # Classify visibility
            if "public(package)" in vis_raw:
                vis = "public_package"
            elif vis_raw == "entry":
                vis = "entry"
            elif vis_raw == "public":
                vis = "public"
            else:
                vis = "private"

            # Handle test_only
            is_test = test_only_next or is_test_file
            if is_test and not INCLUDE_TESTS:
                test_only_next = False
                continue
            if is_test:
                vis = "test_only"

            params = extract_params(rest)
            print(f"{pkg_name}\t{module}\t{vis}\t{name}\t{params}")

            test_only_next = False
