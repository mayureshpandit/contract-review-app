# Contract Review

A simple web app for asking questions about a contract. Upload a PDF, read it on the left, and chat about it on the right.

Built with plain HTML, CSS and JavaScript: no frameworks, no npm, no build step.

## Key features

- **Two-column layout:** the contract on the left and the chat on the right. Both stay visible and scroll independently.
- **PDF upload and preview:** drag and drop a PDF, or browse for one. It displays in the left panel using your browser's built-in PDF viewer.
- **Chat with the contract:** your question and the PDF are sent to an n8n webhook, which returns:
  - an **answer** based only on the contract,
  - the **citations** (exact clauses or pages) that support it,
  - short **reasoning** explaining how the citations support the answer.
- **Clear "not found" answers:** if the contract doesn't contain the answer, the app says so.
- **Suggested questions:** one-click prompts such as "Summarize key terms".

## Run it locally

1. Download or clone this repository.
2. Open `index.html` in a web browser (double-click it).
3. Upload a PDF contract, type a question, and press **Send**.

That's all, nothing to install.

## Connecting to your webhook

The app sends a `multipart/form-data` POST request with two fields:

| Field | Content |
|-------|---------|
| `file` | the uploaded PDF |
| `message` | the user's question |

The webhook must reply with JSON in this shape:

```json
{
  "response": "string",
  "citation": ["string"],
  "reasoning": "string"
}
```

The webhook URL is the `WEBHOOK_URL` constant at the top of `app.js`.

Notes:
- n8n's `/webhook-test/` URL only works while the workflow is listening for a test run. Use the `/webhook/` production URL once the workflow is active.
- If the browser blocks the request when opening `index.html` from disk, allow the origin in your n8n webhook's CORS settings, or serve the folder with a local web server.

## Files

| File | Purpose |
|------|---------|
| `index.html` | page structure |
| `styles.css` | navy and orange visual design |
| `app.js` | PDF upload, preview and webhook chat |
