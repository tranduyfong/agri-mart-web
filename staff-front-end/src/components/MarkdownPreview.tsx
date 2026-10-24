import MarkdownIt from 'markdown-it';
const markdown = new MarkdownIt({ html: false, breaks: true });
const MarkdownPreview = ({ content }: { content: string }) => (
  <div className="markdown-content break-words" dangerouslySetInnerHTML={{ __html: markdown.render(content) }} />
);
export default MarkdownPreview;
