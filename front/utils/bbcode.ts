/**
 * Simple BBCode to HTML parser
 */
export const bbcodeToHtml = (bbcode: string) => {
    if (!bbcode) return '';

    let html = bbcode;

    // Handle escaped bracket forms coming from JSON/editor like \[/B] or \\[/B]
    html = html.replace(/\\+\[/g, '[').replace(/\\+\]/g, ']');

    // Normalize common wrong tag variants (Turkish dotted I, etc.)
    html = html
        .replace(/\[\/?S[İIıi]ZE/gu, (m) => m.replace(/[İIıi]/gu, 'I'))
        .replace(/\[\/?C[ƏE]NTER/gu, (m) => m.replace('Ə', 'E'));

    // Container tags
    html = html.replace(/\[CENTER\]([\s\S]*?)\[\/CENTER\]/gi, '<div style="text-align: center;">$1</div>');
    html = html.replace(/\[FONT=([^\]]+)\]([\s\S]*?)\[\/FONT\]/gi, '<span style="font-family: $1;">$2</span>');

    // Standard tags
    html = html.replace(/\[B\]([\s\S]*?)\[\/B\]/gi, '<strong>$1</strong>');
    html = html.replace(/\[I\]([\s\S]*?)\[\/I\]/gi, '<em>$1</em>');
    html = html.replace(/\[U\]([\s\S]*?)\[\/U\]/gi, '<span style="text-decoration: underline;">$1</span>');
    html = html.replace(/\[S\]([\s\S]*?)\[\/S\]/gi, '<strike>$1</strike>');

    // URL and Images
    html = html.replace(/\[URL=([^\]]+)\]([\s\S]*?)\[\/URL\]/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #FF4D00;">$2</a>');
    html = html.replace(/\[IMG\]([\s\S]*?)\[\/IMG\]/gi, '<img src="$1" style="max-width: 100%;" />');

    // Style tags
    html = html.replace(/\[COLOR=([^\]]+)\]([\s\S]*?)\[\/COLOR\]/gi, '<span style="color: $1;">$2</span>');
    html = html.replace(/\[SIZE=([^\]]+)\]([\s\S]*?)\[\/SIZE\]/gi, '<span style="font-size: $1px;">$2</span>');

    // Quote and Code
    html = html.replace(/\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi, '<blockquote style="border-left: 2px solid #FF4D00; padding-left: 10px; margin-left: 0;">$1</blockquote>');
    html = html.replace(/\[CODE\]([\s\S]*?)\[\/CODE\]/gi, '<pre style="background: #222; padding: 10px; border-radius: 4px;"><code>$1</code></pre>');

    // Newlines
    html = html.replace(/\r?\n/g, '<br />');

    return html;
};
