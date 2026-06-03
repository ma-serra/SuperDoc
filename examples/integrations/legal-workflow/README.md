# Legal Workflow Integration (React)

This example implements an end-to-end legal workflow using the SuperDoc ecosystem:

1. **Document editing & viewing** with `superdoc` (DOCX import/export, tracked changes, comments, paginated editing).
2. **Contract templates** with `@superdoc-dev/template-builder` (`{{` trigger, named contract fields, DOCX export).
3. **E-sign + compliance** with `@superdoc-dev/esign` (scroll validation, required signature/checkbox, audit trail payload).
4. **AI legal review** with `@superdoc-dev/ai` and a legal `systemPrompt` (tracked changes, comments, highlighting, summary).
5. **Multi-party review** by enabling a `packages/collaboration-yjs` compatible websocket endpoint.
6. **Developer tooling** references:
   - Word add-in plugin sample: `/tmp/workspace/ma-serra/SuperDoc/examples/integrations/word-addin`
   - VS Code extension: `/tmp/workspace/ma-serra/SuperDoc/apps/vscode-ext`

## Run

```bash
cd /tmp/workspace/ma-serra/SuperDoc/examples/integrations/legal-workflow
npm install --legacy-peer-deps
npm run dev
```

## Notes

- The AI tab is a browser demo; use a backend proxy in production.
- Collaboration requires a running websocket server (see `packages/collaboration-yjs` and `examples/collaboration/*`).
- E-sign `onSubmit` logs and summarizes audit trail payload locally; connect your backend to finalize signed PDF generation.
