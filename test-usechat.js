const messages = [{ role: 'user', content: 'Helli' }];
const last = messages[messages.length - 1];
const text = last?.parts?.filter(p => p.type === 'text').map(p => p.text).join('') ?? '';
console.log("Extracted text:", text);
