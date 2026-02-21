# Skills Library

Open-source templates for common development tasks.

## Available Skills

### SEO & Content
- **seo-meta-tags** - Add SEO meta tags to pages
- **generate-sitemap** - Create sitemap.xml
- **add-structured-data** - Add Schema.org markup

### Code Quality
- **typescript-convert** - Convert JS to TypeScript
- **add-jsdoc** - Generate JSDoc comments
- **fix-eslint** - Auto-fix ESLint errors

### UI/UX
- **add-loading-states** - Add loading spinners
- **responsive-fix** - Fix mobile responsiveness
- **dark-mode-toggle** - Add dark mode support

### Performance
- **optimize-images** - Compress and convert images
- **lazy-loading** - Add lazy loading to images
- **bundle-analyze** - Analyze bundle size

## Skill Format

Skills are defined in YAML with this structure:

```yaml
skill:
  id: skill-name
  name: Human-Readable Name
  description: What this skill does
  category: seo | code-quality | ui-ux | performance
  pricing: free | 1-5 (USD)

  inputs:
    param_name:
      type: string | number | boolean | select | multiselect
      required: true | false
      default: value
      description: What this parameter does

  context_needed:
    - description: What files are needed
      pattern: Glob pattern
      max_files: Number of files

  execution:
    - step: action_name
      params: values
      save_as: variable_name

  validation:
    - check: condition
      error: Error message

  success_message: What to show on success
  estimated_time: Seconds to complete
```

## Creating a Skill

1. Copy an existing skill as template
2. Update metadata (id, name, description)
3. Define inputs needed from user
4. Specify context files required
5. Write execution steps
6. Add validation checks
7. Test locally
8. Submit PR to marketplace

## Execution Steps

Common step types:

- `read_file` - Read file contents
- `write_file` - Write to file
- `update_file` - Modify existing file
- `analyze` - Extract information from content
- `generate` - Create content from template
- `transform` - Convert content
- `for_each` - Loop over items

See ARCHITECTURE.md for full execution engine details.
