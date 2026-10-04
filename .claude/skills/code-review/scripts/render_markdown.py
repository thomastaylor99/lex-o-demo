# Usage:
#   uv run --with pydantic python3 scripts/render_markdown.py < output.json
#   uv run --with pydantic python3 scripts/render_markdown.py --threshold 80 < output.json
#   uv run --with pydantic python3 scripts/render_markdown.py --test

import json
import sys
from typing import Annotated, Literal

from pydantic import BaseModel, Field, ValidationError, computed_field, model_validator

MAX_BYTES = 60_000


# -- Models --


class Finding(BaseModel):
    category: Literal["correctness", "security", "convention", "resource"]
    confidence: Annotated[int, Field(ge=0, le=100)]
    file: Annotated[str, Field(min_length=1)]
    line_range: tuple[Annotated[int, Field(ge=1)], Annotated[int, Field(ge=1)]]
    description: Annotated[str, Field(min_length=1)]
    reasoning: Annotated[str, Field(min_length=1)]

    @computed_field
    @property
    def severity(self) -> Literal["critical", "high", "medium", "low"]:
        if self.confidence >= 90:
            return "critical"
        if self.confidence >= 75:
            return "high"
        if self.confidence >= 50:
            return "medium"
        return "low"

    @model_validator(mode="after")
    def line_range_ordered(self) -> "Finding":
        if self.line_range[0] > self.line_range[1]:
            msg = f"line_range start ({self.line_range[0]}) > end ({self.line_range[1]})"
            raise ValueError(msg)
        return self


class ReviewOutput(BaseModel):
    findings: list[Finding]


# -- Rendering --


def _escape_md(text: str) -> str:
    """Escape markdown special characters in text content."""
    for ch in ("`", "*", "<", ">", "[", "]", "|", "_"):
        text = text.replace(ch, f"\\{ch}")
    return text


def _lines_short(lr: tuple[int, int]) -> str:
    """Format line range for table column: '42' or '42-44'."""
    if lr[0] == lr[1]:
        return str(lr[0])
    return f"{lr[0]}-{lr[1]}"


def _lines_label(lr: tuple[int, int]) -> str:
    """Format line range for prose: 'line 42' or 'lines 42-44'."""
    if lr[0] == lr[1]:
        return f"line {lr[0]}"
    return f"lines {lr[0]}-{lr[1]}"


def _render_findings(findings: list[dict], *, omitted: int = 0) -> str:
    """Render findings list to markdown."""
    total = len(findings) + omitted
    label = f"{total} finding{'s' if total != 1 else ''}"
    lines = [f"## Code Review — {label}", ""]

    # Summary table
    lines.append("| # | Severity | Category | File | Lines | Description |")
    lines.append("|---|----------|----------|------|-------|-------------|")
    for i, f in enumerate(findings, 1):
        lines.append(
            f"| {i} | {f['severity']} | {f['category']}"
            f" | {_escape_md(f['file'])} | {_lines_short(f['line_range'])}"
            f" | {_escape_md(f['description'])} |"
        )

    # Detail sections
    for i, f in enumerate(findings, 1):
        lines.extend(["", "---", ""])
        lines.append(f"### {i}. {_escape_md(f['description'])}")
        lines.append(
            f"**File:** {_escape_md(f['file'])} ({_lines_label(f['line_range'])})"
            f" · **{f['category']}**"
            f" · Confidence: {f['confidence']}"
        )
        lines.append(_escape_md(f["reasoning"]))

    if omitted > 0:
        lines.extend(["", "---", ""])
        lines.append(f"*({omitted} more finding{'s' if omitted != 1 else ''} omitted)*")

    lines.append("")
    return "\n".join(lines)


def render(findings: list[dict]) -> str:
    """Render findings to markdown, truncating if >60KB."""
    if not findings:
        return "## Code Review — No issues found\n\nAll changes look good.\n"

    md = _render_findings(findings)
    if len(md.encode()) <= MAX_BYTES:
        return md

    # Binary search for max finding count that fits within limit
    lo, hi = 1, len(findings) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        candidate = _render_findings(findings[:mid], omitted=len(findings) - mid)
        if len(candidate.encode()) <= MAX_BYTES:
            lo = mid
        else:
            hi = mid - 1

    return _render_findings(findings[:lo], omitted=len(findings) - lo)


# -- Main --


def main() -> None:
    if "--test" in sys.argv:
        _run_tests()
        return

    threshold = 75
    if "--threshold" in sys.argv:
        idx = sys.argv.index("--threshold")
        if idx + 1 >= len(sys.argv):
            print("--threshold requires a value", file=sys.stderr)
            sys.exit(1)
        try:
            threshold = int(sys.argv[idx + 1])
        except ValueError:
            print(
                f"--threshold must be an integer, got {sys.argv[idx + 1]!r}",
                file=sys.stderr,
            )
            sys.exit(1)

    text = sys.stdin.read()
    try:
        output = ReviewOutput.model_validate_json(text)
    except ValidationError as e:
        for err in e.errors():
            print(err["msg"], file=sys.stderr)
        sys.exit(1)

    filtered = sorted(
        (f for f in output.findings if f.confidence >= threshold),
        key=lambda f: f.confidence,
        reverse=True,
    )
    print(render([f.model_dump() for f in filtered]), end="")


# -- Tests --


def _run_tests() -> None:
    passed = 0
    failed = 0

    def check_validate(name: str, text: str, *, should_pass: bool, error_substr: str | None = None) -> None:
        nonlocal passed, failed
        try:
            ReviewOutput.model_validate_json(text)
            did_pass = True
            error_str = ""
        except ValidationError as e:
            did_pass = False
            error_str = str(e)

        if did_pass != should_pass:
            failed += 1
            expected = "pass" if should_pass else "fail"
            got = "passed" if did_pass else "failed"
            print(f"FAIL: {name} — expected {expected}, {got}")
            if error_str:
                print(f"  errors: {error_str}")
        elif not should_pass and error_substr and error_substr not in error_str:
            failed += 1
            print(f"FAIL: {name} — error missing substring {error_substr!r}")
            print(f"  errors: {error_str}")
        else:
            passed += 1

    def check_render(
        name: str,
        findings: list[dict],
        must_contain: list[str],
        must_not_contain: list[str] | None = None,
    ) -> None:
        nonlocal passed, failed
        md = render(findings)
        failures: list[str] = []
        for s in must_contain:
            if s not in md:
                failures.append(f"  missing: {s!r}")
        for s in must_not_contain or []:
            if s in md:
                failures.append(f"  unexpected: {s!r}")
        if not failures:
            passed += 1
        else:
            failed += 1
            print(f"FAIL: {name}")
            for line in failures:
                print(line)

    # ── Validation tests ──

    check_validate("empty findings", '{"findings": []}', should_pass=True)

    check_validate(
        "valid single finding",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "security",
                        "confidence": 95,
                        "file": "src/db.py",
                        "line_range": [10, 15],
                        "description": "SQL injection via string concatenation",
                        "reasoning": "User input passed directly to query",
                    }
                ]
            }
        ),
        should_pass=True,
    )

    check_validate(
        "valid two findings",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "correctness",
                        "confidence": 95,
                        "file": "a.py",
                        "line_range": [1, 2],
                        "description": "Bug",
                        "reasoning": "Why",
                    },
                    {
                        "category": "security",
                        "confidence": 80,
                        "file": "b.py",
                        "line_range": [3, 4],
                        "description": "Issue",
                        "reasoning": "Because",
                    },
                ]
            }
        ),
        should_pass=True,
    )

    check_validate("invalid JSON", "not json", should_pass=False)
    check_validate("missing findings key", '{"results": []}', should_pass=False)
    check_validate("findings not array", '{"findings": "none"}', should_pass=False)

    check_validate(
        "missing keys",
        json.dumps({"findings": [{"category": "security"}]}),
        should_pass=False,
    )

    check_validate(
        "invalid category",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "style",
                        "confidence": 95,
                        "file": "a.py",
                        "line_range": [1, 1],
                        "description": "X",
                        "reasoning": "Y",
                    }
                ]
            }
        ),
        should_pass=False,
        error_substr="category",
    )

    check_validate(
        "confidence out of range",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "security",
                        "confidence": 150,
                        "file": "a.py",
                        "line_range": [1, 1],
                        "description": "X",
                        "reasoning": "Y",
                    }
                ]
            }
        ),
        should_pass=False,
        error_substr="confidence",
    )

    check_validate(
        "line_range start > end",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "security",
                        "confidence": 95,
                        "file": "a.py",
                        "line_range": [10, 5],
                        "description": "X",
                        "reasoning": "Y",
                    }
                ]
            }
        ),
        should_pass=False,
        error_substr="line_range",
    )

    check_validate(
        "line_range values must be >= 1",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "security",
                        "confidence": 95,
                        "file": "a.py",
                        "line_range": [0, 5],
                        "description": "X",
                        "reasoning": "Y",
                    }
                ]
            }
        ),
        should_pass=False,
        error_substr="line_range",
    )

    check_validate(
        "empty file string",
        json.dumps(
            {
                "findings": [
                    {
                        "category": "security",
                        "confidence": 95,
                        "file": "",
                        "line_range": [1, 1],
                        "description": "X",
                        "reasoning": "Y",
                    }
                ]
            }
        ),
        should_pass=False,
        error_substr="file",
    )

    # ── Rendering tests ──

    check_render(
        "clean output",
        [],
        ["## Code Review — No issues found", "All changes look good."],
    )

    check_render(
        "single finding",
        [
            {
                "category": "security",
                "severity": "critical",
                "confidence": 95,
                "file": "src/db.py",
                "line_range": [42, 44],
                "description": "SQL injection via string concat",
                "reasoning": "User input interpolated directly into query",
            }
        ],
        [
            "## Code Review — 1 finding",
            "| 1 | critical | security",
            "42-44",
            "### 1. SQL injection via string concat",
            "**File:** src/db.py (lines 42-44)",
            "**security**",
            "Confidence: 95",
            "User input interpolated directly into query",
        ],
    )

    check_render(
        "two findings header",
        [
            {
                "category": "security",
                "severity": "critical",
                "confidence": 95,
                "file": "a.py",
                "line_range": [1, 2],
                "description": "First",
                "reasoning": "R1",
            },
            {
                "category": "correctness",
                "severity": "high",
                "confidence": 80,
                "file": "b.py",
                "line_range": [3, 4],
                "description": "Second",
                "reasoning": "R2",
            },
        ],
        [
            "## Code Review — 2 findings",
            "### 1. First",
            "### 2. Second",
        ],
    )

    check_render(
        "single line range",
        [
            {
                "category": "correctness",
                "severity": "critical",
                "confidence": 92,
                "file": "x.py",
                "line_range": [5, 5],
                "description": "Bug",
                "reasoning": "Why",
            }
        ],
        ["(line 5)", "| 5 |"],
        ["5-5"],
    )

    check_render(
        "markdown escaping",
        [
            {
                "category": "security",
                "severity": "critical",
                "confidence": 95,
                "file": "a.py",
                "line_range": [1, 1],
                "description": "Uses `eval` on *user* input",
                "reasoning": "Attacker can inject <script> via [payload]",
            }
        ],
        [
            "\\`eval\\`",
            "\\*user\\*",
            "\\<script\\>",
            "\\[payload\\]",
        ],
    )

    check_render(
        "underscore escaping",
        [
            {
                "category": "correctness",
                "severity": "critical",
                "confidence": 95,
                "file": "pkg/__init__.py",
                "line_range": [1, 1],
                "description": "Bug in __init__",
                "reasoning": "The __init__ module is broken",
            }
        ],
        ["\\_\\_init\\_\\_"],
        ["__init__"],
    )

    # Severity computed correctly through Pydantic model
    severity_input = json.dumps(
        {
            "findings": [
                {
                    "category": "security",
                    "confidence": 95,
                    "file": "a.py",
                    "line_range": [1, 1],
                    "description": "Crit",
                    "reasoning": "R",
                },
                {
                    "category": "security",
                    "confidence": 80,
                    "file": "b.py",
                    "line_range": [2, 2],
                    "description": "High",
                    "reasoning": "R",
                },
                {
                    "category": "security",
                    "confidence": 60,
                    "file": "c.py",
                    "line_range": [3, 3],
                    "description": "Med",
                    "reasoning": "R",
                },
                {
                    "category": "security",
                    "confidence": 30,
                    "file": "d.py",
                    "line_range": [4, 4],
                    "description": "Low",
                    "reasoning": "R",
                },
            ]
        }
    )
    severity_output = ReviewOutput.model_validate_json(severity_input)
    check_render(
        "severity computed correctly",
        [f.model_dump() for f in severity_output.findings],
        ["| 1 | critical", "| 2 | high", "| 3 | medium", "| 4 | low"],
    )

    # Threshold filtering
    threshold_input = json.dumps(
        {
            "findings": [
                {
                    "category": "security",
                    "confidence": 95,
                    "file": "a.py",
                    "line_range": [1, 1],
                    "description": "Above",
                    "reasoning": "R",
                },
                {
                    "category": "security",
                    "confidence": 75,
                    "file": "b.py",
                    "line_range": [2, 2],
                    "description": "Below",
                    "reasoning": "R",
                },
            ]
        }
    )
    threshold_output = ReviewOutput.model_validate_json(threshold_input)
    threshold_filtered = sorted(
        (f for f in threshold_output.findings if f.confidence >= 80),
        key=lambda f: f.confidence,
        reverse=True,
    )
    threshold_md = render([f.model_dump() for f in threshold_filtered])
    if "Above" in threshold_md and "Below" not in threshold_md:
        passed += 1
    else:
        failed += 1
        print("FAIL: threshold filtering")

    # Truncation: generate findings large enough to exceed 60KB
    big_findings = [
        {
            "category": "security",
            "severity": "critical",
            "confidence": 95,
            "file": f"file{i}.py",
            "line_range": [i, i],
            "description": f"Finding {i}",
            "reasoning": "X" * 1000,
        }
        for i in range(1, 201)
    ]
    big_md = render(big_findings)
    big_ok = len(big_md.encode()) <= MAX_BYTES and "omitted" in big_md
    if big_ok:
        passed += 1
    else:
        failed += 1
        size = len(big_md.encode())
        has_omit = "omitted" in big_md
        print(f"FAIL: truncation (size={size}, has_omitted={has_omit})")

    print(f"\n{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
