import fs from 'fs';
import path from 'path';

const content = fs.readFileSync('.env', 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.startsWith('RESEND_FROM=')) {
    const value = line.replace('RESEND_FROM=', '').trim();
    console.log('Value:', JSON.stringify(value));
    console.log('Char codes:', Array.from(value).map(c => `${c}:${c.charCodeAt(0)}`));
    
    // Check for non-ASCII
    const nonAscii = Array.from(value).filter(c => c.charCodeAt(0) > 127);
    console.log('Non-ASCII chars found:', nonAscii);
  }
}
