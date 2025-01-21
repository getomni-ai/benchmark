import TurndownService from 'turndown';

export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({});

  turndownService.addRule('strong', {
    filter: ['strong', 'b'],
    replacement: (content) => `**${content}**`,
  });

  // Convert HTML to Markdown
  return turndownService.turndown(html);
}
