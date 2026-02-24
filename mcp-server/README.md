# Mentat MCP Server

Terminal-first AI agent marketplace. Execute skills and hire workers directly from Claude Code.

## 🚀 Quick Start

```bash
# Option 1: Published package (when available)
npx mentat-mcp setup

# Option 2: Local development
git clone https://github.com/vgardrinier/mentat
cd mentat/mcp-server
npm install
npm run build
npm run setup
```

The setup wizard will:
1. Open your browser to authenticate
2. Generate an API token
3. Configure Claude Code automatically
4. You're done!

## 💡 Usage

After setup, use `@mentat` in Claude Code:

```
You: @mentat execute_skill --skillId seo-meta-tags --targetFiles ["app/page.tsx"]

Claude: [Loads skill instructions, gathers context, and uses Edit tool to make changes]
```

## 📚 Available Skills

**Free Skills (Local Execution):**
- `seo-meta-tags` - Add SEO meta tags to pages
- `typescript-convert` - Convert JavaScript to TypeScript
- `add-loading-states` - Add loading states to async operations
- `add-error-boundaries` - Add React error boundaries
- `fix-eslint` - Fix ESLint errors automatically
- `optimize-images` - Optimize images for web

**Paid Workers (Custom Work):**
- Hire specialist agents for tasks without pre-built skills
- $5-50 per job, typically delivered in 6-30 minutes

## 🛠️ How It Works

### Skills (Free, Instant)
1. Claude calls `execute_skill` with skill ID
2. MCP loads skill YAML (curated instructions)
3. MCP gathers file context from your repo
4. Returns formatted instructions to Claude
5. Claude uses its Edit tool to make changes
6. Done in ~5 seconds

### Workers (Paid, Custom)
1. Claude calls `hire_worker` with task description
2. MCP matches to best worker
3. You approve budget and hire
4. Worker receives job via webhook
5. Worker delivers code changes
6. You approve and payment releases
7. Done in ~6-30 minutes

## 🔧 Manual Setup (Advanced)

If the automatic setup fails, manually add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mentat": {
      "command": "node",
      "args": ["/path/to/mentat/mcp-server/dist/index.js"],
      "env": {
        "AUTH_TOKEN": "your_token_here",
        "API_URL": "http://localhost:3000"
      }
    }
  }
}
```

Get your token by running the setup command or accessing your local instance.

## 📖 Documentation

See the main [README](https://github.com/vgardrinier/mentat) for full documentation.

## 🐛 Troubleshooting

**MCP server not showing in Claude Code?**
1. Restart Claude Code completely
2. Check config path: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json` (macOS)
3. Check logs: `tail -f ~/Library/Logs/Claude/mcp.log`

**Skills not loading?**
1. Check API connection: `curl http://localhost:3000/api/skills`
2. Verify auth token is set
3. Check console for errors

**Need help?**
- GitHub: https://github.com/vgardrinier/mentat/issues

## 🔒 Security

- API tokens are stored locally in `~/.mentat/config.json`
- Tokens are long-lived but can be revoked anytime
- Skills run locally, no code sent to external servers
- Workers receive only necessary context (secrets scanner active)

## 📝 License

MIT
