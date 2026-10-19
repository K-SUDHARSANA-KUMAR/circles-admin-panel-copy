/**
 * Every inbound email is untrusted. Before anything (rules or AI) looks at it:
 *
 *   - Hidden text is removed: white or tiny text, display:none, HTML comments, zero-width
 *     characters. The AI only sees what a person reading the email would see. Hidden text is a
 *     classic way to smuggle instructions to an AI, so finding any is itself a warning sign.
 *   - Instruction-like text aimed at an AI or an assistant is detected and flagged. A flagged email
 *     never gets an automatic reply, whatever the AI says.
 *
 * Detection is deliberately broad: a false alarm only means Gus gets a draft instead of an auto-
 * reply. It's one layer of several: the real protection is that the code, not the AI, decides
 * what can happen (policy.ts).
 */

export interface PreparedEmail {
  /** What a person would see, normalised and truncated for the AI. */
  visible: string;
  /** Text that was hidden from a human reader. Never shown to the AI. */
  hidden: string;
  suspicious: boolean;
  signals: string[];
}

const MAX_CHARS = 6000;

const HIDDEN_STYLE = /<([a-z0-9]+)\b[^>]*style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px|pt|em|%)?\b|color\s*:\s*(?:#fff(?:fff)?|white|rgba?\([^)]*,\s*0\))|opacity\s*:\s*0(?:\.0+)?\b)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
/** Invisible characters, except the joiner emoji use (U+200D), which is removed quietly. */
const INVISIBLE = /[\u200B\u200C\u200E\u200F\u2060-\u2064\uFEFF]/g;
const JOINER = /\u200D/g;

/** Instruction-like patterns aimed at an AI or an assistant, with a plain label for Gus. */
const INJECTION_PATTERNS: [RegExp, string][] = [
  [/\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your|any|the)\b[^.\n]{0,20}\b(instructions?|rules?|prompts?|guidelines?|directions?)/i, 'Tells the AI to ignore its instructions'],
  [/\b(you are now|act as|pretend (to be|you are)|from now on you|new instructions|system prompt|developer mode|jailbreak)\b/i, 'Tries to change how the AI behaves'],
  [/\b(ai|a\.i\.|ai assistant|language model|llm|claude|chatgpt|gpt|chatbot|copilot|inbox agent|email agent|automated (assistant|agent|system))\b[^.\n]{0,40}\b(must|should|need to|has to|please|will|is (instructed|required))\b/i, 'Gives orders to an AI'],
  [/^\s*(system|assistant|instruction|admin)\s*[:>]/im, 'Pretends to be a system message'],
  [/\b(forward|send|export|share|attach|leak|dump)\b[^.\n]{0,40}\b(all|every|whole|entire|full)\b[^.\n]{0,30}\b(member|contact|user|customer|subscriber)s?'?\b[^.\n]{0,20}\b(list|data|database|emails?|email addresses|numbers|phone numbers|details|records|info(rmation)?)\b/i, 'Asks for data about other people'],
  [/\b(forward|copy|send)\b[^.\n]{0,25}\b(all|every|any)\b[^.\n]{0,15}\b(emails|messages|mail|inbox)\b[^.\n]{0,25}\bto\b/i, 'Asks to forward email'],
  [/\b(export|download|send me)\b[^.\n]{0,30}\b(member|contact|user|customer|subscriber)s?\b[^.\n]{0,15}\b(list|data|details|emails?|numbers?|file|csv|spreadsheet)\b/i, 'Asks for an export'],
  [/\b(phone number|mobile|email address|address|details)\b[^.\n]{0,25}\b(of|for)\b\s+(another|other|a different|someone else|[A-Z][a-z]+ [A-Z][a-z]+)/, 'Asks for someone else’s contact details'],
  [/\b[A-Z][a-z]+ [A-Z][a-z]+[’']s\s+(phone|mobile|number|email|address|contact details|details)\b/, 'Asks for someone else’s contact details'],
  [/\b(as|you are) (the|an|my|your) (assistant|ai|agent|bot)\b|\byour (assistant|ai|agent|bot|system)\b[^.\n]{0,20}\b(should|must|needs? to|will|has to)\b/i, 'Gives orders to an assistant'],
  [/\b(reply|respond|send|email|message)\b[^.\n]{0,20}\b(to )?(everyone|every (member|contact|user|customer|subscriber|one)|all (the |your )?(members|contacts|recipients|users|customers|subscribers))\b/i, 'Asks to email everyone'],
  [/\b(this is|it'?s|i am|i'm)\s+(gus|the founder|the owner|your (boss|admin|owner|developer))\b/i, 'Claims to be Gus or an admin'],
  [/\b(change|update|switch|new)\b[^.\n]{0,25}\b(bank|account|payment|sort code|iban)\b[^.\n]{0,15}\b(details|number|information)\b|\b(bank|payment|account) details\b[^.\n]{0,25}\b(have |has )?(changed|been updated|updated)\b/i, 'Asks to change bank or payment details'],
  [/\b(turn off|disable|switch off|pause)\b[^.\n]{0,30}\b(agent|filter|rules?|security|safety|checks?|logging)\b/i, 'Asks to switch off safeguards'],
  [/\b(delete|remove|cancel|close|deactivate|upgrade|downgrade|refund)\b[^.\n]{0,30}\b(their|his|her|another|other|this user'?s|the member'?s)\b[^.\n]{0,20}\b(account|membership|subscription|profile)\b/i, 'Asks to change someone else’s account'],
  [/\b(mark|set|change|update|upgrade|make)\b[^.\n]{0,25}\b(status|membership|subscription|account|tier|application|profile)\b[^.\n]{0,25}\b(to|as)\b[^.\n]{0,20}\b(member|paid|premium|founding|active|approved|verified)\b/i, 'Asks to change a status or subscription'],
  [/\b(do (this|it|that)|process (this|it)|action (this|it))\s+(automatically|without (checking|asking|review))\b|\byou have my (permission|authori[sz]ation)\b/i, 'Asks for something to be done automatically'],
  [/\b(system|admin|security)\s+override\b|\b(auto_?send|threshold|confidence|approved)\s*[=:]\s*\S/i, 'Contains settings-like commands'],
  [/(?:[A-Za-z0-9+/]{4}){20,}={0,2}/, 'Contains a long encoded block'],
  [/<\|?(im_start|im_end|system|endoftext)\|?>|\[\/?INST\]|###\s*(instruction|system)/i, 'Contains AI control markers'],
];

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

const tidy = (s: string) =>
  s
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function prepareEmail(input: { subject: string; text: string; html?: string }): PreparedEmail {
  const signals = new Set<string>();
  let source = input.html ?? input.text;
  const hiddenParts: string[] = [];

  // HTML comments and hidden elements.
  source = source.replace(/<!--([\s\S]*?)-->/g, (_m, c: string) => {
    if (c.trim()) hiddenParts.push(c);
    return ' ';
  });
  let previous: string;
  do {
    previous = source;
    source = source.replace(HIDDEN_STYLE, (_m, _tag, _style, inner: string) => {
      hiddenParts.push(stripHtml(inner));
      return ' ';
    });
  } while (source !== previous);

  // A stray byte-order mark or one invisible character is common; several is a way to hide words.
  if ((source.match(INVISIBLE) ?? []).length >= 3) signals.add('Contains invisible characters');
  // Shown to the AI as spaces, so hidden words are readable (and caught below) rather than run together.
  const visible = tidy(stripHtml(source).replace(INVISIBLE, ' ').replace(JOINER, ''));
  const hidden = tidy(hiddenParts.join('\n').replace(INVISIBLE, ' ').replace(JOINER, ''));
  if (hidden.length > 0) signals.add('Contains text hidden from a human reader');

  for (const text of [input.subject, visible, hidden]) {
    for (const [pattern, label] of INJECTION_PATTERNS) if (pattern.test(text)) signals.add(label);
  }
  return { visible: visible.slice(0, MAX_CHARS), hidden, suspicious: signals.size > 0, signals: [...signals] };
}
