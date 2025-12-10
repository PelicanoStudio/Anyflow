---
description: Convert human-readable .md files to token-optimized AI agent format
---

# Skill: Markdown to Agent-Optimized Format

## Purpose

Transform verbose markdown documentation into ultra-compact, parseable format optimized for LLM context windows while preserving 100% semantic resolution.

## When to Use

- Converting README.md to agent-consumable context
- Creating routing/architecture docs for agent consumption
- Reducing token cost of context injection
- Preparing docs for multi-agent handoff

## Conversion Rules

### 1. Remove Visual Decoration

```
REMOVE:
- ASCII art boxes (┌─┐, ║, etc.)
- Horizontal rules (---, ===)
- Excessive whitespace
- Emoji decorations
- "Note:", "Important:" prefixes
```

### 2. Compress Tables to YAML-like Structure

```
BEFORE (markdown table):
| File | Purpose | Exports |
|------|---------|---------|
| colors.ts | Theme colors | signalActive, getColor |

AFTER (compact):
colors.ts: {purpose:"theme_colors", exports:[signalActive,getColor]}
```

### 3. Flatten Hierarchies

```
BEFORE:
### Section
#### Subsection
##### Point
- Detail

AFTER:
## SECTION
subsection.point: detail
```

### 4. Use Symbolic References

```
BEFORE: "imports from the tokens directory"
AFTER: imports:[tokens/*]

BEFORE: "returns a string representing the color"
AFTER: →string
```

### 5. Compress Code Patterns

```
BEFORE:
export function getColor(name: string, isDarkMode: boolean): string {
  return isDarkMode ? colors[name].dark : colors[name].light;
}

AFTER:
getColor(name,isDarkMode)→string: isDarkMode?dark:light
```

### 6. Structure for Direct Parsing

```yaml
## SECTION_NAME
key: value
nested:
  subkey: subvalue
list: [item1, item2, item3]
pattern: input→output
conditional: condition?then:else
```

## Output Template

```markdown
# DOCUMENT_TITLE

# Purpose statement | version

# Token reduction metric

## META

project: name
type: doc_type
scope: [areas]

## SECTION_1

key: value
nested.key: value

## SECTION_2

pattern: definition
usage: example

## ROUTING_RULES

condition: action→target
```

## Quality Checklist

- [ ] No ASCII decorations
- [ ] No markdown tables (use YAML-like)
- [ ] No prose paragraphs (use key:value)
- [ ] All paths absolute or from project root
- [ ] Enums as [ITEM1,ITEM2] not bulleted lists
- [ ] Functions as name(params)→return
- [ ] Conditionals as cond?then:else
- [ ] Preserve all semantic information
- [ ] File named \*.agent.md

## Token Comparison

Aim for 70-90% reduction:

- Original: ~2000 tokens
- Optimized: ~300-600 tokens
- Semantic loss: 0%
